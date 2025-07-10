import { Queue, Job } from 'bullmq';
import { defaultQueueOptions, QueueNames } from '../config/bullmq';

/**
 * Story Generation Queue
 * 
 * תור לניהול יצירת סיפורים:
 * - יצירת תוכן מותאם אישית
 * - יצירת תמונות AI (בעתיד)
 * - שמירת התוצאות
 */

// ממשקים לנתוני ה-Job
export interface StoryGenerationJobData {
    userId: number;
    childId: number;
    templateId: number;
    requestId: string; // מזהה ייחודי לבקשה
}

export interface StoryGenerationJobResult {
    storyId: number;
    title: string;
    generatedAt: Date;
    processingTime: number; // באלפיות שנייה
}

// יצירת התור
export const storyQueue = new Queue<StoryGenerationJobData, StoryGenerationJobResult>(
    QueueNames.STORY_GENERATION,
    defaultQueueOptions
);

/**
 * הוספת job חדש לתור
 */
export const addStoryGenerationJob = async (
    data: StoryGenerationJobData,
    priority?: number
): Promise<Job<StoryGenerationJobData, StoryGenerationJobResult>> => {
    const job = await storyQueue.add(
        'generate-story', // שם ה-job
        data,
        {
            priority: priority || 0, // 0 = רגיל, מספר גבוה יותר = עדיפות גבוהה
            // אפשר להוסיף delay אם רוצים
            // delay: 5000, // 5 שניות
        }
    );

    console.log(`📚 Story generation job added: ${job.id} for child ${data.childId}`);
    return job;
};

/**
 * קבלת סטטוס של job
 */
export const getJobStatus = async (jobId: string) => {
    const job = await storyQueue.getJob(jobId);

    if (!job) {
        return null;
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
        id: job.id,
        state,
        progress,
        data: job.data,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
    };
};

/**
 * קבלת כל ה-jobs של משתמש
 */
export const getUserJobs = async (userId: number) => {
    // קבלת jobs בסטטוסים שונים
    const [waiting, active, completed, failed] = await Promise.all([
        storyQueue.getWaiting(),
        storyQueue.getActive(),
        storyQueue.getCompleted(),
        storyQueue.getFailed(),
    ]);

    // סינון לפי userId
    const allJobs = [...waiting, ...active, ...completed, ...failed];
    const userJobs = allJobs.filter(job => job.data.userId === userId);

    // מיון לפי זמן יצירה
    userJobs.sort((a, b) => b.timestamp - a.timestamp);

    return userJobs;
};

/**
 * ביטול job
 */
export const cancelJob = async (jobId: string): Promise<boolean> => {
    const job = await storyQueue.getJob(jobId);

    if (!job) {
        return false;
    }

    // אפשר לבטל רק jobs שעדיין לא התחילו
    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
        await job.remove();
        console.log(`❌ Job ${jobId} cancelled`);
        return true;
    }

    return false;
};

/**
 * ניקוי jobs ישנים (לתחזוקה)
 */
export const cleanOldJobs = async (olderThanDays: number = 30) => {
    const gracePeriod = olderThanDays * 24 * 60 * 60 * 1000; // ימים למילישניות
    const timestamp = Date.now() - gracePeriod;

    const jobs = await storyQueue.clean(
        gracePeriod,
        100, // מקסימום jobs לנקות בפעם אחת
        'completed'
    );

    console.log(`🧹 Cleaned ${jobs.length} old completed jobs`);

    return jobs.length;
};

/**
 * קבלת סטטיסטיקות התור
 */
export const getQueueStats = async () => {
    const [
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        delayedCount
    ] = await Promise.all([
        storyQueue.getWaitingCount(),
        storyQueue.getActiveCount(),
        storyQueue.getCompletedCount(),
        storyQueue.getFailedCount(),
        storyQueue.getDelayedCount(),
    ]);

    return {
        name: QueueNames.STORY_GENERATION,
        counts: {
            waiting: waitingCount,
            active: activeCount,
            completed: completedCount,
            failed: failedCount,
            delayed: delayedCount,
            total: waitingCount + activeCount + completedCount + failedCount + delayedCount,
        },
        isPaused: await storyQueue.isPaused(),
    };
};

/**
 * השהיית/המשך התור (לתחזוקה)
 */
export const pauseQueue = async () => {
    await storyQueue.pause();
    console.log('⏸️ Story queue paused');
};

export const resumeQueue = async () => {
    await storyQueue.resume();
    console.log('▶️ Story queue resumed');
};