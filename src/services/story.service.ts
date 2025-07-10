import { prisma } from '../config/prisma';
import { Story, Child, StoryTemplate, Gender } from '@prisma/client';
import { StoryTemplateService } from './storyTemplate.service';
import { ChildrenService } from './children.service';

/**
 * Story Service - שירות ליצירת וניהול סיפורים מותאמים אישית
 * 
 * התהליך:
 * 1. קבלת תבנית סיפור
 * 2. קבלת פרטי הילד
 * 3. בחירת גרסה לפי מגדר
 * 4. החלפת placeholders
 * 5. יצירת הסיפור הסופי
 */

export interface GenerateStoryData {
    templateId: number;
    childId: number;
}

export interface GeneratedStoryContent {
    title: string;
    content: string;
    originalTemplate: StoryTemplate;
    childData: Child;
    placeholdersUsed: Record<string, string>;
}

export class StoryService {

    /**
     * יצירת סיפור מותאם אישית
     */
    static async generateStory(
        userId: number,
        generateData: GenerateStoryData
    ): Promise<Story> {
        const { templateId, childId } = generateData;

        // בדיקה שהתבנית קיימת
        const template = await StoryTemplateService.getTemplateById(templateId);
        if (!template) {
            throw new Error('Story template not found');
        }

        // בדיקה שהילד קיים ושייך למשתמש
        const child = await ChildrenService.getChildById(childId, userId);
        if (!child) {
            throw new Error('Child not found or access denied');
        }

        // יצירת התוכן המותאם
        const storyContent = this.createPersonalizedContent(template, child);

        // שמירה בבסיס הנתונים
        const newStory = await prisma.story.create({
            data: {
                userId,
                childId,
                storyTemplateId: templateId,
                title: storyContent.title,
                content: storyContent as any, // Cast לJSON
                generationStatus: 'completed'
            }
        });

        return newStory;
    }

    /**
     * יצירת תוכן מותאם אישית
     */
    private static createPersonalizedContent(
        template: StoryTemplate,
        child: Child
    ): GeneratedStoryContent {
        // בחירת גרסה לפי מגדר
        const storyText = child.gender === Gender.FEMALE
            ? template.femaleVersion
            : template.maleVersion;

        // הכנת מילון placeholders
        const placeholders = this.buildPlaceholdersMap(child);

        // החלפת placeholders בטקסט
        let personalizedContent = storyText;
        Object.entries(placeholders).forEach(([placeholder, value]) => {
            const pattern = new RegExp(`{${placeholder}}`, 'g');
            personalizedContent = personalizedContent.replace(pattern, value);
        });

        // יצירת כותרת מותאמת
        const personalizedTitle = this.personalizeTitle(template.title, child);

        return {
            title: personalizedTitle,
            content: personalizedContent,
            originalTemplate: template,
            childData: child,
            placeholdersUsed: placeholders
        };
    }

    /**
     * בניית מילון placeholders
     */
    private static buildPlaceholdersMap(child: Child): Record<string, string> {
        const placeholders: Record<string, string> = {
            'CHILD_NAME': child.name,
            'AGE': child.age?.toString() || 'צעיר',
            'HAIR_COLOR': child.hairColor || 'יפה',
            'EYE_COLOR': child.eyeColor || 'מבריק',
            'SKIN_TONE': child.skinTone || 'יפה'
        };

        // הוספת placeholders מותנים במגדר
        if (child.gender === Gender.FEMALE) {
            placeholders['GENDER_CHILD'] = 'ילדה';
            placeholders['GENDER_BEAUTIFUL'] = 'יפה';
            placeholders['GENDER_SMART'] = 'חכמה';
            placeholders['GENDER_BRAVE'] = 'אמיצה';
        } else {
            placeholders['GENDER_CHILD'] = 'ילד';
            placeholders['GENDER_BEAUTIFUL'] = 'יפה';
            placeholders['GENDER_SMART'] = 'חכם';
            placeholders['GENDER_BRAVE'] = 'אמיץ';
        }

        return placeholders;
    }

    /**
     * התאמת כותרת לילד
     */
    private static personalizeTitle(originalTitle: string, child: Child): string {
        // החלפה פשוטה של "הילד/הילדה" לשם הילד
        let personalizedTitle = originalTitle;

        if (child.gender === Gender.FEMALE) {
            personalizedTitle = personalizedTitle
                .replace(/הילד/g, child.name)
                .replace(/ילד/g, child.name);
        } else {
            personalizedTitle = personalizedTitle
                .replace(/הילד/g, child.name)
                .replace(/ילד/g, child.name);
        }

        return personalizedTitle;
    }

    /**
     * קבלת כל הסיפורים של משתמש
     */
    static async getUserStories(userId: number) {
        const stories = await prisma.story.findMany({
            where: { userId },
            include: {
                child: true,
                storyTemplate: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return stories;
    }

    /**
     * קבלת סיפור ספציפי
     */
    static async getStoryById(storyId: number, userId: number) {
        const story = await prisma.story.findFirst({
            where: {
                id: storyId,
                userId
            },
            include: {
                child: true,
                storyTemplate: true
            }
        });

        return story;
    }

    /**
     * קבלת סיפורים של ילד ספציפי
     */
    static async getStoriesForChild(childId: number, userId: number) {
        // בדיקה שהילד שייך למשתמש
        const child = await ChildrenService.getChildById(childId, userId);
        if (!child) {
            throw new Error('Child not found or access denied');
        }

        const stories = await prisma.story.findMany({
            where: {
                childId,
                userId
            },
            include: {
                storyTemplate: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return stories;
    }

    /**
     * מחיקת סיפור
     */
    static async deleteStory(storyId: number, userId: number): Promise<void> {
        const story = await this.getStoryById(storyId, userId);
        if (!story) {
            throw new Error('Story not found or access denied');
        }

        await prisma.story.delete({
            where: { id: storyId }
        });
    }

    /**
     * סטטיסטיקות סיפורים
     */
    static async getUserStoriesStats(userId: number) {
        const stories = await this.getUserStories(userId);

        const stats = {
            totalStories: stories.length,
            byChild: {} as Record<string, number>,
            byCategory: {} as Record<string, number>,
            byTemplate: {} as Record<string, number>,
            recentStories: stories.slice(0, 5).map(s => ({
                id: s.id,
                title: s.title,
                childName: s.child?.name,
                createdAt: s.createdAt
            }))
        };

        // ספירה לפי ילד
        stories.forEach(story => {
            const childName = story.child?.name || 'Unknown';
            stats.byChild[childName] = (stats.byChild[childName] || 0) + 1;
        });

        // ספירה לפי קטגוריה
        stories.forEach(story => {
            if (story.storyTemplate) {
                const category = story.storyTemplate.category;
                stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
            }
        });

        // ספירה לפי תבנית
        stories.forEach(story => {
            if (story.storyTemplate) {
                const templateTitle = story.storyTemplate.title;
                stats.byTemplate[templateTitle] = (stats.byTemplate[templateTitle] || 0) + 1;
            }
        });

        return stats;
    }

    /**
     * הצעת תבניות מתאימות לילד
     */
    static async getRecommendedTemplatesForChild(
        childId: number,
        userId: number
    ): Promise<StoryTemplate[]> {
        const child = await ChildrenService.getChildById(childId, userId);
        if (!child) {
            throw new Error('Child not found or access denied');
        }

        // לוגיקת המלצות פשוטה - לפי גיל
        let ageGroup = '3-6'; // ברירת מחדל

        if (child.age) {
            if (child.age <= 4) {
                ageGroup = '3-5';
            } else if (child.age <= 6) {
                ageGroup = '3-6';
            } else if (child.age <= 8) {
                ageGroup = '4-7';
            } else {
                ageGroup = '7-10';
            }
        }

        const recommendedTemplates = await StoryTemplateService.getTemplatesByAgeGroup(ageGroup);

        // אפשר להוסיף לוגיקה מתקדמת יותר לבדוק אילו סיפורים כבר נוצרו
        return recommendedTemplates;
    }

    // הוסף את הפונקציות האלה ל-StoryService class ב-src/services/story.service.ts

    /**
     * יצירת רשומת סיפור עם סטטוס "pending" לעיבוד בתור
     */
    static async createPendingStory(
        userId: number,
        generateData: GenerateStoryData,
        requestId: string
    ): Promise<Story> {
        const { templateId, childId } = generateData;

        // בדיקה שהתבנית קיימת
        const template = await StoryTemplateService.getTemplateById(templateId);
        if (!template) {
            throw new Error('Story template not found');
        }

        // בדיקה שהילד קיים ושייך למשתמש
        const child = await ChildrenService.getChildById(childId, userId);
        if (!child) {
            throw new Error('Child not found or access denied');
        }

        // יצירת רשומת סיפור עם סטטוס pending
        const pendingStory = await prisma.story.create({
            data: {
                userId,
                childId,
                storyTemplateId: templateId,
                title: `${template.title} - ${child.name}`, // כותרת זמנית
                content: {
                    status: 'pending',
                    requestId,
                    createdAt: new Date(),
                    template: {
                        id: template.id,
                        title: template.title,
                        category: template.category
                    },
                    child: {
                        id: child.id,
                        name: child.name,
                        gender: child.gender
                    }
                },
                generationStatus: 'pending'
            },
            include: {
                child: true,
                storyTemplate: true
            }
        });

        return pendingStory;
    }

    /**
     * קבלת סיפור לפי requestId
     */
    static async getStoryByRequestId(requestId: string, userId: number) {
        const story = await prisma.story.findFirst({
            where: {
                userId,
                content: {
                    path: ['requestId'],
                    equals: requestId
                }
            },
            include: {
                child: true,
                storyTemplate: true
            }
        });

        return story;
    }

    /**
     * עדכון סטטוס יצירת סיפור
     */
    static async updateStoryGenerationStatus(
        storyId: number,
        status: 'pending' | 'processing' | 'completed' | 'failed',
        additionalData?: any
    ): Promise<Story> {
        const currentStory = await prisma.story.findUnique({
            where: { id: storyId }
        });

        if (!currentStory) {
            throw new Error('Story not found');
        }

        const updatedStory = await prisma.story.update({
            where: { id: storyId },
            data: {
                generationStatus: status,
                content: {
                    ...(currentStory.content as any),
                    ...additionalData,
                    lastUpdated: new Date()
                }
            }
        });

        return updatedStory;
    }

    /**
     * קבלת סיפורים לפי סטטוס
     */
    static async getStoriesByStatus(userId: number, status: string) {
        const stories = await prisma.story.findMany({
            where: {
                userId,
                generationStatus: status
            },
            include: {
                child: true,
                storyTemplate: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return stories;
    }
}