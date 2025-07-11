import { prisma } from '../config/prisma';
import { StoryTemplate } from '@prisma/client';
import { CacheService } from './cache.service';

/**
 * Story Template Service - שירות לניהול תבניות סיפורים
 * 
 * כל תבנית מכילה:
 * - גרסה לזכר וגרסה לנקבה
 * - placeholders שיוחלפו בפרטי הילד
 * - מטא-דטה (קטגוריה, גיל יעד וכו')
 */

export interface CreateStoryTemplateData {
    title: string;
    description?: string;
    category: string;
    ageGroup: string;
    maleVersion: string;
    femaleVersion: string;
    placeholders: string[];
    language?: string;
}

export interface StoryTemplateFilters {
    category?: string;
    ageGroup?: string;
    language?: string;
}

export class StoryTemplateService {

    /**
     * יצירת תבנית סיפור חדשה
     */
    static async createTemplate(templateData: CreateStoryTemplateData): Promise<StoryTemplate> {
        const {
            title,
            description,
            category,
            ageGroup,
            maleVersion,
            femaleVersion,
            placeholders,
            language = 'he'
        } = templateData;

        // ולידציה בסיסית
        if (!title || !maleVersion || !femaleVersion) {
            throw new Error('Title, male version, and female version are required');
        }

        if (maleVersion.trim().length === 0 || femaleVersion.trim().length === 0) {
            throw new Error('Story versions cannot be empty');
        }

        const newTemplate = await prisma.storyTemplate.create({
            data: {
                title: title.trim(),
                description: description?.trim() || null,
                category: category.trim(),
                ageGroup: ageGroup.trim(),
                language,
                maleVersion: maleVersion.trim(),
                femaleVersion: femaleVersion.trim(),
                placeholders: placeholders || []
            }
        });

        return newTemplate;
    }

    /**
     * קבלת כל התבניות עם אפשרות סינון
     */
    static async getTemplates(filters: StoryTemplateFilters = {}): Promise<StoryTemplate[]> {
        const { category, ageGroup, language } = filters;

        const whereClause: any = {
            isActive: true
        };

        if (category) {
            whereClause.category = category;
        }

        if (ageGroup) {
            whereClause.ageGroup = ageGroup;
        }

        if (language) {
            whereClause.language = language;
        }

        const templates = await prisma.storyTemplate.findMany({
            where: whereClause,
            orderBy: [
                { category: 'asc' },
                { title: 'asc' }
            ]
        });

        return templates;
    }

    /**
     * קבלת תבנית לפי ID
     */
    static async getTemplateById(templateId: number): Promise<StoryTemplate | null> {
        const cacheKey = `story-template:${templateId}`;

        return CacheService.getOrSet(
            cacheKey,
            async () => {
                const template = await prisma.storyTemplate.findFirst({
                    where: {
                        id: templateId,
                        isActive: true
                    }
                });
                return template;
            },
            3600 // שעה
        );
    }

    /**
     * קבלת תבניות לפי קטגוריה
     */
    static async getTemplatesByCategory(category: string): Promise<StoryTemplate[]> {
        return this.getTemplates({ category });
    }

    /**
     * קבלת תבניות לפי גיל
     */
    static async getTemplatesByAgeGroup(ageGroup: string): Promise<StoryTemplate[]> {
        return this.getTemplates({ ageGroup });
    }

    /**
     * קבלת כל הקטגוריות הזמינות
     */
    static async getAvailableCategories(): Promise<string[]> {
        const result = await prisma.storyTemplate.findMany({
            where: { isActive: true },
            select: { category: true },
            distinct: ['category'],
            orderBy: { category: 'asc' }
        });

        return result.map(item => item.category);
    }

    /**
     * קבלת כל קבוצות הגיל הזמינות
     */
    static async getAvailableAgeGroups(): Promise<string[]> {
        const result = await prisma.storyTemplate.findMany({
            where: { isActive: true },
            select: { ageGroup: true },
            distinct: ['ageGroup'],
            orderBy: { ageGroup: 'asc' }
        });

        return result.map(item => item.ageGroup);
    }

    /**
     * עדכון תבנית סיפור
     */
    static async updateTemplate(
        templateId: number,
        updateData: Partial<CreateStoryTemplateData>
    ): Promise<StoryTemplate> {
        const existingTemplate = await this.getTemplateById(templateId);
        if (!existingTemplate) {
            throw new Error('Story template not found');
        }

        const dataToUpdate: any = {};

        if (updateData.title !== undefined) {
            if (updateData.title.trim().length === 0) {
                throw new Error('Title cannot be empty');
            }
            dataToUpdate.title = updateData.title.trim();
        }

        if (updateData.description !== undefined) {
            dataToUpdate.description = updateData.description?.trim() || null;
        }

        if (updateData.category !== undefined) {
            dataToUpdate.category = updateData.category.trim();
        }

        if (updateData.ageGroup !== undefined) {
            dataToUpdate.ageGroup = updateData.ageGroup.trim();
        }

        if (updateData.maleVersion !== undefined) {
            if (updateData.maleVersion.trim().length === 0) {
                throw new Error('Male version cannot be empty');
            }
            dataToUpdate.maleVersion = updateData.maleVersion.trim();
        }

        if (updateData.femaleVersion !== undefined) {
            if (updateData.femaleVersion.trim().length === 0) {
                throw new Error('Female version cannot be empty');
            }
            dataToUpdate.femaleVersion = updateData.femaleVersion.trim();
        }

        if (updateData.placeholders !== undefined) {
            dataToUpdate.placeholders = updateData.placeholders;
        }

        if (updateData.language !== undefined) {
            dataToUpdate.language = updateData.language;
        }

        const updatedTemplate = await prisma.storyTemplate.update({
            where: { id: templateId },
            data: dataToUpdate
        });

        // מחיקת cache
        await CacheService.invalidateStoryTemplates();

        return updatedTemplate;
    }

    /**
     * מחיקת תבנית (soft delete)
     */
    static async deleteTemplate(templateId: number): Promise<void> {
        const existingTemplate = await this.getTemplateById(templateId);
        if (!existingTemplate) {
            throw new Error('Story template not found');
        }

        await prisma.storyTemplate.update({
            where: { id: templateId },
            data: { isActive: false }
        });
    }

    /**
     * ספירת תבניות
     */
    static async getTemplatesCount(filters: StoryTemplateFilters = {}): Promise<number> {
        const { category, ageGroup, language } = filters;

        const whereClause: any = {
            isActive: true
        };

        if (category) whereClause.category = category;
        if (ageGroup) whereClause.ageGroup = ageGroup;
        if (language) whereClause.language = language;

        const count = await prisma.storyTemplate.count({
            where: whereClause
        });

        return count;
    }

    /**
     * קבלת סטטיסטיקות על התבניות
     */
    static async getTemplatesStats() {
        const totalTemplates = await this.getTemplatesCount();
        const categories = await this.getAvailableCategories();
        const ageGroups = await this.getAvailableAgeGroups();

        // ספירה לפי קטגוריה
        const byCategory: Record<string, number> = {};
        for (const category of categories) {
            byCategory[category] = await this.getTemplatesCount({ category });
        }

        // ספירה לפי גיל
        const byAgeGroup: Record<string, number> = {};
        for (const ageGroup of ageGroups) {
            byAgeGroup[ageGroup] = await this.getTemplatesCount({ ageGroup });
        }

        return {
            totalTemplates,
            categories: categories.length,
            ageGroups: ageGroups.length,
            byCategory,
            byAgeGroup
        };
    }
}