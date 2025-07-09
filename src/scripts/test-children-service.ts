import 'dotenv/config';
import { ChildrenService } from '../services/children.service';
import { UserService } from '../services/user.service';
import { connectDatabase, disconnectDatabase } from '../config/prisma';
import { Gender } from '@prisma/client';

/**
 * סקריפט בדיקה לChildren Service
 */

const testChildrenService = async (): Promise<void> => {
    await connectDatabase();

    try {
        console.log('🧪 Testing Children Service...\n');

        // יצירת משתמש לבדיקה
        console.log('1️⃣ Creating test user...');
        const testUser = await UserService.createUser({
            email: 'parent@example.com',
            password: 'password123',
            firstName: 'הורה',
            lastName: 'בדיקה'
        });
        console.log('✅ Test user created:', testUser.email);

        // יצירת ילד ראשון
        console.log('\n2️⃣ Creating first child...');
        const child1 = await ChildrenService.createChild(testUser.id, {
            name: 'נועה',
            gender: Gender.FEMALE,
            age: 5,
            hairColor: 'חום',
            eyeColor: 'ירוק',
            skinTone: 'בהיר'
        });
        console.log('✅ First child created:', {
            id: child1.id,
            name: child1.name,
            gender: child1.gender,
            age: child1.age
        });

        // יצירת ילד שני
        console.log('\n3️⃣ Creating second child...');
        const child2 = await ChildrenService.createChild(testUser.id, {
            name: 'דניאל',
            gender: Gender.MALE,
            age: 8,
            hairColor: 'שחור',
            eyeColor: 'חום'
        });
        console.log('✅ Second child created:', {
            id: child2.id,
            name: child2.name,
            gender: child2.gender,
            age: child2.age
        });

        // קבלת כל הילדים
        console.log('\n4️⃣ Getting all children...');
        const allChildren = await ChildrenService.getChildrenByUserId(testUser.id);
        console.log('✅ Found children:', allChildren.length);
        allChildren.forEach(child => {
            console.log(`   - ${child.name} (${child.gender}, גיל ${child.age})`);
        });

        // קבלת ילד ספציפי
        console.log('\n5️⃣ Getting specific child...');
        const specificChild = await ChildrenService.getChildById(child1.id, testUser.id);
        if (specificChild) {
            console.log('✅ Child found:', specificChild.name);
        } else {
            console.log('❌ Child not found');
        }

        // עדכון פרטי ילד
        console.log('\n6️⃣ Updating child details...');
        const updatedChild = await ChildrenService.updateChild(child1.id, testUser.id, {
            age: 6,
            skinTone: 'זיתים'
        });
        console.log('✅ Child updated:', {
            name: updatedChild.name,
            age: updatedChild.age,
            skinTone: updatedChild.skinTone
        });

        // ספירת ילדים
        console.log('\n7️⃣ Counting children...');
        const childrenCount = await ChildrenService.getChildrenCount(testUser.id);
        console.log('✅ Children count:', childrenCount);

        // סטטיסטיקות
        console.log('\n8️⃣ Getting children statistics...');
        const stats = await ChildrenService.getUserChildrenStats(testUser.id);
        console.log('✅ Statistics:', {
            total: stats.totalChildren,
            byGender: stats.byGender,
            ageRanges: stats.ageRanges
        });

        // בדיקת שגיאות - גיל לא תקין
        console.log('\n9️⃣ Testing invalid age...');
        try {
            await ChildrenService.createChild(testUser.id, {
                name: 'ילד לא תקין',
                gender: Gender.MALE,
                age: 25 // גיל לא תקין
            });
            console.log('❌ Should not create child with invalid age');
        } catch (error) {
            console.log('✅ Invalid age correctly rejected:', (error as Error).message);
        }

        // בדיקת שגיאות - גישה לילד של משתמש אחר
        console.log('\n🔟 Testing access control...');
        const otherChild = await ChildrenService.getChildById(child1.id, 9999); // משתמש לא קיים
        if (otherChild === null) {
            console.log('✅ Access control working - cannot access other user\'s child');
        } else {
            console.log('❌ Access control failed');
        }

        // מחיקת ילד
        console.log('\n1️⃣1️⃣ Deleting child...');
        await ChildrenService.deleteChild(child2.id, testUser.id);
        console.log('✅ Child deleted (soft delete)');

        // בדיקה שהילד נמחק
        const deletedChild = await ChildrenService.getChildById(child2.id, testUser.id);
        if (deletedChild === null) {
            console.log('✅ Deleted child not found (correct)');
        } else {
            console.log('❌ Deleted child still accessible');
        }

        console.log('\n🎉 All Children Service tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await disconnectDatabase();
    }
};

// הפעלת הבדיקות
testChildrenService();