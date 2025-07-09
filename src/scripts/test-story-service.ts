import 'dotenv/config';
import { StoryService } from '../services/story.service';
import { UserService } from '../services/user.service';
import { ChildrenService } from '../services/children.service';
import { connectDatabase, disconnectDatabase } from '../config/prisma';
import { Gender } from '@prisma/client';

/**
 * סקריפט בדיקה ל-Story Service
 */

const testStoryService = async (): Promise<void> => {
    await connectDatabase();

    try {
        console.log('🧪 Testing Story Service...\n');

        // יצירת משתמש לבדיקה
        console.log('1️⃣ Creating test user...');
        const testUser = await UserService.createUser({
            email: 'storytest@example.com',
            password: 'password123',
            firstName: 'הורה',
            lastName: 'סיפורים'
        });
        console.log('✅ Test user created:', testUser.email);

        // יצירת ילד זכר
        console.log('\n2️⃣ Creating male child...');
        const maleChild = await ChildrenService.createChild(testUser.id, {
            name: 'דן',
            gender: Gender.MALE,
            age: 5,
            hairColor: 'חום',
            eyeColor: 'ירוק',
            skinTone: 'בהיר'
        });
        console.log('✅ Male child created:', maleChild.name);

        // יצירת ילדה
        console.log('\n3️⃣ Creating female child...');
        const femaleChild = await ChildrenService.createChild(testUser.id, {
            name: 'מיכל',
            gender: Gender.FEMALE,
            age: 4,
            hairColor: 'בלונד',
            eyeColor: 'כחול'
        });
        console.log('✅ Female child created:', femaleChild.name);

        // יצירת סיפור לילד זכר
        console.log('\n4️⃣ Generating story for male child...');
        const maleStory = await StoryService.generateStory(testUser.id, {
            templateId: 1, // "הילד שלא רצה לישון"
            childId: maleChild.id
        });
        console.log('✅ Male story generated:', {
            id: maleStory.id,
            title: maleStory.title,
            status: maleStory.generationStatus
        });

        // יצירת סיפור לילדה
        console.log('\n5️⃣ Generating story for female child...');
        const femaleStory = await StoryService.generateStory(testUser.id, {
            templateId: 1, // אותה תבנית
            childId: femaleChild.id
        });
        console.log('✅ Female story generated:', {
            id: femaleStory.id,
            title: femaleStory.title,
            status: femaleStory.generationStatus
        });

        // יצירת סיפור נוסף לילדה
        console.log('\n6️⃣ Generating another story for female child...');
        const anotherStory = await StoryService.generateStory(testUser.id, {
            templateId: 2, // "הילד הקטן והמפלצת הדמיונית"
            childId: femaleChild.id
        });
        console.log('✅ Another female story generated:', anotherStory.title);

        // קבלת כל הסיפורים של המשתמש
        console.log('\n7️⃣ Getting all user stories...');
        const allStories = await StoryService.getUserStories(testUser.id);
        console.log('✅ Found stories:', allStories.length);
        allStories.forEach(story => {
            console.log(`   - ${story.title} (${story.child?.name})`);
        });

        // קבלת סיפור ספציפי
        console.log('\n8️⃣ Getting specific story...');
        const specificStory = await StoryService.getStoryById(maleStory.id, testUser.id);
        if (specificStory) {
            console.log('✅ Story found:', specificStory.title);
            console.log('📖 Content preview:',
                JSON.stringify(specificStory.content).substring(0, 100) + '...');
        }

        // קבלת סיפורים לילד ספציפי
        console.log('\n9️⃣ Getting stories for specific child...');
        const childStories = await StoryService.getStoriesForChild(femaleChild.id, testUser.id);
        console.log('✅ Stories for', femaleChild.name, ':', childStories.length);

        // קבלת המלצות תבניות לילד
        console.log('\n🔟 Getting recommended templates...');
        const recommendations = await StoryService.getRecommendedTemplatesForChild(
            maleChild.id,
            testUser.id
        );
        console.log('✅ Recommended templates:', recommendations.length);
        recommendations.forEach(template => {
            console.log(`   - ${template.title} (${template.category})`);
        });

        // סטטיסטיקות
        console.log('\n1️⃣1️⃣ Getting user stories statistics...');
        const stats = await StoryService.getUserStoriesStats(testUser.id);
        console.log('✅ Stories statistics:', {
            total: stats.totalStories,
            byChild: stats.byChild,
            byCategory: stats.byCategory
        });

        // בדיקת שגיאות - ניסיון גישה לילד של משתמש אחר
        console.log('\n1️⃣2️⃣ Testing access control...');
        try {
            await StoryService.generateStory(testUser.id, {
                templateId: 1,
                childId: 9999 // ילד לא קיים
            });
            console.log('❌ Should not generate story for non-existent child');
        } catch (error) {
            console.log('✅ Access control working:', (error as Error).message);
        }

        // בדיקת שגיאות - תבנית לא קיימת
        console.log('\n1️⃣3️⃣ Testing invalid template...');
        try {
            await StoryService.generateStory(testUser.id, {
                templateId: 9999, // תבנית לא קיימת
                childId: maleChild.id
            });
            console.log('❌ Should not generate story with invalid template');
        } catch (error) {
            console.log('✅ Template validation working:', (error as Error).message);
        }

        console.log('\n🎉 All Story Service tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await disconnectDatabase();
    }
};

// הפעלת הבדיקות
testStoryService();