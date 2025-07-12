import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { storyQueue, getQueueStats } from '../queues/storyQueue';

/**
 * Bull Board Configuration
 * 
 * UI לניטור תורי BullMQ
 */

// יצירת Express adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// יצירת Bull Board
const bullBoard = createBullBoard({
    queues: [
        new BullMQAdapter(storyQueue, {
            readOnlyMode: false, // מאפשר ניהול מלא
            description: 'Story Generation Queue',
        }),
        // בעתיד אפשר להוסיף תורים נוספים:
        // new BullMQAdapter(imageQueue),
        // new BullMQAdapter(emailQueue),
    ],
    serverAdapter: serverAdapter,
    options: {
        uiConfig: {
            boardTitle: 'Kids Story App - Queue Monitor',
            boardLogo: {
                path: 'https://raw.githubusercontent.com/felixmosh/bull-board/master/packages/ui/src/static/images/logo.svg',
                width: '100px',
                height: 50,
            },
            miscLinks: [
                {
                    text: 'Back to API',
                    url: '/',
                },
                {
                    text: 'System Health',
                    url: '/api/system/health',
                },
            ],
        },
    },
});

// Export the router
export const bullBoardRouter = serverAdapter.getRouter();

// Export פונקציות עזר
export const getBullBoardStats = async () => {
    // מחזירים ישירות את הסטטיסטיקות מהתור
    const stats = await getQueueStats();

    return [{
        name: 'story-generation',
        counts: stats.counts,
    }];
};