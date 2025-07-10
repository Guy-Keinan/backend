import 'dotenv/config';
import { prisma } from '../config/prisma';
import { connectDatabase, disconnectDatabase } from '../config/prisma';

/**
 * Database Health Check Script
 * 
 * בודק:
 * 1. חיבורים פעילים
 * 2. גודל הטבלאות
 * 3. אינדקסים קיימים
 * 4. ביצועי שאילתות
 */

const checkDatabaseHealth = async () => {
    try {
        console.log('🏥 Database Health Check\n');

        await connectDatabase();

        // 1. בדיקת חיבורים
        console.log('1️⃣ Connection Pool Status:');
        const poolStatus = await prisma.$queryRaw`
            SELECT 
                count(*) as total_connections,
                count(*) filter (where state = 'active') as active_connections,
                count(*) filter (where state = 'idle') as idle_connections
            FROM pg_stat_activity
            WHERE datname = current_database()
        ` as any[];

        console.log('📊 Connections:', poolStatus[0]);

        // 2. גודל הטבלאות
        console.log('\n2️⃣ Table Sizes:');
        const tableSizes = await prisma.$queryRaw`
            SELECT 
                relname as table_name,
                pg_size_pretty(pg_total_relation_size(relid)) AS size,
                pg_total_relation_size(relid) as size_bytes,
                n_live_tup as row_count
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(relid) DESC
        ` as any[];

        console.log('📊 Tables:');
        tableSizes.forEach((table: any) => {
            console.log(`   - ${table.table_name}: ${table.size} (${table.row_count || 0} rows)`);
        });

        // 3. אינדקסים
        console.log('\n3️⃣ Indexes:');
        const indexes = await prisma.$queryRaw`
            SELECT 
                t.relname as table_name,
                i.relname as index_name,
                pg_get_indexdef(i.oid) as index_def
            FROM pg_index x
            JOIN pg_class t ON t.oid = x.indrelid
            JOIN pg_class i ON i.oid = x.indexrelid
            WHERE t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            AND t.relkind = 'r'
            ORDER BY t.relname, i.relname
        ` as any[];

        const indexByTable: Record<string, string[]> = {};
        indexes.forEach((idx: any) => {
            if (!indexByTable[idx.table_name]) {
                indexByTable[idx.table_name] = [];
            }
            indexByTable[idx.table_name]?.push(idx.index_name);
        });

        Object.entries(indexByTable).forEach(([table, indexes]) => {
            console.log(`   ${table}:`);
            indexes.forEach(idx => console.log(`     - ${idx}`));
        });

        // 4. שאילתות איטיות (אם יש)
        console.log('\n4️⃣ Slow Queries Check:');
        try {
            const slowQueries = await prisma.$queryRaw`
                SELECT 
                    query,
                    calls,
                    total_exec_time,
                    mean_exec_time,
                    max_exec_time
                FROM pg_stat_statements
                WHERE query NOT LIKE '%pg_stat_statements%'
                ORDER BY mean_exec_time DESC
                LIMIT 5
            ` as any[];

            if (slowQueries.length > 0) {
                console.log('⚠️ Top 5 slowest queries:');
                slowQueries.forEach((q: any, i: number) => {
                    console.log(`   ${i + 1}. Mean time: ${q.mean_exec_time.toFixed(2)}ms`);
                    console.log(`      Query: ${q.query.substring(0, 100)}...`);
                });
            } else {
                console.log('✅ No slow queries found');
            }
        } catch (error) {
            console.log('ℹ️ pg_stat_statements extension not enabled (optional for development)');
        }

        // 5. חיפוש אינדקסים חסרים
        console.log('\n5️⃣ Missing Indexes Analysis:');

        try {
            // בדיקת foreign keys ללא אינדקס
            const missingFKIndexes = await prisma.$queryRaw`
                SELECT 
                    conrelid::regclass::text AS table_name,
                    a.attname AS column_name,
                    confrelid::regclass::text AS referenced_table
                FROM pg_constraint c
                JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
                WHERE c.contype = 'f'
                AND NOT EXISTS (
                    SELECT 1 
                    FROM pg_index i 
                    WHERE i.indrelid = c.conrelid 
                    AND a.attnum = ANY(i.indkey)
                )
            ` as any[];

            if (missingFKIndexes.length > 0) {
                console.log('⚠️ Foreign keys without indexes:');
                missingFKIndexes.forEach((fk: any) => {
                    console.log(`   - ${fk.table_name}.${fk.column_name} -> ${fk.referenced_table}`);
                });
            } else {
                console.log('✅ All foreign keys have indexes');
            }
        } catch (error) {
            console.log('ℹ️ Could not check for missing indexes');
        }

        // 6. סטטיסטיקות כלליות
        console.log('\n6️⃣ Database Statistics:');
        const dbStats = await prisma.$queryRaw`
            SELECT 
                pg_database_size(current_database()) as db_size,
                pg_size_pretty(pg_database_size(current_database())) as db_size_pretty
        ` as any[];

        console.log('📊 Database size:', dbStats[0].db_size_pretty);

        // ספירת רשומות
        const [users, children, stories, templates] = await Promise.all([
            prisma.user.count(),
            prisma.child.count(),
            prisma.story.count(),
            prisma.storyTemplate.count()
        ]);

        console.log('📊 Record counts:');
        console.log(`   - Users: ${users}`);
        console.log(`   - Children: ${children}`);
        console.log(`   - Stories: ${stories}`);
        console.log(`   - Templates: ${templates}`);

        console.log('\n✅ Health check completed!');

    } catch (error) {
        console.error('❌ Health check failed:', error);
    } finally {
        await disconnectDatabase();
    }
};

// הפעלת הבדיקה
checkDatabaseHealth();