import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { User } from '@prisma/client';

/**
 * User Service - שכבת הלוגיקה העסקית למשתמשים
 * 
 * השכבה הזו מכילה את כל הלוגיקה הקשורה למשתמשים:
 * - יצירת משתמש חדש
 * - אימות סיסמה
 * - חיפוש משתמשים
 * - עדכון פרטים
 * 
 * עקרון חשוב: השכבה הזו לא יודעת כלום על HTTP - רק לוגיקה עסקית
 */

// ממשקים (Interfaces) לקלט ופלט
export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// הסרת סיסמה מהתשובה (לאבטחה)
export type SafeUser = Omit<User, 'password'>;

export class UserService {
  
  /**
   * יצירת משתמש חדש
   * 
   * התהליך:
   * 1. בדיקה שהאימייל לא קיים
   * 2. הצפנת הסיסמה
   * 3. שמירה בבסיס הנתונים
   */
  static async createUser(userData: CreateUserData): Promise<SafeUser> {
    const { email, password, firstName, lastName } = userData;

    // בדיקה שהמשתמש לא קיים כבר
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // הצפנת הסיסמה - 12 rounds של bcrypt (בטוח ויעיל)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // יצירת המשתמש
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(), // נרמול האימייל
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      }
    });

    // החזרת המשתמש בלי הסיסמה
    const { password: _, ...safeUser } = newUser;
    return safeUser;
  }

  /**
   * אימות משתמש (לוגין)
   * 
   * התהליך:
   * 1. חיפוש המשתמש לפי אימייל
   * 2. בדיקת הסיסמה
   * 3. החזרת פרטי המשתמש
   */
  static async authenticateUser(credentials: LoginCredentials): Promise<SafeUser> {
    const { email, password } = credentials;

    // חיפוש המשתמש
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // בדיקה שהמשתמש פעיל
    if (!user.isActive) {
      throw new Error('Account is disabled');
    }

    // בדיקת הסיסמה
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // החזרת המשתמש בלי הסיסמה
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * חיפוש משתמש לפי ID
   */
  static async getUserById(userId: number): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * עדכון פרטי משתמש
   */
  static async updateUser(userId: number, updateData: Partial<CreateUserData>): Promise<SafeUser> {
    const { password, ...otherData } = updateData;
    
    let dataToUpdate: any = { ...otherData };

    // אם יש סיסמה חדשה, נצפין אותה
    if (password) {
      const saltRounds = 12;
      dataToUpdate.password = await bcrypt.hash(password, saltRounds);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    const { password: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  /**
   * השבתת משתמש (soft delete)
   */
  static async deactivateUser(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });
  }
}