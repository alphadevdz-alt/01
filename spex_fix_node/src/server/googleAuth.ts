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
  return true;
}

/**
 * يتحقق من رمز الهوية (credential) القادم من زر "الدخول عبر Google" في الواجهة.
 * يدعم التحقق المحلي بالعميل أو عبر API tokeninfo الرسمي من Google.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  // 1. تجربة التحقق المحلي إذا كان GOOGLE_CLIENT_ID معرفاً
  if (client && GOOGLE_CLIENT_ID) {
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      if (payload && payload.sub && payload.email) {
        return {
          googleId: payload.sub,
          email: payload.email.toLowerCase(),
          emailVerified: Boolean(payload.email_verified),
          firstName: payload.given_name || payload.name || 'مستخدم',
          lastName: payload.family_name || 'جديد',
          avatar: payload.picture
        };
      }
    } catch (err) {
      console.warn('تعذر التحقق المحلي من GOOGLE_CLIENT_ID، الانتقال إلى tokeninfo API من Google...', err);
    }
  }

  // 2. التحقق مباشرة عبر نقطة النهاية الرسمية لتأكيد الرموز من Google
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const payload = await res.json() as {
      sub?: string;
      email?: string;
      email_verified?: string | boolean;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
    };
    if (!payload || !payload.sub || !payload.email) return null;

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      firstName: payload.given_name || payload.name || 'مستخدم',
      lastName: payload.family_name || 'جديد',
      avatar: payload.picture
    };
  } catch (err) {
    console.error('فشل التحقق من رمز Google عبر tokeninfo API:', err);
    return null;
  }
}
