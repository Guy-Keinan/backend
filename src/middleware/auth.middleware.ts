import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';
import { UserService } from '../services/user.service';

/**
 * Authentication Middleware - הגנה על נתיבים
 * 
 * Middleware זה בודק:
 * 1. שיש header Authorization
 * 2. שהטוקן תקף
 * 3. שהמשתמש קיים ופעיל
 * 4. מוסיף את פרטי המשתמש לrequest
 */

// הרחבת טייפ Request לכלול user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number;
                email: string;
                firstName: string;
                lastName: string;
            };
        }
    }
}

export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // חילוץ הטוקן מheader Authorization
        const authHeader = req.headers.authorization;
        const token = JwtService.extractTokenFromHeader(authHeader);

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token required'
            });
            return;
        }

        // אימות הטוקן
        const decodedToken = JwtService.verifyToken(token);

        // בדיקה שהמשתמש עדיין קיים ופעיל
        const user = await UserService.getUserById(decodedToken.userId);

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: 'Account is disabled'
            });
            return;
        }

        // הוספת פרטי המשתמש לrequest
        req.user = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        };

        // מעבר לhandler הבא
        next();

    } catch (error) {
        console.error('Authentication error:', error);

        const errorMessage = (error as Error).message;

        // טיפול בשגיאות טוקן
        if (errorMessage.includes('expired')) {
            res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
            return;
        }

        if (errorMessage.includes('Invalid token')) {
            res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

/**
 * Optional Authentication Middleware
 * 
 * עבור endpoints שיכולים לעבוד עם או בלי אימות
 * אם יש טוקן - מוסיף את פרטי המשתמש
 * אם אין - ממשיך בלי שגיאה
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = JwtService.extractTokenFromHeader(authHeader);

        if (token) {
            try {
                const decodedToken = JwtService.verifyToken(token);
                const user = await UserService.getUserById(decodedToken.userId);

                if (user && user.isActive) {
                    req.user = {
                        userId: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName
                    };
                }
            } catch (error) {
                // אם הטוקן לא תקף, פשוט ממשיכים בלי משתמש
                console.warn('Optional auth failed:', (error as Error).message);
            }
        }

        next();

    } catch (error) {
        console.error('Optional auth error:', error);
        next(); // ממשיכים גם במקרה של שגיאה
    }
};