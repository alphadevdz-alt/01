/**
 * SPEX - Google Sign-In Verification
 * التحقق من صحة رمز هوية Google (ID token) الصادر عن Google Identity Services في الواجهة،
 * قبل الوثوق بالبريد الإلكتروني المستخرج منه لربط/تسجيل الدخول بحساب المستخدم في SPEX.
 */
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && client);
}

/**
 * يتحقق من رمز الهوية (credential) القادم من زر "الدخول عبر Google" في الواجهة.
 * يعيد null إن كان الرمز غير صالح، منتهياً، أو موجهاً لتطبيق آخر (audience مختلف).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile | null> {
  if (!client || !GOOGLE_CLIENT_ID) return null;
  if (!idToken || typeof idToken !== 'string') return null;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) return null;

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: Boolean(payload.email_verified),
      firstName: payload.given_name || payload.name || 'مستخدم',
      lastName: payload.family_name || '',
      avatar: payload.picture
    };
  } catch (err) {
    console.error('فشل التحقق من رمز Google:', err);
    return null;
  }
}
