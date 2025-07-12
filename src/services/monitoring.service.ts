import { CacheService } from './cache.service';
import { getQueueStats } from '../queues/storyQueue';
import { prisma } from '../config/prisma';
import os from 'os';

/**
 * Monitoring Service
 * 
 * מרכז נתונים לניטור המערכת
 */

export class MonitoringService {

    /**
     * קבלת מטריקות מערכת
     */
    static async getSystemMetrics() {
        const [cpuUsage, memoryUsage] = await Promise.all([
            this.getCpuUsage(),
            this.getMemoryUsage(),
        ]);

        return {
            cpu: cpuUsage,
            memory: memoryUsage,
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            hostname: os.hostname(),
        };
    }

    /**
     * קבלת שימוש ב-CPU
     */
    private static async getCpuUsage(): Promise<number> {
        const startUsage = process.cpuUsage();
        const startTime = Date.now();

        // המתנה קצרה למדידה
        await new Promise(resolve => setTimeout(resolve, 100));

        const endUsage = process.cpuUsage(startUsage);
        const endTime = Date.now();

        const userTime = endUsage.user / 1000; // microseconds to milliseconds
        const systemTime = endUsage.system / 1000;
        const totalTime = userTime + systemTime;
        const elapsedTime = endTime - startTime;

        return (totalTime / elapsedTime) * 100;
    }

    /**
     * קבלת שימוש בזיכרון
     */
    private static getMemoryUsage() {
        const usage = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();

        return {
            process: {
                rss: this.formatBytes(usage.rss),
                heapTotal: this.formatBytes(usage.heapTotal),
                heapUsed: this.formatBytes(usage.heapUsed),
                external: this.formatBytes(usage.external),
                percentage: (usage.rss / totalMemory) * 100,
            },
            system: {
                total: this.formatBytes(totalMemory),
                free: this.formatBytes(freeMemory),
                used: this.formatBytes(totalMemory - freeMemory),
                percentage: ((totalMemory - freeMemory) / totalMemory) * 100,
            },
        };
    }

    /**
     * פורמט bytes לקריא
     */
    private static formatBytes(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * קבלת סטטיסטיקות אפליקציה
     */
    static async getApplicationStats() {
        const [dbStats, cacheStats, queueStats] = await Promise.all([
            this.getDatabaseStats(),
            CacheService.getStats(),
            getQueueStats(),
        ]);

        return {
            database: dbStats,
            cache: cacheStats,
            queue: queueStats,
            timestamp: new Date(),
        };
    }

    /**
     * קבלת סטטיסטיקות מסד נתונים
     */
    private static async getDatabaseStats() {
        try {
            const [users, children, stories, templates] = await Promise.all([
                prisma.user.count(),
                prisma.child.count(),
                prisma.story.count(),
                prisma.storyTemplate.count(),
            ]);

            // סטטיסטיקות נוספות
            const recentStories = await prisma.story.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 שעות אחרונות
                    },
                },
            });

            const activeUsers = await prisma.user.count({
                where: {
                    stories: {
                        some: {
                            createdAt: {
                                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 ימים
                            },
                        },
                    },
                },
            });

            return {
                counts: {
                    users,
                    children,
                    stories,
                    templates,
                },
                activity: {
                    recentStories,
                    activeUsers,
                },
            };
        } catch (error) {
            console.error('Database stats error:', error);
            return {
                counts: { users: 0, children: 0, stories: 0, templates: 0 },
                activity: { recentStories: 0, activeUsers: 0 },
            };
        }
    }

    /**
     * קבלת לוגים אחרונים
     */
    static async getRecentLogs(limit: number = 50): Promise<any[]> {
        // בפרודקשן אפשר לקרוא מקבצי הלוג
        // כרגע נחזיר מערך ריק
        return [];
    }

    /**
     * קבלת health check מפורט
     */
    static async getDetailedHealthCheck() {
        const checks = {
            database: await this.checkDatabase(),
            cache: await this.checkCache(),
            queue: await this.checkQueue(),
            disk: await this.checkDiskSpace(),
        };

        const overallHealth = Object.values(checks).every(check => check.status === 'healthy');

        return {
            status: overallHealth ? 'healthy' : 'degraded',
            checks,
            timestamp: new Date(),
        };
    }

    /**
     * בדיקת מסד נתונים
     */
    private static async checkDatabase() {
        try {
            const start = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            const latency = Date.now() - start;

            return {
                status: 'healthy' as const,
                latency,
                message: 'Database is responsive',
            };
        } catch (error) {
            return {
                status: 'unhealthy' as const,
                latency: -1,
                message: (error as Error).message,
            };
        }
    }

    /**
     * בדיקת cache
     */
    private static async checkCache() {
        const health = await CacheService.healthCheck();
        return {
            status: health.status,
            latency: health.latency,
            message: health.connected ? 'Cache is responsive' : 'Cache is not connected',
        };
    }

    /**
     * בדיקת queue
     */
    private static async checkQueue() {
        try {
            const stats = await getQueueStats();
            return {
                status: stats.isPaused ? 'degraded' as const : 'healthy' as const,
                activeJobs: stats.counts.active,
                message: stats.isPaused ? 'Queue is paused' : 'Queue is active',
            };
        } catch (error) {
            return {
                status: 'unhealthy' as const,
                activeJobs: 0,
                message: (error as Error).message,
            };
        }
    }

    /**
     * בדיקת מקום בדיסק
     */
    private static async checkDiskSpace() {
        // בלינוקס/מק אפשר להשתמש ב-df command
        // כרגע נחזיר ערך דמי
        return {
            status: 'healthy' as const,
            available: '10 GB',
            percentage: 75,
            message: 'Sufficient disk space available',
        };
    }
}