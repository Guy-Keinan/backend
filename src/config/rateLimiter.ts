import rateLimit, { MemoryStore } from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate Limiter Configuration
 * 
 * הגדרות שונות למגבלות לפי סוג הפעולה
 * 
 * כרגע משתמשים ב-MemoryStore (לפיתוח)
 * בפרודקשן כדאי לעבור ל-RedisStore
 */

/**
 * Rate limiter כללי - לכל ה-API
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,     // 15 דקות
    max: 100,                      // 100 בקשות לחלון זמן
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: 15
    },
    standardHeaders: true,          // הוספת headers סטנדרטיים
    legacyHeaders: false,          // ללא X-RateLimit headers ישנים
    skip: (req) => {
        // דלג על health checks
        return req.path === '/health' || req.path === '/';
    }
});

/**
 * Rate limiter להרשמה והתחברות
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,     // 15 דקות
    max: 5,                        // 5 ניסיונות בלבד
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: 15
    },
    skipSuccessfulRequests: true,   // לא סופר בקשות מוצלחות
    keyGenerator: (req) => {
        // מפתח לפי IP + email (אם קיים)
        const email = req.body?.email || '';
        return `${req.ip}:${email}`;
    }
});

/**
 * Rate limiter ליצירת סיפורים
 */
export const storyGenerationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,      // שעה
    max: 20,                       // 20 סיפורים לשעה
    message: {
        success: false,
        message: 'Story generation limit reached. You can create up to 20 stories per hour.',
        retryAfter: 60
    },
    keyGenerator: (req) => {
        // מפתח לפי משתמש מאומת
        return `story:${req.user?.userId || req.ip}`;
    },
    skip: (req) => {
        // VIP users - אפשר להוסיף לוגיקה בעתיד
        return false;
    }
});

/**
 * Rate limiter לקריאות API כבדות
 */
export const heavyOperationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,       // 5 דקות
    max: 10,                       // 10 פעולות כבדות
    message: {
        success: false,
        message: 'Heavy operation limit reached. Please wait before trying again.',
        retryAfter: 5
    }
});

/**
 * Rate limiter דינמי - לפי תפקיד המשתמש
 */
export const createDynamicLimiter = (options: {
    windowMs: number;
    maxForUser: number;
    maxForGuest: number;
    resource: string;
}) => {
    return rateLimit({
        windowMs: options.windowMs,
        max: (req) => {
            // משתמשים מאומתים מקבלים יותר
            return req.user ? options.maxForUser : options.maxForGuest;
        },
        message: (req: Request) => ({
            success: false,
            message: `${options.resource} limit reached.`,
            limit: (req as any).user ? options.maxForUser : options.maxForGuest,
            retryAfter: Math.ceil(options.windowMs / 1000 / 60)
        }),
        keyGenerator: (req) => {
            return `${options.resource}:${req.user?.userId || req.ip}`;
        }
    });
};

/**
 * Rate limiter עבור uploads
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,      // שעה
    max: 50,                       // 50 העלאות לשעה
    message: {
        success: false,
        message: 'Upload limit reached. You can upload up to 50 files per hour.',
        retryAfter: 60
    },
    keyGenerator: (req) => {
        return `upload:${req.user?.userId || req.ip}`;
    }
});

/**
 * פונקציה לקבלת מצב rate limit של משתמש
 * 
 * בגרסה הנוכחית (MemoryStore) לא ניתן לקבל את המידע
 * בפרודקשן עם Redis אפשר יהיה להחזיר מידע אמיתי
 */
export const getUserRateLimitStatus = async (userId: number) => {
    // Placeholder - בפרודקשן עם Redis נוכל לקבל נתונים אמיתיים
    return {
        general: {
            used: 0,
            limit: 100,
            remaining: 100
        },
        story: {
            used: 0,
            limit: 20,
            remaining: 20
        },
        upload: {
            used: 0,
            limit: 50,
            remaining: 50
        }
    };
};

/**
 * Middleware פשוט לבדיקת headers
 */
export const rateLimitInfo = (req: any, res: any, next: any) => {
    // מוסיף מידע על rate limit לheaders
    const info = {
        'X-RateLimit-Policy': 'General: 100/15min, Auth: 5/15min, Stories: 20/hour'
    };

    Object.entries(info).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    next();
};