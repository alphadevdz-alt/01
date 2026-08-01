# SPEX — نشر Render + Neon

هذه النسخة مهيأة لتشغيل SPEX كـ Node/Express Web Service على Render مع PostgreSQL مستضاف على Neon.

## 1) Neon

أنشئ مشروع PostgreSQL في Neon ثم خذ رابطين:

- `DATABASE_URL`: يفضّل أن يكون رابط الاتصال pooled الذي يوفره Neon لتشغيل التطبيق.
- `DIRECT_URL`: رابط الاتصال المباشر/unpooled لاستخدام Prisma migrations.

ضعهما في Render كـ Secret Environment Variables.

> لا تضع أي رابط قاعدة بيانات حقيقي في GitHub أو داخل `.env.example`.

## 2) Render

ارفع المشروع إلى GitHub ثم أنشئ Web Service من المستودع.

يمكنك استخدام `render.yaml` الموجود في جذر المشروع عبر Render Blueprint.

الإعدادات الأساسية:

- Runtime: Node
- Build Command: `npm run render:build`
- Start Command: `npm run render:start`
- Health Check: `/health`

الـ Build ينفذ:

1. `npm ci`
2. `prisma generate`
3. `prisma migrate deploy`
4. `npm run build`

تم اختيار هذا الأسلوب لأنه متوافق مع خطة Render Free التي لا توفر `preDeployCommand`. إذا انتقلت إلى خطة مدفوعة، يفضّل نقل `prisma migrate deploy` إلى `preDeployCommand` حتى لا يتم تشغيل migration ضمن مرحلة build.

## 3) متغيرات البيئة

يجب إعداد:

### قاعدة البيانات
- `DATABASE_URL`
- `DIRECT_URL`

### الأمان
- `JWT_SECRET`
- `API_KEY_ENCRYPTION_SECRET`
- `SETUP_SECRET`

### Google
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `VITE_GOOGLE_CLIENT_ID`

### البريد
- `RESEND_API_KEY`
- `EMAIL_FROM`

### AI
يمكن تفعيل مزود واحد أو عدة مزودين:

- `NVIDIA_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

ويمكن أيضاً استخدام مزود OpenAI-compatible:

- `AI_COMPATIBLE_API_KEY`
- `AI_COMPATIBLE_BASE_URL`
- `AI_COMPATIBLE_MODEL`

إذا تم إعداد أكثر من مزود، يستخدم SPEX الـ AI Gateway مع fallback.

## 4) Google OAuth

بعد أن تحصل على رابط Render النهائي، أضف عنوان التطبيق إلى إعدادات Google OAuth.

مثال:

`https://YOUR-SERVICE.onrender.com`

وتأكد من ضبط Redirect URI الفعلي الذي يستخدمه مسار Google OAuth في SPEX.

## 5) أول Admin

استخدم مسار bootstrap المخصص لأول Admin فقط، مع `SETUP_SECRET` قوي.

بعد إنشاء أول Admin، أغلق/عطّل مسار bootstrap في الإنتاج إذا كان منطق التطبيق يسمح بذلك، أو اجعله غير قابل للاستخدام بعد وجود Admin واحد.

## 6) التشغيل المحلي

انسخ:

`.env.example` إلى `.env`

ثم ضع قيم Neon الحقيقية ومفاتيح المزودين التي تريد استخدامها.

نفذ:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

اختبر:

```text
GET /health
```

يجب أن يعيد JSON بحالة `ok: true`.

## 7) ملاحظة عن Neon

إذا واجه Prisma مشكلة في الاتصالات المتزامنة أو حدود الاتصال، راجع إعدادات Neon واستخدم رابط pooled للتطبيق، مع إبقاء `DIRECT_URL` للعمليات الإدارية/migrations.

## 8) لا تشغل seed تلقائياً

لا يتم تشغيل `prisma db seed` مع كل تشغيل للخادم.

إذا احتجت بيانات أولية، نفذها مرة واحدة بشكل مقصود:

```bash
npm run db:seed
```

ولا تستخدم seed تلقائياً في كل deploy إلا إذا كان السكربت idempotent ومصمماً لذلك.
