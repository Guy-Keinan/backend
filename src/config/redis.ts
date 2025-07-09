import { createClient } from 'redis';

/**
 * Redis Configuration and Connection
 * 
 * Redis יספק לנו:
 * - Caching של API responses
 * - Session management
 * - Rate limiting
 * - Queue management (בעתיד)
 */

// יצירת Redis client
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    // הגדרות חיבור
    socket: {
        connectTimeout: 5000,
    },
    // הגדרות retry
    // retry: {
    //   retries: 3,
    //   delay: 1000,
    // }
});

/**
 * חיבור לRedis עם error handling
 */
export const connectRedis = async (): Promise<void> => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log('🔴 Redis connected successfully');
        }
    } catch (error) {
        console.error('❌ Redis connection failed:', error);
        throw error;
    }
};

/**
 * ניתוק מRedis
 */
export const disconnectRedis = async (): Promise<void> => {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log('🔴 Redis disconnected');
        }
    } catch (error) {
        console.error('❌ Redis disconnect error:', error);
    }
};

/**
 * בדיקת תקינות Redis
 */
export const testRedis = async (): Promise<boolean> => {
    try {
        await redisClient.ping();
        console.log('🔴 Redis ping successful');
        return true;
    } catch (error) {
        console.error('❌ Redis ping failed:', error);
        return false;
    }
};

/**
 * פונקציות Cache בסיסיות
 */
export const redisCache = {
    /**
     * שמירת ערך בcache
     */
    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        try {
            const serializedValue = JSON.stringify(value);
            await redisClient.setEx(key, ttlSeconds, serializedValue);
        } catch (error) {
            console.error('❌ Redis set error:', error);
            throw error;
        }
    },

    /**
     * קבלת ערך מcache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await redisClient.get(key);
            if (value === null) {
                return null;
            }
            return JSON.parse(value) as T;
        } catch (error) {
            console.error('❌ Redis get error:', error);
            return null; // במקרה של שגיאה, נחזיר null במקום לפוצץ
        }
    },

    /**
     * מחיקת ערך מcache
     */
    async delete(key: string): Promise<void> {
        try {
            await redisClient.del(key);
        } catch (error) {
            console.error('❌ Redis delete error:', error);
        }
    },

    /**
     * בדיקה אם key קיים
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            console.error('❌ Redis exists error:', error);
            return false;
        }
    },

    /**
     * מחיקת כל הcache (לפיתוח בלבד)
     */
    async clear(): Promise<void> {
        try {
            await redisClient.flushAll();
            console.log('🔴 Redis cache cleared');
        } catch (error) {
            console.error('❌ Redis clear error:', error);
        }
    }
};

// טיפול בסגירת התהליך
process.on('SIGINT', async () => {
    await disconnectRedis();
});

process.on('SIGTERM', async () => {
    await disconnectRedis();
});

export { redisClient };