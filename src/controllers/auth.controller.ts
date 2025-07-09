import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { JwtService } from '../services/jwt.service';

/**
 * Auth Controller - מטפל בבקשות אימות
 * 
 * Controller אחראי על:
 * - קבלת בקשות HTTP
 * - ולידציה של קלט
 * - קריאה לשירותים המתאימים
 * - החזרת תשובות HTTP מתאימות
 */

export class AuthController {

    /**
     * רישום משתמש חדש
     * POST /auth/register
     */
    static async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, firstName, lastName } = req.body;

            // ולידציה בסיסית
            if (!email || !password || !firstName || !lastName) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: email, password, firstName, lastName'
                });
                return;
            }

            // ולידציה מתקדמת
            if (password.length < 6) {
                res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
                return;
            }

            // יצירת המשתמש
            const newUser = await UserService.createUser({
                email,
                password,
                firstName,
                lastName
            });

            // יצירת טוקן JWT
            const token = JwtService.generateToken({
                userId: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: newUser,
                    token
                }
            });

        } catch (error) {
            console.error('Register error:', error);

            // טיפול בשגיאות ידועות
            if ((error as Error).message.includes('already exists')) {
                res.status(409).json({
                    success: false,
                    message: 'User with this email already exists'
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * התחברות משתמש
     * POST /auth/login
     */
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            // ולידציה בסיסית
            if (!email || !password) {
                res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
                return;
            }

            // אימות המשתמש
            const user = await UserService.authenticateUser({
                email,
                password
            });

            // יצירת טוקן JWT
            const token = JwtService.generateToken({
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user,
                    token
                }
            });

        } catch (error) {
            console.error('Login error:', error);

            const errorMessage = (error as Error).message;

            // טיפול בשגיאות אימות
            if (errorMessage.includes('Invalid email or password') ||
                errorMessage.includes('disabled')) {
                res.status(401).json({
                    success: false,
                    message: errorMessage
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * קבלת פרופיל המשתמש המחובר
     * GET /auth/profile
     * (דורש authentication)
     */
    static async getProfile(req: Request, res: Response): Promise<void> {
        try {
            // המידע על המשתמש יבוא מה-middleware (נוסיף בצעד הבא)
            const userId = (req as any).user?.userId;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const user = await UserService.getUserById(userId);

            if (!user) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: { user }
            });

        } catch (error) {
            console.error('Get profile error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * עדכון פרופיל המשתמש
     * PUT /auth/profile
     * (דורש authentication)
     */
    static async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.userId;
            const { firstName, lastName, password } = req.body;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            // ולידציה
            if (password && password.length < 6) {
                res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
                return;
            }

            const updateData: any = {};
            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;
            if (password) updateData.password = password;

            if (Object.keys(updateData).length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
                return;
            }

            const updatedUser = await UserService.updateUser(userId, updateData);

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: { user: updatedUser }
            });

        } catch (error) {
            console.error('Update profile error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}