import { Pool, PoolConfig } from 'pg';

/**
 * הגדרת Connection Pool לבסיס הנתונים
 * 
 * Connection Pool הוא מנגנון שמנהל חיבורים לבסיס הנתונים:
 * - במקום לפתוח חיבור חדש בכל בקשה, אנחנו מחזיקים בריכה של חיבורים פעילים
 * - זה מפחית overhead ומשפר ביצועים משמעותית
 * - הגדרנו מספר מקסימלי של חיבורים למניעת עומס יתר על הDB
 */

const poolConfig: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'kids_story_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',

    // הגדרות Connection Pool
    max: 20, // מספר מקסימלי של חיבורים בבריכה
    min: 2,  // מספר מינימלי של חיבורים שיישארו פעילים
    idleTimeoutMillis: 30000, // זמן המתנה לפני סגירת חיבור לא פעיל
    connectionTimeoutMillis: 10000, // זמן המתנה מקסימלי לחיבור חדש

    // הגדרות SSL לפרודקשן
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// יצירת instance של Pool
export const pool = new Pool(poolConfig);

/**
 * פונקציה לבדיקת חיבור לבסיס הנתונים
 * זה חשוב לבדוק שהחיבור עובד בעת הפעלת הסרבר
 */
export const testConnection = async (): Promise<void> => {
    try {
        const client = await pool.connect();
        console.log('🔗 Database connected successfully');

        // בדיקת גרסת PostgreSQL
        const result = await client.query('SELECT version()');
        console.log('📊 PostgreSQL version:', result.rows[0].version.split(' ')[1]);

        client.release(); // חובה לשחרר את החיבור בחזרה לPool
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};

/**
 * פונקציה לסגירת כל החיבורים בעת כיבוי הסרבר
 * זה חשוב לניקוי משאבים (cleanup)
 */
export const closePool = async (): Promise<void> => {
    try {
        await pool.end();
        console.log('🔒 Database pool closed');
    } catch (error) {
        console.error('❌ Error closing database pool:', error);
    }
};