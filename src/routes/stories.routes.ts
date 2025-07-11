import { Router } from 'express';
import { StoriesController } from '../controllers/stories.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { storyGenerationLimiter, createDynamicLimiter } from '../config/rateLimiter';

/**
 * Stories Routes - נתיבי סיפורים
 * 
 * רוב הנתיבים דורשים אימות
 * תבניות הסיפורים זמינות לכולם
 */

const router = Router();

// Rate limiter לקריאת תבניות
const templateReadLimiter = createDynamicLimiter({
    windowMs: 5 * 60 * 1000,      // 5 דקות
    maxForUser: 100,              // משתמשים רשומים
    maxForGuest: 20,              // אורחים
    resource: 'template-read'
});

// נתיבים ציבוריים (לא דורשים אימות) + CACHE + RATE LIMIT
router.get('/templates', templateReadLimiter, cacheMiddleware(600), StoriesController.getTemplates);
router.get('/templates/meta', templateReadLimiter, cacheMiddleware(1800), StoriesController.getTemplatesMeta);

// נתיבים מוגנים (דורשים אימות)
router.use(authenticateToken);

// נתיבים מיוחדים (צריכים להיות לפני /:id) + CACHE
router.get('/stats', cacheMiddleware(60), StoriesController.getStoriesStats);
router.get('/status/:requestId', StoriesController.getStoryGenerationStatus);
router.get('/pending', StoriesController.getPendingStories);
router.get('/child/:childId', cacheMiddleware(120), StoriesController.getStoriesForChild);
router.get('/recommendations/:childId', cacheMiddleware(300), StoriesController.getRecommendations);

// נתיבים כלליים
router.post('/', storyGenerationLimiter, StoriesController.generateStory); // עם RATE LIMIT!
router.get('/', cacheMiddleware(60), StoriesController.getUserStories);
router.get('/:id', cacheMiddleware(300), StoriesController.getStoryById);
router.delete('/:id', StoriesController.deleteStory);

export default router;