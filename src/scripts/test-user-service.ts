import 'dotenv/config';
import { UserService } from '../services/user.service';
import { connectDatabase, disconnectDatabase } from '../config/prisma';

/**
 * סקריפט בדיקה לUser Service
 * 
 * הסקריפט בודק:
 * 1. יצירת משתמש חדש
 * 2. אימות המשתמש
 * 3. חיפוש לפי ID
 */

const testUserService = async (): Promise<void> => {
    await connectDatabase();

    try {
        console.log('🧪 Testing User Service...\n');

        // בדיקה 1: יצירת משתמש חדש
        console.log('1️⃣ Creating new user...');
        const newUser = await UserService.createUser({
            email: 'test@example.com',
            password: 'Test123456!',
            firstName: 'משה',
            lastName: 'כהן'
        });

        console.log('✅ User created:', {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName
        });

        // בדיקה 2: אימות משתמש עם סיסמה נכונה
        console.log('\n2️⃣ Testing authentication with correct password...');
        const authenticatedUser = await UserService.authenticateUser({
            email: 'test@example.com',
            password: 'Test123456!'
        });

        console.log('✅ Authentication successful:', authenticatedUser.email);

        // בדיקה 3: אימות משתמש עם סיסמה שגויה
        console.log('\n3️⃣ Testing authentication with wrong password...');
        try {
            await UserService.authenticateUser({
                email: 'test@example.com',
                password: 'WrongPassword'
            });
            console.log('❌ This should not happen - authentication should fail');
        } catch (error) {
            console.log('✅ Authentication correctly failed:', (error as Error).message);
        }

        // בדיקה 4: חיפוש משתמש לפי ID
        console.log('\n4️⃣ Finding user by ID...');
        const foundUser = await UserService.getUserById(newUser.id);

        if (foundUser) {
            console.log('✅ User found by ID:', foundUser.email);
        } else {
            console.log('❌ User not found');
        }

        // בדיקה 5: ניסיון יצירת משתמש עם אימייל קיים
        console.log('\n5️⃣ Testing duplicate email creation...');
        try {
            await UserService.createUser({
                email: 'test@example.com', // אותו אימייל
                password: 'AnotherPassword',
                firstName: 'יוסי',
                lastName: 'לוי'
            });
            console.log('❌ This should not happen - duplicate email should fail');
        } catch (error) {
            console.log('✅ Duplicate email correctly rejected:', (error as Error).message);
        }

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await disconnectDatabase();
    }
};

// הפעלת הבדיקות
testUserService();