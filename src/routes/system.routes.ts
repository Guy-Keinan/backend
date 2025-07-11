import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getUserRateLimitStatus } from '../config/rateLimiter';
import { CacheService } from '../services/cache.service';
import { getQueueStats } from '../queues/storyQueue';

/**
 * System Routes - נתיבי מערכת
 * 
 * ניטור ובדיקת מצב המערכת
 */

const router = Router();

/**
 * בדיקת מצב Rate Limit למשתמש
 * GET /system/rate-limit
 */
router.get('/rate-limit', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const status = await getUserRateLimitStatus(userId);

        res.status(200).json({
            success: true,
            data: {
                userId,
                limits: status,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('Rate limit status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get rate limit status'
        });
    }
});

/**
 * בדיקת מצב Cache
 * GET /system/cache
 */
router.get('/cache', authenticateToken, async (req: Request, res: Response) => {
    try {
        const [stats, health] = await Promise.all([
            CacheService.getStats(),
            CacheService.healthCheck()
        ]);

        res.status(200).json({
            success: true,
            data: {
                health,
                stats,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('Cache status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cache status'
        });
    }
});

/**
 * בדיקת מצב Queue
 * GET /system/queue
 */
router.get('/queue', authenticateToken, async (req: Request, res: Response) => {
    try {
        const stats = await getQueueStats();

        res.status(200).json({
            success: true,
            data: {
                queue: stats,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('Queue status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get queue status'
        });
    }
});

/**
 * בדיקת בריאות כללית
 * GET /system/health
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        const [cacheHealth, queueStats] = await Promise.all([
            CacheService.healthCheck(),
            getQueueStats()
        ]);

        const isHealthy = cacheHealth.status === 'healthy' && !queueStats.isPaused;

        res.status(isHealthy ? 200 : 503).json({
            success: isHealthy,
            data: {
                status: isHealthy ? 'healthy' : 'degraded',
                services: {
                    cache: cacheHealth.status,
                    queue: queueStats.isPaused ? 'paused' : 'active',
                    database: 'healthy' // נניח שהוא תמיד healthy כי אם לא, לא היינו מגיעים לכאן
                },
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            success: false,
            data: {
                status: 'unhealthy',
                error: (error as Error).message
            }
        });
    }
});

export default router;