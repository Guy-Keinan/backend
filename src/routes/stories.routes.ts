import { Router } from 'express';
import { StoriesController } from '../controllers/stories.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

/**
 * Stories Routes - נתיבי סיפורים
 * 
 * רוב הנתיבים דורשים אימות
 * תבניות הסיפורים זמינות לכולם
 */

const router = Router();

// נתיבים ציבוריים (לא דורשים אימות) + CACHE
router.get('/templates', cacheMiddleware(600), StoriesController.getTemplates); // 10 דקות cache
router.get('/templates/meta', cacheMiddleware(1800), StoriesController.getTemplatesMeta); // 30 דקות cache

// נתיבים מוגנים (דורשים אימות)
router.use(authenticateToken);

// נתיבים מיוחדים (צריכים להיות לפני /:id) + CACHE
router.get('/stats', cacheMiddleware(60), StoriesController.getStoriesStats); // 1 דקה cache
router.get('/child/:childId', cacheMiddleware(120), StoriesController.getStoriesForChild); // 2 דקות cache
router.get('/recommendations/:childId', cacheMiddleware(300), StoriesController.getRecommendations); // 5 דקות cache

// נתיבים כלליים
router.post('/', StoriesController.generateStory); // לא cache - זה create
router.get('/', cacheMiddleware(60), StoriesController.getUserStories); // 1 דקה cache
router.get('/:id', cacheMiddleware(300), StoriesController.getStoryById); // 5 דקות cache
router.delete('/:id', StoriesController.deleteStory); // לא cache - זה delete

export default router;