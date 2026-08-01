/**
 * SPEX - Express Server API Router (Production)
 * مسارات واجهة البرمجة: قاعدة بيانات Postgres حقيقية عبر Prisma، محمية بالمصادقة والصلاحيات
 */

import { Router } from 'express';
import { generatePELessonPlan, suggestPEGames, generateAIChatResponse, testGeminiApiKey } from './aiService.js';
import { prisma } from './prismaClient.js';
import { hashPassword, sanitizeUser, sanitizeOwnUser } from './auth.js';
import { requireAuth, requireRole } from './middleware/requireAuth.js';
import { reassignTeacher, reassignAllForInspector } from './assignmentService.js';

// نظام الإسناد التلقائي للأساتذة إلى المفتشين: يُعاد احتساب جهة الإشراف تلقائياً
// عند تسجيل/تعديل أستاذ (يعاد ربطه بمفتشه) أو تسجيل/تعديل مفتش (يعاد ربط كل الأساتذة
// المطابقين له) — دون أي تدخل يدوي من الإدارة، تماماً كما ورد في المواصفة.
async function triggerAutoAssignment(savedUser: { id: string; role: string }) {
  try {
    if (savedUser.role === 'teacher') {
      await reassignTeacher(savedUser.id);
    } else if (savedUser.role === 'inspector') {
      await reassignAllForInspector(savedUser.id);
    }
  } catch (err) {
    console.error('Error running auto-assignment:', err);
  }
}

export const apiRouter = Router();

// Health Check (عام، بدون بيانات حساسة)
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'SPEX Platform',
    version: '2.0.0',
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
  });
});

// كل ما يلي يتطلب تسجيل دخول صالح
apiRouter.use(requireAuth);

// -----------------------------------------------------------------------
// 1. Users Collection — القراءة لأي مستخدم مسجّل دخول (بدون كلمات المرور)،
//    الإنشاء/التعديل مقتصر على admin و inspector، الحذف على admin فقط
// -----------------------------------------------------------------------
apiRouter.get('/db/users', async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const isAdmin = req.user!.role === 'admin';
  res.json({
    success: true,
    users: users.map((u) => (isAdmin || u.id === req.user!.id ? sanitizeOwnUser(u) : sanitizeUser(u)))
  });
});

async function buildUserWriteData(input: any) {
  const data: any = { ...input };
  delete data.id;
  delete data.passwordHash;
  if (data.password) {
    data.passwordHash = await hashPassword(String(data.password));
  }
  delete data.password;
  if (data.email) data.email = String(data.email).toLowerCase().trim();
  return data;
}

apiRouter.post('/db/users', async (req, res) => {
  const { user } = req.body;
  if (!user || !user.id) {
    return res.status(400).json({ error: 'بيانات المستخدم غير مكتملة' });
  }

  const isSelf = req.user!.id === user.id;
  const isAdmin = req.user!.role === 'admin';
  const isManager = isAdmin || req.user!.role === 'inspector';

  // يُسمح لأي مستخدم بتعديل ملفّه الشخصي (الإعدادات، كلمة المرور)، وللمشرف/المفتش بإدارة أي حساب
  if (!isSelf && !isManager) {
    return res.status(403).json({ error: 'لا تملك الصلاحية لتعديل بيانات مستخدم آخر.' });
  }

  // مستخدم عادي لا يمكنه ترقية نفسه إلى دور أعلى أو اعتماد نفسه إدارياً
  if (isSelf && !isManager) {
    delete user.role;
    delete user.isApprovedByAdmin;
    delete user.status;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    if (!existing && !isManager) {
      return res.status(403).json({ error: 'لا يمكن إنشاء حسابات جديدة إلا من طرف مشرف المنظومة أو المفتش.' });
    }

    // المفتش (على خلاف المشرف admin) لا يملك صلاحية منح الأدوار العليا، ولا صلاحية
    // التعديل على حسابات تحمل أصلاً دوراً أعلى من "teacher" — يمكنه فقط إدارة حسابات
    // المعلمين، وتعديل ملفّه الشخصي هو نفسه.
    if (isManager && !isAdmin) {
      const elevatedRoles = ['admin', 'inspector', 'director'];
      const requestedRole = typeof user.role === 'string' ? user.role : undefined;
      const existingRole = existing?.role;

      if (requestedRole && elevatedRoles.includes(requestedRole) && requestedRole !== existingRole) {
        return res.status(403).json({ error: 'منح هذا الدور يتطلب صلاحية مشرف المنظومة (admin).' });
      }
      if (existing && existingRole && elevatedRoles.includes(existingRole) && !isSelf) {
        return res.status(403).json({ error: 'لا تملك الصلاحية لتعديل حساب بهذا الدور. هذا الإجراء مقتصر على مشرف المنظومة.' });
      }
    }

    const data = await buildUserWriteData(user);

    if (!existing && !data.passwordHash) {
      // إنشاء حساب جديد بدون كلمة مرور أولية — نرفض بدل توليد كلمة افتراضية ضعيفة صامتة
      return res.status(400).json({ error: 'يجب تحديد كلمة مرور أولية عند إنشاء حساب جديد.' });
    }

    const saved = existing
      ? await prisma.user.update({ where: { id: user.id }, data })
      : await prisma.user.create({ data: { id: user.id, ...data } });

    await triggerAutoAssignment(saved);

    res.json({ success: true, user: isSelf || isAdmin ? sanitizeOwnUser(saved) : sanitizeUser(saved) });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'البريد الإلكتروني أو اسم المستخدم مستخدم بالفعل.' });
    }
    console.error('Error saving user:', err);
    res.status(500).json({ error: 'تعذر حفظ بيانات المستخدم.' });
  }
});

apiRouter.post('/db/users/batch', requireRole('admin'), async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'قائمة المستخدمين غير صحيحة' });
  }
  try {
    for (const u of users) {
      if (!u.id) continue;
      const existing = await prisma.user.findUnique({ where: { id: u.id } });
      const data = await buildUserWriteData(u);
      let saved = null;
      if (existing) {
        saved = await prisma.user.update({ where: { id: u.id }, data });
      } else if (data.passwordHash) {
        saved = await prisma.user.create({ data: { id: u.id, ...data } });
      }
      // مستخدم جديد بدون كلمة مرور ضمن دفعة جماعية يُتجاهل بدل رفض الدفعة كاملة
      if (saved) await triggerAutoAssignment(saved);
    }
    res.json({ success: true, count: users.length });
  } catch (err) {
    console.error('Error batch-saving users:', err);
    res.status(500).json({ error: 'تعذر حفظ قائمة المستخدمين.' });
  }
});

apiRouter.delete('/db/users/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    // إن كان المحذوف مفتشاً، نحتفظ بقائمة أساتذته قبل الحذف حتى نعيد مطابقتهم
    // (بمفتش آخر مطابق إن وُجد، أو حالة Pending إن لم يوجد) بدل تركهم مرتبطين بمفتش محذوف
    const affectedTeacherIds =
      existing?.role === 'inspector'
        ? (
            await prisma.inspectorAssignment.findMany({ where: { inspectorId: id }, select: { teacherId: true } })
          ).map((a) => a.teacherId)
        : [];

    await prisma.user.delete({ where: { id } });

    for (const teacherId of affectedTeacherIds) {
      await reassignTeacher(teacherId);
    }
  } catch {
    // غير موجود مسبقاً
  }
  res.json({ success: true });
});

// -----------------------------------------------------------------------
// Helper factory for the simple JSON-blob collections (lessonPlans, notebook, ...)
// كل سجل يُخزَّن كصف حقيقي في Postgres (id + JSON منظم)، وليس ملف JSON على القرص
// -----------------------------------------------------------------------
function jsonCollectionRoutes(opts: {
  path: string;
  model: any;
  bodyKey: string;
  listKey: string;
  batchBodyKey?: string;
  ownerField?: 'ownerId' | 'authorId' | 'userId' | 'senderId';
  // فلترة اختيارية لتقييد ما يظهر للمستخدم عند القراءة (خصوصية الكراس اليومي، ملاحظات
  // التفتيش، الرسائل الخاصة...) — بدونها كان أي مستخدم مسجّل دخول يستطيع قراءة بيانات الجميع
  visibleTo?: (row: any, user: { id: string; role: string; districtId: string }) => boolean;
  // افتراضياً: عند الإنشاء، حقل المالك يُفرض دائماً على هوية صاحب الطلب (منع انتحال هوية
  // كاتب المحتوى). عطّلها فقط عندما يمثّل الحقل طرفاً آخر غير المُرسل (مثل مستلم الإشعار)
  ownerAssignedByServer?: boolean;
}) {
  const { path, model, bodyKey, listKey, batchBodyKey, ownerField, visibleTo, ownerAssignedByServer = true } = opts;

  // هل يملك المستخدم صلاحية تعديل/حذف سجل موجود مسبقاً؟ (مالكه، أو admin دائماً)
  function canWrite(existing: any, user: { id: string; role: string }): boolean {
    if (!existing) return true; // سجل جديد — يُتحقق من صلاحية الإنشاء بشكل منفصل عند الحاجة
    if (user.role === 'admin') return true;
    if (!ownerField) return true;
    return existing[ownerField] === user.id;
  }

  apiRouter.get(`/db/${path}`, async (req, res) => {
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 500) : undefined;
    const offset = req.query.offset ? Math.max(Number(req.query.offset), 0) : undefined;

    const rows = await model.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
    const visible = visibleTo ? rows.filter((r: any) => visibleTo(r, req.user!)) : rows;
    res.json({ success: true, [listKey]: visible.map((r: any) => ({ ...r.data, id: r.id })) });
  });

  apiRouter.post(`/db/${path}`, async (req, res) => {
    const item = req.body[bodyKey];
    if (!item || !item.id) {
      return res.status(400).json({ error: 'بيانات غير مكتملة' });
    }

    const existing = await model.findUnique({ where: { id: item.id } });
    if (!canWrite(existing, req.user!)) {
      return res.status(403).json({ error: 'لا تملك الصلاحية لتعديل هذا العنصر.' });
    }

    const data: any = { data: item };
    // لا يمكن تغيير مالك السجل عند التعديل (منع انتحال الملكية)؛ عند الإنشاء يُنسب دائماً
    // لصاحب الطلب ما لم يكن الحقل يمثّل طرفاً آخر (مثل مستلم الإشعار)
    if (ownerField) {
      data[ownerField] = existing
        ? existing[ownerField]
        : (ownerAssignedByServer ? req.user!.id : (item[ownerField] || req.user!.id));
    }

    await model.upsert({
      where: { id: item.id },
      create: { id: item.id, ...data },
      update: data
    });
    res.json({ success: true, [bodyKey]: item });
  });

  if (batchBodyKey) {
    apiRouter.post(`/db/${path}/batch`, async (req, res) => {
      const items = req.body[batchBodyKey];
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'قائمة غير صحيحة' });
      }
      for (const item of items) {
        if (!item.id) continue;
        const existing = await model.findUnique({ where: { id: item.id } });
        if (!canWrite(existing, req.user!)) continue; // تجاهل العناصر التي لا يملك المستخدم صلاحية تعديلها

        const data: any = { data: item };
        if (ownerField) {
          data[ownerField] = existing
            ? existing[ownerField]
            : (ownerAssignedByServer ? req.user!.id : (item[ownerField] || req.user!.id));
        }
        await model.upsert({
          where: { id: item.id },
          create: { id: item.id, ...data },
          update: data
        });
      }
      res.json({ success: true, count: items.length });
    });
  }

  apiRouter.delete(`/db/${path}/:id`, async (req, res) => {
    try {
      const existing = await model.findUnique({ where: { id: req.params.id } });
      if (existing && !canWrite(existing, req.user!)) {
        return res.status(403).json({ error: 'لا تملك الصلاحية لحذف هذا العنصر.' });
      }
      await model.delete({ where: { id: req.params.id } });
    } catch {
      // غير موجود مسبقاً
    }
    res.json({ success: true });
  });
}

const isStaff = (user: { role: string }) => user.role === 'admin' || user.role === 'inspector';

// 2. Lesson Plans — خاصة بالأستاذ صاحبها، ومرئية أيضاً لطاقم الإشراف (admin/inspector)
jsonCollectionRoutes({
  path: 'lesson-plans',
  model: prisma.lessonPlan,
  bodyKey: 'lessonPlan',
  listKey: 'lessonPlans',
  batchBodyKey: 'lessonPlans',
  ownerField: 'ownerId',
  visibleTo: (row, user) => isStaff(user) || row.ownerId === user.id
});

// 3. Daily Notebook — كراس يومي خاص بالأستاذ، لا يُعرض لبقية الأساتذة
jsonCollectionRoutes({
  path: 'notebook',
  model: prisma.notebookEntry,
  bodyKey: 'entry',
  listKey: 'dailyNotebook',
  batchBodyKey: 'dailyNotebook',
  ownerField: 'ownerId',
  visibleTo: (row, user) => isStaff(user) || row.ownerId === user.id
});

// 4. Inspector Notes — يراها كاتبها (المفتش) والأستاذ المعنيّ بها فقط، بالإضافة إلى admin
jsonCollectionRoutes({
  path: 'inspector-notes',
  model: prisma.inspectorNote,
  bodyKey: 'note',
  listKey: 'inspectorNotes',
  batchBodyKey: 'inspectorNotes',
  ownerField: 'authorId',
  visibleTo: (row, user) =>
    user.role === 'admin' || row.authorId === user.id || row.data?.teacherId === user.id
});

// 5. District Group Chat — تُعرض ضمن نطاق مقاطعة المستخدم (districtId) فقط
jsonCollectionRoutes({
  path: 'district-messages',
  model: prisma.districtMessage,
  bodyKey: 'message',
  listKey: 'districtMessages',
  batchBodyKey: 'districtMessages',
  ownerField: 'authorId',
  visibleTo: (row, user) => user.role === 'admin' || row.data?.districtId === user.districtId
});

// 6. Direct Messages — خاصة بطرفي المحادثة فقط (المُرسل والمُستقبِل)
jsonCollectionRoutes({
  path: 'direct-messages',
  model: prisma.directMessage,
  bodyKey: 'message',
  listKey: 'directMessages',
  batchBodyKey: 'directMessages',
  ownerField: 'senderId',
  visibleTo: (row, user) => row.senderId === user.id || row.data?.receiverId === user.id
});

// 7. Community Resources — محتوى عام مشترك، يبقى مرئياً للجميع كما هو مصمَّم
jsonCollectionRoutes({
  path: 'community-resources',
  model: prisma.communityResource,
  bodyKey: 'resource',
  listKey: 'communityResources',
  batchBodyKey: 'communityResources',
  ownerField: 'authorId'
});

// 8. Community Notifications — تُعرض فقط لمستلمها أو مُرسلها
jsonCollectionRoutes({
  path: 'community-notifications',
  model: prisma.communityNotification,
  bodyKey: 'notification',
  listKey: 'communityNotifications',
  ownerField: 'userId',
  ownerAssignedByServer: false,
  visibleTo: (row, user) => user.role === 'admin' || row.userId === user.id || row.data?.senderId === user.id
});

// -----------------------------------------------------------------------
// AI Endpoints — تتطلب الآن جلسة صالحة (لم تعد مفتوحة للعموم بدون قيد)
// -----------------------------------------------------------------------

apiRouter.post('/ai/test-key', async (req, res) => {
  try {
    const customKey = (req.headers['x-custom-api-key'] as string) || req.body.apiKey;
    const result = await testGeminiApiKey(customKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ valid: false, message: 'حدث خطأ أثناء الاتصال بالخادم للتحقق من المفتاح.' });
  }
});

apiRouter.post('/ai/generate-lesson', async (req, res) => {
  try {
    const { levelName, fieldName, competencyTitle, segmentTitle, sessionTitle, sessionType, customObjective, customEquipment, customApiKey } = req.body;
    const keyToUse = (req.headers['x-custom-api-key'] as string) || customApiKey;

    if (!sessionTitle || !fieldName) {
      return res.status(400).json({ error: 'عناصر الحصة والميدان مطلوبة لتوليد المذكرة' });
    }

    const lessonData = await generatePELessonPlan({
      levelName: levelName || 'السنة الأولى ابتدائي',
      fieldName: fieldName || 'الميدان البدني',
      competencyTitle: competencyTitle || 'الكفاءة الختامية للميدان',
      segmentTitle: segmentTitle || 'المقطع التعليمي',
      sessionTitle,
      sessionType,
      customObjective,
      customEquipment,
      customApiKey: keyToUse
    });

    res.json({ success: true, data: lessonData });
  } catch (error: any) {
    console.error('Error in /ai/generate-lesson:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء توليد المذكرة، يرجى المحاولة لاحقاً.' });
  }
});

apiRouter.post('/ai/suggest-games', async (req, res) => {
  try {
    const { fieldName, levelName, customApiKey } = req.body;
    const keyToUse = (req.headers['x-custom-api-key'] as string) || customApiKey;
    const games = await suggestPEGames(fieldName || 'الميدان الجماعي', levelName || 'ابتدائي', keyToUse);
    res.json({ success: true, games });
  } catch (error: any) {
    console.error('Error in /ai/suggest-games:', error);
    res.status(500).json({ error: 'خطأ في اقتراح الألعاب، يرجى المحاولة لاحقاً.' });
  }
});

apiRouter.post('/ai/chat', async (req, res) => {
  try {
    const { message, history, customApiKey } = req.body;
    const keyToUse = (req.headers['x-custom-api-key'] as string) || customApiKey;
    if (!message) {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }
    const responseText = await generateAIChatResponse(message, history || [], keyToUse);
    res.json({ success: true, response: responseText });
  } catch (error: any) {
    console.error('Error in /ai/chat:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء المحادثة، يرجى المحاولة لاحقاً.' });
  }
});
