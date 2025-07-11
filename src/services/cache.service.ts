import { redisCache } from '../config/redis';
import IORedis from 'ioredis';
import { bullMQRedis } from '../config/bullmq';
import { invalidateCache } from '../middleware/cache.middleware';

/**
 * Cache Service - ניהול מתקדם של Cache
 * 
 * מספק:
 * - Cache invalidation
 * - Pattern-based deletion
 * - Cache warming
 * - Monitoring
 */

export class CacheService {
    // משתמשים ב-Redis client של BullMQ
    private static redis: IORedis = bullMQRedis;

    // Cache key patterns
    private static readonly PATTERNS = {
        STORY_TEMPLATE: 'story-template:',
        USER_STORIES: 'user-stories:',
        CHILD_STORIES: 'child-stories:',
        API_CACHE: 'api_cache:',
    };

    // TTL values בשניות
    private static readonly TTL = {
        STORY_TEMPLATE: 3600,      // שעה
        USER_STORIES: 300,         // 5 דקות
        CHILD_STORIES: 300,        // 5 דקות
        API_RESPONSE: 60,          // דקה
    };

    /**
     * קבלת או יצירת cache
     */
    static async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        ttl: number = 300
    ): Promise<T> {
        try {
            // ניסיון לקבל מ-cache
            const cached = await redisCache.get<T>(key);
            if (cached !== null) {
                console.log(`🎯 Cache HIT: ${key}`);
                return cached;
            }

            console.log(`💫 Cache MISS: ${key}`);

            // יצירת הערך
            const value = await factory();

            // שמירה ב-cache
            await redisCache.set(key, value, ttl);

            return value;
        } catch (error) {
            console.error('❌ Cache error, falling back to factory:', error);
            // Fallback - אם Redis לא זמין
            return await factory();
        }
    }

    /**
     * מחיקת cache לפי pattern
     */
    static async invalidatePattern(pattern: string): Promise<number> {
        try {
            console.log(`🧹 Invalidating cache pattern: ${pattern}`);

            let deletedCount = 0;
            const stream = this.redis.scanStream({
                match: `${pattern}*`,
                count: 100
            });

            stream.on('data', async (keys: string[]) => {
                if (keys.length) {
                    const pipeline = this.redis.pipeline();
                    keys.forEach(key => pipeline.del(key));
                    await pipeline.exec();
                    deletedCount += keys.length;
                }
            });

            return new Promise((resolve) => {
                stream.on('end', () => {
                    console.log(`✅ Deleted ${deletedCount} keys`);
                    resolve(deletedCount);
                });
                stream.on('error', (err) => {
                    console.error('❌ Scan error:', err);
                    resolve(deletedCount);
                });
            });

        } catch (error) {
            console.error('❌ Pattern invalidation error:', error);
            return 0;
        }
    }

    /**
     * מחיקת cache ספציפי
     */
    static async invalidate(key: string): Promise<void> {
        try {
            await redisCache.delete(key);
            console.log(`🗑️ Invalidated: ${key}`);
        } catch (error) {
            console.error('❌ Invalidation error:', error);
        }
    }

    /**
     * Cache invalidation לתבניות סיפורים
     */
    static async invalidateStoryTemplates(): Promise<void> {
        await this.invalidatePattern(this.PATTERNS.STORY_TEMPLATE);
        await this.invalidatePattern(`${this.PATTERNS.API_CACHE}*templates*`);
    }

    /**
     * Cache invalidation לסיפורי משתמש
     */
    static async invalidateUserStories(userId: number): Promise<void> {
        await this.invalidatePattern(`${this.PATTERNS.USER_STORIES}${userId}`);
        await this.invalidatePattern(`${this.PATTERNS.API_CACHE}*user:${userId}*`);
    }

    /**
     * Cache invalidation לסיפורי ילד
     */
    static async invalidateChildStories(childId: number): Promise<void> {
        await this.invalidatePattern(`${this.PATTERNS.CHILD_STORIES}${childId}`);
    }

    /**
     * Cache warming - טעינה מראש של נתונים חשובים
     */
    static async warmCache(): Promise<void> {
        console.log('🔥 Warming cache...');

        try {
            // טעינת תבניות פופולריות
            const { StoryTemplateService } = await import('./storyTemplate.service');
            const templates = await StoryTemplateService.getTemplates();

            // שמירת כל תבנית ב-cache
            for (const template of templates) {
                const key = `${this.PATTERNS.STORY_TEMPLATE}${template.id}`;
                await redisCache.set(key, template, this.TTL.STORY_TEMPLATE);
            }

            console.log(`✅ Warmed ${templates.length} story templates`);

        } catch (error) {
            console.error('❌ Cache warming error:', error);
        }
    }

    /**
     * קבלת סטטיסטיקות cache
     */
    static async getStats(): Promise<{
        keys: number;
        memory: string;
        hits: number;
        misses: number;
        hitRate: number;
    }> {
        try {
            const info = await this.redis.info('stats');
            const memory = await this.redis.info('memory');

            // פרסור המידע
            const stats = {
                keys: await this.redis.dbsize(),
                memory: memory.match(/used_memory_human:(.+)/)?.[1]?.trim() || 'N/A',
                hits: parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0'),
                misses: parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0'),
                hitRate: 0
            };

            // חישוב hit rate
            const total = stats.hits + stats.misses;
            stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;

            return stats;

        } catch (error) {
            console.error('❌ Stats error:', error);
            return {
                keys: 0,
                memory: 'N/A',
                hits: 0,
                misses: 0,
                hitRate: 0
            };
        }
    }

    /**
     * בדיקת בריאות ה-cache
     */
    static async healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        latency: number;
        connected: boolean;
    }> {
        const start = Date.now();

        try {
            await this.redis.ping();
            const latency = Date.now() - start;

            return {
                status: 'healthy',
                latency,
                connected: true
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                latency: Date.now() - start,
                connected: false
            };
        }
    }
}

// Export גם את ה-invalidateCache הקיים
export { invalidateCache };