import { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

/**
 * BullMQ Configuration
 * 
 * מגדיר את החיבור ל-Redis עבור BullMQ
 * משתמש באותו Redis שמשמש ל-caching
 */

// אפשרויות חיבור ל-Redis
export const bullMQConnection: ConnectionOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
        // נסה שוב אחרי 3 שניות
        return Math.min(times * 3000, 30000);
    }
};

// יצירת Redis client ל-BullMQ
export const bullMQRedis = new IORedis(bullMQConnection);

// בדיקת חיבור
bullMQRedis.on('connect', () => {
    console.log('🐂 BullMQ Redis connected successfully');
});

bullMQRedis.on('error', (error) => {
    console.error('❌ BullMQ Redis connection error:', error);
});

/**
 * הגדרות ברירת מחדל לתורים
 */
export const defaultQueueOptions = {
    connection: bullMQConnection,
    defaultJobOptions: {
        // הסרה אוטומטית של jobs שהושלמו אחרי 24 שעות
        removeOnComplete: {
            age: 24 * 3600, // 24 שעות בשניות
            count: 100      // שמור מקסימום 100 jobs אחרונים
        },
        // הסרה אוטומטית של jobs שנכשלו אחרי 7 ימים
        removeOnFail: {
            age: 7 * 24 * 3600, // 7 ימים
            count: 500          // שמור מקסימום 500 כשלונות
        },
        // ניסיונות חוזרים במקרה של כשלון
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000, // 2 שניות
        },
    },
};

/**
 * הגדרות ברירת מחדל ל-Workers
 */
export const defaultWorkerOptions = {
    connection: bullMQConnection,
    concurrency: 5, // מספר jobs מקבילים
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
};

/**
 * רשימת שמות התורים במערכת
 */
export const QueueNames = {
    STORY_GENERATION: 'story-generation',
    IMAGE_GENERATION: 'image-generation', // לעתיד
    EMAIL_NOTIFICATIONS: 'email-notifications', // לעתיד
} as const;

/**
 * סטטוסים אפשריים ל-jobs
 */
export const JobStatus = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    FAILED: 'failed',
    DELAYED: 'delayed',
    PAUSED: 'paused',
} as const;