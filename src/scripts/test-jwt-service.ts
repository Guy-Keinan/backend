import 'dotenv/config';
import { JwtService, TokenPayload } from '../services/jwt.service';

/**
 * סקריפט בדיקה ל-JWT Service
 * 
 * הסקריפט בודק:
 * 1. יצירת טוקן
 * 2. אימות טוקן תקף
 * 3. טיפול בטוקן לא תקף
 * 4. חילוץ טוקן מheader
 */

const testJwtService = (): void => {
  console.log('🧪 Testing JWT Service...\n');

  // נתוני מבחן
  const testPayload: TokenPayload = {
    userId: 123,
    email: 'test@example.com',
    firstName: 'משה',
    lastName: 'כהן'
  };

  try {
    // בדיקה 1: יצירת טוקן
    console.log('1️⃣ Generating JWT token...');
    const token = JwtService.generateToken(testPayload);
    console.log('✅ Token generated successfully');
    console.log('📄 Token preview:', token.substring(0, 50) + '...');

    // בדיקה 2: אימות טוקן תקף
    console.log('\n2️⃣ Verifying valid token...');
    const decodedToken = JwtService.verifyToken(token);
    console.log('✅ Token verified successfully');
    console.log('👤 Decoded user:', {
      userId: decodedToken.userId,
      email: decodedToken.email,
      firstName: decodedToken.firstName,
      lastName: decodedToken.lastName
    });

    // בדיקה 3: בדיקת תקפות טוקן
    console.log('\n3️⃣ Checking token validity...');
    const isValid = JwtService.isTokenValid(token);
    console.log('✅ Token validity check:', isValid);

    // בדיקה 4: טוקן לא תקף
    console.log('\n4️⃣ Testing invalid token...');
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    try {
      JwtService.verifyToken(invalidToken);
      console.log('❌ This should not happen - invalid token should fail');
    } catch (error) {
      console.log('✅ Invalid token correctly rejected:', (error as Error).message);
    }

    // בדיקה 5: חילוץ טוקן מheader
    console.log('\n5️⃣ Testing token extraction from header...');
    const authHeader = `Bearer ${token}`;
    const extractedToken = JwtService.extractTokenFromHeader(authHeader);
    
    if (extractedToken === token) {
      console.log('✅ Token extracted correctly from Authorization header');
    } else {
      console.log('❌ Token extraction failed');
    }

    // בדיקה 6: header לא תקף
    console.log('\n6️⃣ Testing invalid authorization header...');
    const invalidHeader = 'Basic ' + token; // לא Bearer
    const notExtracted = JwtService.extractTokenFromHeader(invalidHeader);
    
    if (notExtracted === null) {
      console.log('✅ Invalid header format correctly rejected');
    } else {
      console.log('❌ Should not extract token from invalid header');
    }

    // בדיקה 7: חילוץ מידע בלי אימות (decode)
    console.log('\n7️⃣ Testing token decode without verification...');
    const decodedWithoutVerification = JwtService.decodeToken(token);
    
    if (decodedWithoutVerification) {
      console.log('✅ Token decoded successfully (without verification)');
      if (decodedWithoutVerification.exp) {
        console.log('📅 Token expires at:', new Date(decodedWithoutVerification.exp * 1000).toLocaleString());
      }
    }

    // בדיקה 8: יצירת refresh token
    console.log('\n8️⃣ Generating refresh token...');
    const refreshToken = JwtService.generateRefreshToken(testPayload);
    console.log('✅ Refresh token generated successfully');
    console.log('🔄 Refresh token preview:', refreshToken.substring(0, 50) + '...');

    console.log('\n🎉 All JWT tests completed successfully!');

  } catch (error) {
    console.error('❌ JWT test failed:', error);
  }
};

// הפעלת הבדיקות
testJwtService();