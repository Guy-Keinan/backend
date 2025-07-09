import jwt from 'jsonwebtoken';

/**
 * JWT Service - שירות לניהול טוקני אימות
 * 
 * JWT (JSON Web Token) מאפשר אימות stateless:
 * - הסרבר לא צריך לשמור מידע על משתמשים מחוברים
 * - הטוקן מכיל את כל המידע הנדרש
 * - מותאם לאפליקציות מובייל ו-SPA
 */

// ממשקים לטוקן
export interface TokenPayload {
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
}

export interface DecodedToken extends TokenPayload {
    iat?: number; // issued at
    exp?: number; // expiration time
}

export class JwtService {
    private static readonly SECRET = process.env.JWT_SECRET || 'kids-story-super-secret-key-2024';
    private static readonly EXPIRES_IN = process.env.JWT_EXPIRE || '7d';

    /**
     * יצירת טוקן JWT
     * 
     * @param payload מידע המשתמש שיוכנס לטוקן
     * @returns טוקן JWT מוצפן
     */
    static generateToken(payload: TokenPayload): string {
        try {
            // @ts-ignore - עוקפים את בעיית הטייפים של jsonwebtoken
            const token = jwt.sign(
                {
                    userId: payload.userId,
                    email: payload.email,
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                },
                this.SECRET,
                {
                    expiresIn: this.EXPIRES_IN,
                    issuer: 'kids-story-app',
                    subject: payload.userId.toString(),
                }
            );

            return token;
        } catch (error) {
            throw new Error('Failed to generate token');
        }
    }

    /**
     * אימות וחילוץ מידע מטוקן
     * 
     * @param token הטוקן לאימות
     * @returns מידע המשתמש מהטוקן
     */
    static verifyToken(token: string): DecodedToken {
        try {
            const decoded = jwt.verify(token, this.SECRET) as DecodedToken;
            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token has expired');
            } else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            } else {
                throw new Error('Token verification failed');
            }
        }
    }

    /**
     * חילוץ מידע מטוקן בלי אימות (לדיבוג)
     * 
     * @param token הטוקן לחילוץ
     * @returns מידע המשתמש (לא מאומת!)
     */
    static decodeToken(token: string): DecodedToken | null {
        try {
            const decoded = jwt.decode(token) as DecodedToken;
            return decoded;
        } catch (error) {
            return null;
        }
    }

    /**
     * בדיקה האם טוקן תקף (בלי חילוץ מידע)
     * 
     * @param token הטוקן לבדיקה
     * @returns האם הטוקן תקף
     */
    static isTokenValid(token: string): boolean {
        try {
            this.verifyToken(token);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * חילוץ טוקן מheader של Authorization
     * 
     * @param authHeader הheader "Bearer TOKEN"
     * @returns הטוקן או null
     */
    static extractTokenFromHeader(authHeader: string | undefined): string | null {
        if (!authHeader) {
            return null;
        }

        // פורמט: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1] || null;
    }

    /**
     * יצירת טוקן רענון (לעתיד)
     * 
     * @param payload מידע המשתמש
     * @returns טוקן רענון עם תוקף ארוך יותר
     */
    static generateRefreshToken(payload: TokenPayload): string {
        try {
            // @ts-ignore - עוקפים את בעיית הטייפים של jsonwebtoken
            const refreshToken = jwt.sign(
                {
                    userId: payload.userId,
                    type: 'refresh'
                },
                this.SECRET,
                {
                    expiresIn: '30d',
                    issuer: 'kids-story-app',
                    subject: payload.userId.toString(),
                }
            );

            return refreshToken;
        } catch (error) {
            throw new Error('Failed to generate refresh token');
        }
    }
}