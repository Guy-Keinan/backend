import { Worker, Job } from 'bullmq';
import { QueueNames, defaultWorkerOptions } from '../../config/bullmq';
import { StoryGenerationJobData, StoryGenerationJobResult } from '../storyQueue';
import { StoryService } from '../../services/story.service';
import { prisma } from '../../config/prisma';

/**
 * Story Generation Worker
 * 
 * עובד שמעבד jobs של יצירת סיפורים:
 * 1. מקבל את הנתונים מה-job
 * 2. יוצר את הסיפור דרך StoryService
 * 3. מעדכן את הסטטוס בDB
 * 4. מחזיר תוצאה
 */

let storyWorker: Worker<StoryGenerationJobData, StoryGenerationJobResult> | null = null;

/**
 * פונקציית העיבוד העיקרית
 */
const processStoryGeneration = async (
    job: Job<StoryGenerationJobData, StoryGenerationJobResult>
): Promise<StoryGenerationJobResult> => {
    const startTime = Date.now();
    const { userId, childId, templateId, requestId } = job.data;

    console.log(`🏗️ Processing story generation job ${job.id}`);
    console.log(`📖 User: ${userId}, Child: ${childId}, Template: ${templateId}`);

    try {
        // עדכון התקדמות - 10%
        await job.updateProgress(10);

        // שלב 1: בדיקת תקינות הנתונים
        console.log('🔍 Validating data...');

        const [user, child, template] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId, isActive: true } }),
            prisma.child.findFirst({ where: { id: childId, userId, isActive: true } }),
            prisma.storyTemplate.findUnique({ where: { id: templateId, isActive: true } })
        ]);

        if (!user) {
            throw new Error(`User ${userId} not found or inactive`);
        }
        if (!child) {
            throw new Error(`Child ${childId} not found or doesn't belong to user ${userId}`);
        }
        if (!template) {
            throw new Error(`Template ${templateId} not found or inactive`);
        }

        // עדכון התקדמות - 30%
        await job.updateProgress(30);

        // שלב 2: יצירת הסיפור
        console.log('📝 Generating story content...');

        // כאן בעתיד אפשר להוסיף:
        // - קריאה ל-AI API ליצירת וריאציות
        // - יצירת תמונות מותאמות אישית
        // - תרגום לשפות נוספות

        const story = await StoryService.generateStory(userId, {
            templateId,
            childId
        });

        // עדכון התקדמות - 70%
        await job.updateProgress(70);

        // שלב 3: עיבודים נוספים (בעתיד)
        console.log('🎨 Processing additional content...');

        // TODO: בעתיד נוסיף כאן:
        // - יצירת תמונות AI
        // - יצירת אודיו/הקראה
        // - PDF generation

        // עדכון התקדמות - 90%
        await job.updateProgress(90);

        // שלב 4: עדכון סטטוס בDB
        console.log('💾 Updating story status...');

        await prisma.story.update({
            where: { id: story.id },
            data: {
                generationStatus: 'completed',
                content: {
                    ...(story.content as any),
                    processedAt: new Date(),
                    processingTime: Date.now() - startTime,
                    jobId: job.id,
                    requestId
                }
            }
        });

        // עדכון התקדמות - 100%
        await job.updateProgress(100);

        const processingTime = Date.now() - startTime;
        console.log(`✅ Story ${story.id} generated successfully in ${processingTime}ms`);

        return {
            storyId: story.id,
            title: story.title,
            generatedAt: new Date(),
            processingTime
        };

    } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error);

        // עדכון סטטוס כשלון בDB
        try {
            // מנסים למצוא story קיים או ליצור רשומת כשלון
            const failedStory = await prisma.story.findFirst({
                where: {
                    userId,
                    childId,
                    storyTemplateId: templateId,
                    generationStatus: 'processing'
                },
                orderBy: { createdAt: 'desc' }
            });

            if (failedStory) {
                await prisma.story.update({
                    where: { id: failedStory.id },
                    data: {
                        generationStatus: 'failed',
                        content: {
                            error: (error as Error).message,
                            failedAt: new Date(),
                            jobId: job.id,
                            requestId
                        }
                    }
                });
            }
        } catch (dbError) {
            console.error('Failed to update story status in DB:', dbError);
        }

        throw error;
    }
};

/**
 * יצירת והפעלת ה-Worker
 */
export const startStoryWorker = (): Worker<StoryGenerationJobData, StoryGenerationJobResult> => {
    if (storyWorker) {
        console.log('⚠️ Story worker already running');
        return storyWorker;
    }

    storyWorker = new Worker<StoryGenerationJobData, StoryGenerationJobResult>(
        QueueNames.STORY_GENERATION,
        processStoryGeneration,
        {
            ...defaultWorkerOptions,
            // אפשר להגדיר concurrency ספציפי
            concurrency: process.env.STORY_WORKER_CONCURRENCY
                ? parseInt(process.env.STORY_WORKER_CONCURRENCY)
                : 3,
        }
    );

    // Event listeners
    storyWorker.on('completed', (job) => {
        console.log(`✅ Worker completed job ${job.id}`);
    });

    storyWorker.on('failed', (job, error) => {
        console.error(`❌ Worker failed job ${job?.id}:`, error);
    });

    storyWorker.on('active', (job) => {
        console.log(`🏃 Worker processing job ${job.id}`);
    });

    storyWorker.on('error', (error) => {
        console.error('❌ Worker error:', error);
    });

    console.log('🚀 Story worker started successfully');
    return storyWorker;
};

/**
 * עצירת ה-Worker
 */
export const stopStoryWorker = async (): Promise<void> => {
    if (!storyWorker) {
        console.log('⚠️ Story worker not running');
        return;
    }

    console.log('🛑 Stopping story worker...');
    await storyWorker.close();
    storyWorker = null;
    console.log('✅ Story worker stopped');
};

/**
 * קבלת סטטוס ה-Worker
 */
export const getWorkerStatus = () => {
    if (!storyWorker) {
        return {
            running: false,
            concurrency: 0,
            activeJobs: 0
        };
    }

    return {
        running: true,
        concurrency: storyWorker.opts.concurrency || 0,
        // activeJobs: storyWorker.activeJobs.size // אין גישה ישירה ב-v5
    };
};