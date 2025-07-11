import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { authLimiter } from '../config/rateLimiter';

/**
 * Auth Routes - נתיבי אימות
 * 
 * מגדיר את כל הנתיבים הקשורים לאימות:
 * - POST /auth/register - רישום (עם rate limiting)
 * - POST /auth/login - התחברות (עם rate limiting)
 * - GET /auth/profile - קבלת פרופיל (דורש אימות)
 * - PUT /auth/profile - עדכון פרופיל (דורש אימות)
 */

const router = Router();

// נתיבים ציבוריים עם Rate Limiting
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);

// נתיבים מוגנים (דורשים אימות)
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);

export default router;