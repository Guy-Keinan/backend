/**
 * Queues Index
 * 
 * מרכז את כל התורים במערכת
 */

export * from './storyQueue';

// בעתיד:
// export * from './imageQueue';
// export * from './emailQueue';

import { storyQueue, getQueueStats } from './storyQueue';
import { QueueEvents } from 'bullmq';
import { bullMQConnection } from '../config/bullmq';

/**
 * אתחול כל התורים
 */
export const initializeQueues = async () => {
    console.log('🐂 Initializing BullMQ queues...');

    // בדיקת חיבור
    try {
        const stats = await getQueueStats();
        console.log('📊 Story queue stats:', stats);

        // הגדרת event listeners לניטור
        setupQueueEvents();

        console.log('✅ Queues initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize queues:', error);
        throw error;
    }
};

/**
 * הגדרת event listeners לניטור התורים
 */
const setupQueueEvents = () => {
    const queueEvents = new QueueEvents(storyQueue.name, {
        connection: bullMQConnection,
    });

    // כשjob מתחיל
    queueEvents.on('active', ({ jobId, prev }) => {
        console.log(`🏃 Job ${jobId} started | previous state: ${prev}`);
    });

    // כשjob מסתיים בהצלחה
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
        console.log(`✅ Job ${jobId} completed successfully`);
    });

    // כשjob נכשל
    queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.error(`❌ Job ${jobId} failed: ${failedReason}`);
    });

    // התקדמות job
    queueEvents.on('progress', ({ jobId, data }) => {
        console.log(`📈 Job ${jobId} progress: ${data}%`);
    });
};

/**
 * סגירת כל התורים (לסגירת האפליקציה)
 */
export const closeQueues = async () => {
    console.log('🔒 Closing queues...');

    await storyQueue.close();

    console.log('✅ Queues closed');
};