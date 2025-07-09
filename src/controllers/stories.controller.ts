import { Request, Response } from 'express';
import { StoryService } from '../services/story.service';
import { StoryTemplateService } from '../services/storyTemplate.service';

/**
 * Stories Controller - מטפל בבקשות הקשורות לסיפורים
 */

export class StoriesController {

    /**
     * יצירת סיפור חדש
     * POST /stories
     */
    static async generateStory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const { templateId, childId } = req.body;

            // ולידציה בסיסית
            if (!templateId || !childId) {
                res.status(400).json({
                    success: false,
                    message: 'Template ID and Child ID are required'
                });
                return;
            }

            // בדיקה שהערכים הם מספרים
            const parsedTemplateId = parseInt(templateId);
            const parsedChildId = parseInt(childId);

            if (isNaN(parsedTemplateId) || isNaN(parsedChildId)) {
                res.status(400).json({
                    success: false,
                    message: 'Template ID and Child ID must be numbers'
                });
                return;
            }

            const newStory = await StoryService.generateStory(userId, {
                templateId: parsedTemplateId,
                childId: parsedChildId
            });

            res.status(201).json({
                success: true,
                message: 'Story generated successfully',
                data: { story: newStory }
            });

        } catch (error) {
            console.error('Generate story error:', error);

            const errorMessage = (error as Error).message;

            if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
                res.status(404).json({
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
     * קבלת כל הסיפורים של המשתמש
     * GET /stories
     */
    static async getUserStories(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const stories = await StoryService.getUserStories(userId);

            res.status(200).json({
                success: true,
                data: {
                    stories,
                    count: stories.length
                }
            });

        } catch (error) {
            console.error('Get user stories error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * קבלת סיפור ספציפי
     * GET /stories/:id
     */
    static async getStoryById(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const storyIdParam = req.params.id;
            if (!storyIdParam) {
                res.status(400).json({
                    success: false,
                    message: 'Story ID is required'
                });
                return;
            }

            const storyId = parseInt(storyIdParam);
            if (isNaN(storyId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid story ID'
                });
                return;
            }

            const story = await StoryService.getStoryById(storyId, userId);

            if (!story) {
                res.status(404).json({
                    success: false,
                    message: 'Story not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: { story }
            });

        } catch (error) {
            console.error('Get story by ID error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * קבלת סיפורים של ילד ספציפי
     * GET /stories/child/:childId
     */
    static async getStoriesForChild(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const childIdParam = req.params.childId;
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

            const stories = await StoryService.getStoriesForChild(childId, userId);

            res.status(200).json({
                success: true,
                data: {
                    stories,
                    count: stories.length,
                    childId
                }
            });

        } catch (error) {
            console.error('Get stories for child error:', error);

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
     * מחיקת סיפור
     * DELETE /stories/:id
     */
    static async deleteStory(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const storyIdParam = req.params.id;
            if (!storyIdParam) {
                res.status(400).json({
                    success: false,
                    message: 'Story ID is required'
                });
                return;
            }

            const storyId = parseInt(storyIdParam);
            if (isNaN(storyId)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid story ID'
                });
                return;
            }

            await StoryService.deleteStory(storyId, userId);

            res.status(200).json({
                success: true,
                message: 'Story deleted successfully'
            });

        } catch (error) {
            console.error('Delete story error:', error);

            const errorMessage = (error as Error).message;

            if (errorMessage.includes('not found') || errorMessage.includes('access denied')) {
                res.status(404).json({
                    success: false,
                    message: 'Story not found'
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
     * קבלת סטטיסטיקות סיפורים
     * GET /stories/stats
     */
    static async getStoriesStats(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const stats = await StoryService.getUserStoriesStats(userId);

            res.status(200).json({
                success: true,
                data: { stats }
            });

        } catch (error) {
            console.error('Get stories stats error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * קבלת המלצות תבניות לילד
     * GET /stories/recommendations/:childId
     */
    static async getRecommendations(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const childIdParam = req.params.childId;
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

            const recommendations = await StoryService.getRecommendedTemplatesForChild(childId, userId);

            res.status(200).json({
                success: true,
                data: {
                    templates: recommendations,
                    count: recommendations.length,
                    childId
                }
            });

        } catch (error) {
            console.error('Get recommendations error:', error);

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
     * קבלת כל תבניות הסיפורים הזמינות
     * GET /stories/templates
     */
    static async getTemplates(req: Request, res: Response): Promise<void> {
        try {
            const { category, ageGroup, language } = req.query;

            const filters: any = {};
            if (category && typeof category === 'string') filters.category = category;
            if (ageGroup && typeof ageGroup === 'string') filters.ageGroup = ageGroup;
            if (language && typeof language === 'string') filters.language = language;

            const templates = await StoryTemplateService.getTemplates(filters);

            res.status(200).json({
                success: true,
                data: {
                    templates,
                    count: templates.length,
                    filters: filters
                }
            });

        } catch (error) {
            console.error('Get templates error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * קבלת קטגוריות וקבוצות גיל זמינות
     * GET /stories/templates/meta
     */
    static async getTemplatesMeta(req: Request, res: Response): Promise<void> {
        try {
            const categories = await StoryTemplateService.getAvailableCategories();
            const ageGroups = await StoryTemplateService.getAvailableAgeGroups();
            const stats = await StoryTemplateService.getTemplatesStats();

            res.status(200).json({
                success: true,
                data: {
                    categories,
                    ageGroups,
                    stats
                }
            });

        } catch (error) {
            console.error('Get templates meta error:', error);

            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}