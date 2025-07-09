import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * Auth Routes - נתיבי אימות
 * 
 * מגדיר את כל הנתיבים הקשורים לאימות:
 * - POST /auth/register - רישום
 * - POST /auth/login - התחברות  
 * - GET /auth/profile - קבלת פרופיל (דורש אימות)
 * - PUT /auth/profile - עדכון פרופיל (דורש אימות)
 */

const router = Router();

// נתיבים ציבוריים (לא דורשים אימות)
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// נתיבים מוגנים (דורשים אימות)
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);

export default router;