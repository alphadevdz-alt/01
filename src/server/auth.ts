/**
 * SPEX - Authentication Core
 * تجزئة كلمات المرور (bcrypt) وتوقيع/التحقق من جلسات JWT عبر كوكيز httpOnly آمنة
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'spex_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 أيام

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (IS_PRODUCTION) {
    console.warn('⚠️ JWT_SECRET غير معرّف أو قصير جداً (أقل من 32 حرفاً). يُرجى ضبطه في متغيرات البيئة قبل الاستخدام في الإنتاج.');
  } else {
    console.warn('⚠️ JWT_SECRET غير معرّف في .env — سيتم استخدام مفتاح تطوير مؤقت.');
  }
}

const EFFECTIVE_SECRET = (JWT_SECRET && JWT_SECRET.length >= 32) 
  ? JWT_SECRET 
  : (JWT_SECRET || 'dev-only-insecure-secret-change-me-32chars-spex');

export interface SessionPayload {
  userId: string;
  role: string;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, EFFECTIVE_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, EFFECTIVE_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/'
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: IS_PRODUCTION, sameSite: 'lax', path: '/' });
}

export function getSessionTokenFromRequest(req: Request): string | undefined {
  return req.cookies?.[COOKIE_NAME];
}

// حقول لا يجب أبداً أن تغادر الخادم باتجاه العميل عند عرض حساب مستخدم آخر
// (customApiKey سرّ خاص بصاحبه فقط - لا يجوز أن يراه بقية المستخدمين، بمن فيهم admin/inspector،
// عبر قوائم المستخدمين أو أي استجابة تخص حساباً غير حساب صاحب الطلب نفسه)
export function sanitizeUser<T extends Record<string, unknown>>(
  user: T
): Omit<T, 'passwordHash' | 'password' | 'customApiKey'> {
  const safe = { ...user };
  delete (safe as Record<string, unknown>).passwordHash;
  delete (safe as Record<string, unknown>).password;
  delete (safe as Record<string, unknown>).customApiKey;
  return safe as Omit<T, 'passwordHash' | 'password' | 'customApiKey'>;
}

// نسخة "حسابي الشخصي" فقط: تُستخدم حصراً عند إعادة بيانات صاحب الطلب نفسه
// (تسجيل الدخول، /me، التسجيل...) حيث يحتاج العميل لاسترجاع مفتاحه الخاص الذي أدخله بنفسه
export function sanitizeOwnUser<T extends Record<string, unknown>>(user: T): Omit<T, 'passwordHash' | 'password'> {
  const safe = { ...user };
  delete (safe as Record<string, unknown>).passwordHash;
  delete (safe as Record<string, unknown>).password;
  return safe as Omit<T, 'passwordHash' | 'password'>;
}

// -----------------------------------------------------------------------
// Password Reset Tokens
// نولّد رمزاً عشوائياً خاماً يُرسَل في رابط البريد، ونخزّن هاشه فقط في قاعدة البيانات
// (بنفس منطق عدم تخزين الأسرار كنص عادي المطبّق على كلمات المرور)
// -----------------------------------------------------------------------
export const RESET_TOKEN_TTL_MINUTES = 30;

export function generateResetToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
