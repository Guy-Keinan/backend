import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../config/prisma';
import { connectRedis, disconnectRedis } from '../config/redis';
import { initializeQueues, closeQueues } from '../queues';
import { startStoryWorker, stopStoryWorker } from '../queues/workers/storyWorker';
import {
    addStoryGenerationJob,
    getJobStatus,
    getQueueStats,
    storyQueue
} from '../queues/storyQueue';
import { QueueEvents } from 'bullmq';
import { bullMQConnection } from '../config/bullmq';
import { UserService } from '../services/user.service';
import { ChildrenService } from '../services/children.service';
import { StoryTemplateService } from '../services/storyTemplate.service';
import { Gender } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * סקריפט בדיקה מקיף ל-BullMQ
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const testBullMQ = async (): Promise<void> => {
    let queueEvents: QueueEvents | null = null;

    try {
        console.log('🧪 Testing BullMQ Integration...\n');

        // חיבורים
        console.log('1️⃣ Connecting to services...');
        await connectDatabase();
        await connectRedis();
        await initializeQueues();

        // הפעלת Worker
        console.log('2️⃣ Starting worker...');
        startStoryWorker();
        await sleep(1000); // נותן לworker להתחבר

        // יצירת QueueEvents למעקב
        queueEvents = new QueueEvents(storyQueue.name, {
            connection: bullMQConnection
        });

        // בדיקת סטטוס התור
        console.log('\n3️⃣ Checking queue status...');
        const initialStats = await getQueueStats();
        console.log('📊 Initial queue stats:', initialStats);

        // יצירת נתוני בדיקה
        console.log('\n4️⃣ Creating test data...');

        // יצירת משתמש
        const testUser = await UserService.createUser({
            email: `bullmq-test-${Date.now()}@example.com`,
            password: 'Test123456!',
            firstName: 'BullMQ',
            lastName: 'Test'
        });
        console.log('✅ Test user created:', testUser.email);

        // יצירת ילד
        const testChild = await ChildrenService.createChild(testUser.id, {
            name: 'טסט בול',
            gender: Gender.MALE,
            age: 5,
            hairColor: 'חום',
            eyeColor: 'ירוק'
        });
        console.log('✅ Test child created:', testChild.name);

        // בדיקה שיש תבניות
        const templates = await StoryTemplateService.getTemplates();
        if (templates.length === 0) {
            console.log('❌ No story templates found. Please run: npm run seed:story-templates');
            return;
        }
        console.log('✅ Found', templates.length, 'story templates');

        // הוספת jobs לתור
        console.log('\n5️⃣ Adding jobs to queue...');

        const jobs = [];

        // Job רגיל
        console.log('📝 Adding normal priority job...');
        const normalJob = await addStoryGenerationJob({
            userId: testUser.id,
            childId: testChild.id,
            templateId: templates[0]?.id || 1,
            requestId: uuidv4()
        });
        jobs.push(normalJob);
        console.log('✅ Normal job added:', normalJob.id);

        // Job עם עדיפות גבוהה
        console.log('📝 Adding high priority job...');
        const priorityJob = await addStoryGenerationJob({
            userId: testUser.id,
            childId: testChild.id,
            templateId: templates[1]?.id || 2,
            requestId: uuidv4()
        }, 10); // עדיפות גבוהה
        jobs.push(priorityJob);
        console.log('✅ Priority job added:', priorityJob.id);

        // Job עם delay
        console.log('📝 Adding delayed job (5 seconds)...');
        const delayedJob = await storyQueue.add(
            'generate-story',
            {
                userId: testUser.id,
                childId: testChild.id,
                templateId: templates[2]?.id || 3,
                requestId: uuidv4()
            },
            {
                delay: 5000 // 5 שניות
            }
        );
        jobs.push(delayedJob);
        console.log('✅ Delayed job added:', delayedJob.id);

        // בדיקת סטטוס התור אחרי הוספה
        console.log('\n6️⃣ Queue status after adding jobs...');
        const statsAfterAdd = await getQueueStats();
        console.log('📊 Queue stats:', statsAfterAdd);

        // מעקב אחרי התקדמות
        console.log('\n7️⃣ Monitoring job progress...');

        let completedCount = 0;
        const startTime = Date.now();

        while (completedCount < jobs.length && (Date.now() - startTime) < 30000) { // timeout של 30 שניות
            await sleep(2000); // בדיקה כל 2 שניות

            console.log('\n📍 Checking job statuses...');

            for (const job of jobs) {
                const status = await getJobStatus(job.id!);
                if (status) {
                    console.log(`Job ${job.id}: ${status.state} (progress: ${status.progress || 0}%)`);

                    if (status.state === 'completed' || status.state === 'failed') {
                        completedCount++;
                    }
                }
            }

            const currentStats = await getQueueStats();
            console.log('📊 Current queue:', {
                waiting: currentStats.counts.waiting,
                active: currentStats.counts.active,
                completed: currentStats.counts.completed,
                failed: currentStats.counts.failed,
                delayed: currentStats.counts.delayed
            });
        }

        // תוצאות סופיות
        console.log('\n8️⃣ Final results...');

        for (const job of jobs) {
            const finalStatus = await getJobStatus(job.id!);
            if (finalStatus) {
                console.log(`\nJob ${job.id}:`);
                console.log(`- State: ${finalStatus.state}`);
                console.log(`- Created: ${finalStatus.createdAt}`);
                console.log(`- Processed: ${finalStatus.processedAt || 'N/A'}`);
                console.log(`- Completed: ${finalStatus.completedAt || 'N/A'}`);

                if (finalStatus.state === 'failed') {
                    console.log(`- Failed reason: ${finalStatus.failedReason}`);
                }

                if (finalStatus.state === 'completed') {
                    const job = await storyQueue.getJob(finalStatus.id!);
                    if (job) {
                        const returnValue = job.returnvalue;
                        if (returnValue) {
                            console.log(`- Story ID: ${returnValue.storyId}`);
                            console.log(`- Processing time: ${returnValue.processingTime}ms`);
                        }
                    }
                }
            }
        }

        // סטטיסטיקות סופיות
        console.log('\n9️⃣ Final queue statistics...');
        const finalStats = await getQueueStats();
        console.log('📊 Final stats:', finalStats);

        console.log('\n🎉 BullMQ test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        console.log('\n🧹 Cleaning up...');

        // עצירת Worker
        await stopStoryWorker();

        // סגירת QueueEvents
        if (queueEvents) {
            await queueEvents.close();
        }

        // סגירת חיבורים
        await closeQueues();
        await disconnectDatabase();
        await disconnectRedis();

        console.log('✅ Cleanup completed');
    }
};

// הפעלת הבדיקה
testBullMQ();