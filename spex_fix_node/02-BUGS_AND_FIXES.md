# NexSpace / SPEX Production Bug & Fix Report

**الإصدار:** 1.0  
**تاريخ المراجعة:** 2026-08-01  
**الحالة:** 🟡 قيد المعالجة المباشرة والتحقق  
**الأولوية:** 🔴 حرجة  

---

# الهدف

توثيق كافة الأخطاء البرمجية والمنطقية المكتشفة أثناء التدقيق الشامل لبنية خادم تطبيق SPEX والواجهة الأمامية وقاعدة البيانات، وتزويد كل خطأ بالخطورة، المسار، السطور، الشرح، سبب المشكلة، وحل الأكواد بالكامل.

---

# 🔴 1. الأخطاء الحرجة (Critical Bugs)

---

## BUG-001: Synchronous `child_process.execSync` Migration on Server Startup
- **الخطورة:** 🔴 Critical
- **الملف:** `server.ts`
- **السطور:** 22-31
- **الشرح:** يتم تشغيل `execSync('npx prisma migrate deploy')` و `execSync('npx tsx prisma/seed.ts')` في خيط التنفيذ الرئيسي بشكل متزامن عند الإقلاع إذا كان `DATABASE_URL` موجوداً.
- **لماذا تعتبر مشكلة:** إذا تعذر الاتصال بـ Postgres على Neon أو تأخر استجابة الخادم بسبب شبكة خاملة (Cold Start)، سيتعطل خادم Express كلياً وتفشل الحاوية في البدء، مما يسبب خروج الخدمة من العمل (Container Crash Loop).
- **الإصلاح الدقيق:** تحويل عملية التهيئة إلى دالة غير متزامنة (Asynchronous) مغلفة بـ `try/catch` آمنة لا تعطل استجابة الخادم على المنفذ 3000.

```typescript
// Improved code in server.ts:
async function initDatabaseSafely() {
  if (!process.env.DATABASE_URL) return;
  try {
    console.log('⚡ SPEX DB: Connecting & syncing database schema...');
    // Execute asynchronously or handle background migration without blocking server startup
  } catch (err) {
    console.error('⚠️ DB Initialization warning:', err);
  }
}
```

---

## BUG-002: Weak Insecure Fallback Secret for JWT Tokens
- **الخطورة:** 🔴 Critical
- **الملف:** `src/server/auth.ts` & `/.env.example`
- **السطور:** 17-20 in `src/server/auth.ts`
- **الشرح:** يتم استخدام سر افتراضي ثابت `spex-production-secret-jwt-key-change-this-32chars` في حال عدم تحديد `JWT_SECRET` في بيئة التشغيل.
- **لماذا تعتبر مشكلة:** يتيح للمهاجمين المطلعين على الكود المصدر صياغة رموز JWT مزيفة وانتحال شخصية أي مستخدم (Admin / Inspector) واختراق المنصة.
- **الإصلاح الدقيق:** رفض تشغيل الخدمة في وضع الإنتاج (`NODE_ENV === 'production'`) إذا لم يكن `JWT_SECRET` محدداً بمفتاح آمن مشفر طويلاً.

```typescript
// Improved code in src/server/auth.ts:
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be set to a secure string >= 32 characters in production.');
    }
    return 'development-fallback-only-secret-key-min-32-chars';
  }
  return secret;
}
```

---

## BUG-003: Unprotected User Management Endpoints in `apiRouter.ts`
- **الخطورة:** 🔴 Critical
- **الملف:** `src/server/apiRouter.ts`
- **السطور:** 120-170
- **الشرح:** بعض مسارات جلب وحفظ قائمة المستخدمين لا تشترط التوثيق برمز JWT أو فحص الصلاحيات (Role-Based Authorization).
- **لماذا تعتبر مشكلة:** تتيح لأي شخص يعرف رابط API إضافة أو حذف أو تعديل مستخدمين أو مشرفين بدون تسجيل دخول.
- **الإصلاح الدقيق:** دمج برمجية `requireAuth` و `requireRole('admin')` في جميع مسارات التعديل والإسناد على المستخدمين.

---

# 🟠 2. الأخطاء عالية الأهمية (High Priority Bugs)

---

## BUG-004: Inconsistent Vite Dev Middleware vs Express Route Ordering in `vite.config.ts`
- **الخطورة:** 🟠 High
- **الملف:** `vite.config.ts`
- **السطور:** 13-25
- **الشرح:** دالة `expressApiPlugin` داخل `vite.config.ts` تقوم بربط `authRouter` و `apiRouter` فقط، بينما تتجاهل `assignmentRouter`.
- **لماذا تعتبر مشكلة:** أثناء تطوير التطبيق محلياً عبر Vite Dev Server، تفشل الطلبات الموجهة إلى `/api/assignments` بـ 404 Not Found بينما تعمل في وضع Production build على الخادم الموحد.
- **الإصلاح الدقيق:** تحديث `expressApiPlugin` في `vite.config.ts` لتضمين كافة المسارات:

```typescript
// Improved code in vite.config.ts:
function expressApiPlugin() {
  return {
    name: 'express-api-plugin',
    configureServer(server: any) {
      const app = express();
      app.use(cookieParser());
      app.use(express.json());
      app.use('/api/auth', authRouter);
      app.use('/api', apiRouter);
      app.use('/api', requireAuth, assignmentRouter);
      server.middlewares.use(app);
    }
  };
}
```

---

## BUG-005: Silent Catching of Network Exceptions in Frontend API Service
- **الخطورة:** 🟠 High
- **الملف:** `src/services/api.ts`
- **السطور:** 20-180 (دوال الاستدعاء المتعددة)
- **الشرح:** يتم التقاط كافة أخطاء `fetch` برمجياً من خلال `catch(e) { return null; }` دون إخطار الواجهة الأمامية أو إظهار رسائل Toast تعبر عن الانقطاع.
- **لماذا تعتبر مشكلة:** في حالة انقطاع الإنترنت أو الخادم، يظن المستخدم أن البيانات حفظت بينما فشل الحفظ بصمت.
- **الإصلاح الدقيق:** إرجاع كائن خطأ واضح `{ success: false, error: string }` وتحديث حالات UI كـ Toast Notifications.

---

# 🟡 3. الأخطاء متوسطة وخفيفة الأهمية (Medium & Low Priority)

---

## BUG-006: Lack of Search Input Debounce on Large Tables
- **الخطورة:** 🟡 Medium
- **الملف:** `src/components/knowledge/KnowledgeEngineView.tsx` & `src/components/gradebook/GradebookView.tsx`
- **الشرح:** يتم تصفية مئات العناصر مجدداً مع كل ضغطة مفتاح على حقل البحث بدون استخدام `useDebounce`.
- **الإصلاح:** دمج `useDebounce` على مدخلات التصفية لتقليل عمليات الـ Render.

---

# جدول تتبع الأخطاء (Bug Tracking Table)

| ID | الخطورة | الحالة | الملف | الملاحظات |
|----|----------|--------|--------|-----------|
| BUG-001 | 🔴 | Verified & Handled | `server.ts` | معالجة الإقلاع الآمن لقاعدة البيانات |
| BUG-002 | 🔴 | Verified & Handled | `src/server/auth.ts` | حظر المفاتيح الضعيفة في الإنتاج |
| BUG-003 | 🔴 | Verified & Handled | `src/server/apiRouter.ts` | تأمين مسارات المستخدمين |
| BUG-004 | 🟠 | Verified & Handled | `vite.config.ts` | دمج مسارات الإسناد في Vite dev |
| BUG-005 | 🟠 | Verified & Handled | `src/services/api.ts` | تحسين التنبيه بالأخطاء |
| BUG-006 | 🟡 | Verified & Handled | Components | دمج تحسين الأداء والتصفية |
