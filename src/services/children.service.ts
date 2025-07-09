import { prisma } from '../config/prisma';
import { Child, Gender } from '@prisma/client';

/**
 * Children Service - שירות לניהול ילדים
 * 
 * כל משתמש יכול להיות לו מספר ילדים
 * כל ילד שייך למשתמש אחד בלבד
 * המידע על הילד משמש ליצירת סיפורים מותאמים אישית
 */

export interface CreateChildData {
    name: string;
    gender: Gender;
    age?: number;
    hairColor?: string;
    eyeColor?: string;
    skinTone?: string;
    photoUrl?: string;
}

export interface UpdateChildData extends Partial<CreateChildData> { }

export class ChildrenService {

    /**
     * יצירת ילד חדש
     */
    static async createChild(userId: number, childData: CreateChildData): Promise<Child> {
        const { name, gender, age, hairColor, eyeColor, skinTone, photoUrl } = childData;

        // בדיקה שהשם לא ריק
        if (!name || name.trim().length === 0) {
            throw new Error('Child name is required');
        }

        // בדיקת גיל תקין
        if (age !== undefined && (age < 0 || age > 18)) {
            throw new Error('Age must be between 0 and 18');
        }

        const newChild = await prisma.child.create({
            data: {
                userId,
                name: name.trim(),
                gender,
                age,
                hairColor: hairColor?.trim() || null,
                eyeColor: eyeColor?.trim() || null,
                skinTone: skinTone?.trim() || null,
                photoUrl: photoUrl?.trim() || null,
            }
        });

        return newChild;
    }

    /**
     * קבלת כל הילדים של משתמש
     */
    static async getChildrenByUserId(userId: number): Promise<Child[]> {
        const children = await prisma.child.findMany({
            where: {
                userId,
                isActive: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return children;
    }

    /**
     * קבלת ילד ספציפי
     */
    static async getChildById(childId: number, userId: number): Promise<Child | null> {
        const child = await prisma.child.findFirst({
            where: {
                id: childId,
                userId, // וידוא שהילד שייך למשתמש
                isActive: true
            }
        });

        return child;
    }

    /**
     * עדכון פרטי ילד
     */
    static async updateChild(
        childId: number,
        userId: number,
        updateData: UpdateChildData
    ): Promise<Child> {
        // בדיקה שהילד קיים ושייך למשתמש
        const existingChild = await this.getChildById(childId, userId);
        if (!existingChild) {
            throw new Error('Child not found or access denied');
        }

        // הכנת הנתונים לעדכון
        const dataToUpdate: any = {};

        if (updateData.name !== undefined) {
            if (updateData.name.trim().length === 0) {
                throw new Error('Child name cannot be empty');
            }
            dataToUpdate.name = updateData.name.trim();
        }

        if (updateData.gender !== undefined) {
            dataToUpdate.gender = updateData.gender;
        }

        if (updateData.age !== undefined) {
            if (updateData.age < 0 || updateData.age > 18) {
                throw new Error('Age must be between 0 and 18');
            }
            dataToUpdate.age = updateData.age;
        }

        if (updateData.hairColor !== undefined) {
            dataToUpdate.hairColor = updateData.hairColor?.trim() || null;
        }

        if (updateData.eyeColor !== undefined) {
            dataToUpdate.eyeColor = updateData.eyeColor?.trim() || null;
        }

        if (updateData.skinTone !== undefined) {
            dataToUpdate.skinTone = updateData.skinTone?.trim() || null;
        }

        if (updateData.photoUrl !== undefined) {
            dataToUpdate.photoUrl = updateData.photoUrl?.trim() || null;
        }

        const updatedChild = await prisma.child.update({
            where: { id: childId },
            data: dataToUpdate
        });

        return updatedChild;
    }

    /**
     * מחיקת ילד (soft delete)
     */
    static async deleteChild(childId: number, userId: number): Promise<void> {
        // בדיקה שהילד קיים ושייך למשתמש
        const existingChild = await this.getChildById(childId, userId);
        if (!existingChild) {
            throw new Error('Child not found or access denied');
        }

        await prisma.child.update({
            where: { id: childId },
            data: { isActive: false }
        });
    }

    /**
     * ספירת ילדים של משתמש
     */
    static async getChildrenCount(userId: number): Promise<number> {
        const count = await prisma.child.count({
            where: {
                userId,
                isActive: true
            }
        });

        return count;
    }

    /**
     * קבלת סטטיסטיקות על הילדים
     */
    static async getUserChildrenStats(userId: number) {
        const children = await this.getChildrenByUserId(userId);

        const stats = {
            totalChildren: children.length,
            byGender: {
                male: children.filter(c => c.gender === 'MALE').length,
                female: children.filter(c => c.gender === 'FEMALE').length,
                other: children.filter(c => c.gender === 'OTHER').length,
            },
            ageRanges: {
                toddlers: children.filter(c => c.age && c.age <= 3).length,
                preschool: children.filter(c => c.age && c.age >= 4 && c.age <= 6).length,
                school: children.filter(c => c.age && c.age >= 7 && c.age <= 12).length,
                teens: children.filter(c => c.age && c.age >= 13).length,
                unknown: children.filter(c => !c.age).length,
            }
        };

        return stats;
    }
}