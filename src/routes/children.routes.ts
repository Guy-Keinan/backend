import { Router } from 'express';
import { ChildrenController } from '../controllers/children.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * Children Routes - נתיבי ילדים
 * 
 * כל הנתיבים דורשים אימות
 * משתמש יכול לגשת רק לילדים שלו
 */

const router = Router();

// כל הנתיבים דורשים אימות
router.use(authenticateToken);

// נתיבי ילדים
router.get('/stats', ChildrenController.getChildrenStats); // צריך להיות לפני /:id
router.post('/', ChildrenController.createChild);
router.get('/', ChildrenController.getChildren);
router.get('/:id', ChildrenController.getChildById);
router.put('/:id', ChildrenController.updateChild);
router.delete('/:id', ChildrenController.deleteChild);

export default router;