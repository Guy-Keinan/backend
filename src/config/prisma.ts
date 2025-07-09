import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client - ממשק לבסיס הנתונים
 * 
 * Prisma מספק:
 * - Type safety מלא
 * - Auto-completion
 * - Connection pooling אוטומטי
 * - Middleware support
 */

// יצירת instance של PrismaClient
export const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    errorFormat: 'pretty',
});

/**
 * פונקציה לחיבור ובדיקת תקינות
 */
export const connectDatabase = async (): Promise<void> => {
    try {
        await prisma.$connect();
        console.log('🔗 Database connected successfully with Prisma');

        // בדיקת גרסת בסיס הנתונים
        const result = await prisma.$queryRaw`SELECT version()` as any[];
        const version = result[0]?.version?.split(' ')[1] || 'Unknown';
        console.log('📊 PostgreSQL version:', version);

    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};

/**
 * פונקציה לניתוק מבסיס הנתונים
 */
export const disconnectDatabase = async (): Promise<void> => {
    try {
        await prisma.$disconnect();
        console.log('🔒 Database disconnected');
    } catch (error) {
        console.error('❌ Error disconnecting from database:', error);
    }
};

// טיפול בסגירת התהליך
process.on('SIGINT', async () => {
    await disconnectDatabase();
});

process.on('SIGTERM', async () => {
    await disconnectDatabase();
});