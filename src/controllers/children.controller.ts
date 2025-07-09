import { Request, Response } from 'express';
import { ChildrenService } from '../services/children.service';
import { Gender } from '@prisma/client';

/**
 * Children Controller - מטפל בבקשות הקשורות לילדים
 */

export class ChildrenController {

    /**
     * יצירת ילד חדש
     * POST /children
     */
    static async createChild(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const { name, gender, age, hairColor, eyeColor, skinTone, photoUrl } = req.body;

            // ולידציה בסיסית
            if (!name || !gender) {
                res.status(400).json({
                    success: false,
                    message: 'Name and gender are required'
                });
                return;
            }

            // בדיקת gender תקין
            if (!Object.values(Gender).includes(gender)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid gender. Must be MALE, FEMALE, or OTHER'
                });
                return;
            }

            const newChild = await ChildrenService.createChild(userId, {
                name,
                gender,
                age,
                hairColor,
                eyeColor,
                skinTone,
                photoUrl
            });

            res.status(201).json({
                success: true,
                message: 'Child created successfully',
                data: { child: newChild }
            });

        } catch (error) {
            console.error('Create child error:', error);

            const errorMessage = (error as Error).message;

            if (errorMessage.includes('required') || errorMessage.includes('between')) {
                res.status(400).json({
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
     * קבלת כל הילדים של המשתמש
     * GET /children
     */
    static async getChildren(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const children = await ChildrenService.getChildrenByUserId(userId);

            res.status(200).json({
                success: true,
                data: {
                    children,
                    count: children.length
                }
            });

        } catch (error) {
            console.error('Get children error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * קבלת ילד ספציפי
     * GET /children/:id
     */
    static async getChildById(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const childIdParam = req.params.id;
            if (!childIdParam) {
                res.status(400).json({
                    success: false,
                    message: 'Child ID is required'
                });
                return;
            }

            const childId = parseInt(childIdParam);
            if (isNaN(childId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid child ID'
                });
                return;
            }

            const child = await ChildrenService.getChildById(childId, userId);

            if (!child) {
                res.status(404).json({
                    success: false,
                    message: 'Child not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: { child }
            });

        } catch (error) {
            console.error('Get child by ID error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * עדכון פרטי ילד
     * PUT /children/:id
     */
    static async updateChild(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const childIdParam = req.params.id;
            if (!childIdParam) {
                res.status(400).json({
                    success: false,
                    message: 'Child ID is required'
                });
                return;
            }

            const childId = parseInt(childIdParam);
            if (isNaN(childId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid child ID'
                });
                return;
            }

            const { name, gender, age, hairColor, eyeColor, skinTone, photoUrl } = req.body;

            // בדיקת gender אם סופק
            if (gender && !Object.values(Gender).includes(gender)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid gender. Must be MALE, FEMALE, or OTHER'
                });
                return;
            }

            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (gender !== undefined) updateData.gender = gender;
            if (age !== undefined) updateData.age = age;
            if (hairColor !== undefined) updateData.hairColor = hairColor;
            if (eyeColor !== undefined) updateData.eyeColor = eyeColor;
            if (skinTone !== undefined) updateData.skinTone = skinTone;
            if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

            if (Object.keys(updateData).length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No fields to update'
                });
                return;
            }

            const updatedChild = await ChildrenService.updateChild(childId, userId, updateData);

            res.status(200).json({
                success: true,
                message: 'Child updated successfully',
                data: { child: updatedChild }
            });

        } catch (error) {
            console.error('Update child error:', error);

            const errorMessage = (error as Error).message;

            if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
                res.status(404).json({
                    success: false,
                    message: 'Child not found'
                });
                return;
            }

            if (errorMessage.includes('between') || errorMessage.includes('empty')) {
                res.status(400).json({
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
     * מחיקת ילד
     * DELETE /children/:id
     */
    static async deleteChild(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const childIdParam = req.params.id;
            if (!childIdParam) {
                res.status(400).json({
                    success: false,
                    message: 'Child ID is required'
                });
                return;
            }

            const childId = parseInt(childIdParam);
            if (isNaN(childId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid child ID'
                });
                return;
            }

            await ChildrenService.deleteChild(childId, userId);

            res.status(200).json({
                success: true,
                message: 'Child deleted successfully'
            });

        } catch (error) {
            console.error('Delete child error:', error);

            const errorMessage = (error as Error).message;

            if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
                res.status(404).json({
                    success: false,
                    message: 'Child not found'
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
     * קבלת סטטיסטיקות על הילדים
     * GET /children/stats
     */
    static async getChildrenStats(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const stats = await ChildrenService.getUserChildrenStats(userId);

            res.status(200).json({
                success: true,
                data: { stats }
            });

        } catch (error) {
            console.error('Get children stats error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}