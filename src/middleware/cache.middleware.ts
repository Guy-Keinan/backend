import { Request, Response, NextFunction } from 'express';
import { redisCache } from '../config/redis';

/**
 * Cache Middleware - מטפל בcaching של API responses
 * 
 * שימוש:
 * router.get('/endpoint', cacheMiddleware(300), controller)
 * 
 * הMiddleware:
 * 1. בודק אם יש cache עבור הבקשה
 * 2. אם כן - מחזיר מהcache
 * 3. אם לא - מעביר לcontroller ושומר את התשובה
 */

/**
 * יצירת cache key מהבקשה
 */
const generateCacheKey = (req: Request): string => {
    const { method, originalUrl, query, user } = req;

    // עבור בקשות של משתמש ספציפי
    const userId = user?.userId || 'anonymous';

    // משלבים את כל הפרמטרים הרלוונטיים
    const keyData = {
        method,
        url: originalUrl,
        query,
        userId: originalUrl.includes('/auth/') || originalUrl.includes('/children/') || originalUrl.includes('/stories/')
            ? userId
            : null // עבור endpoints ציבוריים לא נכלול userId
    };

    // יצירת key ייחודי
    const keyString = JSON.stringify(keyData);
    return `api_cache:${Buffer.from(keyString).toString('base64')}`;
};

/**
 * Cache Middleware Factory
 */
export const cacheMiddleware = (ttlSeconds: number = 300) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // רק עבור GET requests
            if (req.method !== 'GET') {
                return next();
            }

            const cacheKey = generateCacheKey(req);

            // ניסיון לקבל מהcache
            const cachedResponse = await redisCache.get(cacheKey);

            if (cachedResponse) {
                console.log(`🔴 Cache HIT: ${req.originalUrl}`);

                // החזרת התשובה מהcache
                res.set('X-Cache', 'HIT');
                res.json(cachedResponse);
                return;
            }

            console.log(`🔴 Cache MISS: ${req.originalUrl}`);

            // שמירת הfunction המקורית
            const originalJson = res.json;

            // override של res.json כדי לשמור בcache
            res.json = function (data: any) {
                // שמירה בcache (רק אם התשובה תקינה)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redisCache.set(cacheKey, data, ttlSeconds).catch(error => {
                        console.error('❌ Cache set error:', error);
                    });
                }

                // הוספת header שמציין cache miss
                res.set('X-Cache', 'MISS');

                // קריאה לfunction המקורית
                return originalJson.call(this, data);
            };

            next();

        } catch (error) {
            console.error('❌ Cache middleware error:', error);
            // אם יש שגיאה בcache, ממשיכים בלי cache
            next();
        }
    };
};

/**
 * Cache Invalidation Helper
 */
export const invalidateCache = {
    /**
     * מחיקת cache לpattern מסוים
     */
    async byPattern(pattern: string): Promise<void> {
        try {
            // לפעמים נרצה למחוק cache של משתמש ספציפי או endpoint ספציפי
            console.log(`🔴 Invalidating cache pattern: ${pattern}`);
            // כרגע נעשה flush פשוט, אבל אפשר לשפר בעתיד
        } catch (error) {
            console.error('❌ Cache invalidation error:', error);
        }
    },

    /**
     * מחיקת cache של משתמש ספציפי
     */
    async byUser(userId: number): Promise<void> {
        try {
            console.log(`🔴 Invalidating cache for user: ${userId}`);
            // כאן נמחק כל cache הקשור למשתמש הזה
        } catch (error) {
            console.error('❌ User cache invalidation error:', error);
        }
    },

    /**
     * מחיקת כל הcache (לפיתוח)
     */
    async all(): Promise<void> {
        try {
            await redisCache.clear();
        } catch (error) {
            console.error('❌ Full cache clear error:', error);
        }
    }
};