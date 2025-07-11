import { Router } from 'express';
import authRoutes from './auth.routes';
import childrenRoutes from './children.routes';
import storiesRoutes from './stories.routes';
import systemRoutes from './system.routes';

/**
 * מרכז הנתיבים - מחבר את כל ה-routes
 * 
 * כל נתיב מקבל prefix:
 * - /api/auth - נתיבי אימות
 * - /api/children - נתיבי ילדים
 * - /api/stories - נתיבי סיפורים
 * - /api/system - נתיבי מערכת
 */

const router = Router();

// חיבור נתיבי אימות
router.use('/auth', authRoutes);

// חיבור נתיבי ילדים
router.use('/children', childrenRoutes);

// חיבור נתיבי סיפורים
router.use('/stories', storiesRoutes);

// חיבור נתיבי מערכת
router.use('/system', systemRoutes);

// נתיב בדיקה למרכז הנתיבים
router.get('/', (req, res) => {
    res.json({
        message: 'Kids Story API Routes',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            children: '/api/children',
            stories: '/api/stories',
            system: '/api/system',
            health: '/health'
        }
    });
});

export default router;