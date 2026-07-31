/**
 * SPEX - Inspector Dashboard Service
 * المنطق الحسابي والتحليلي الخاص ببوابة المفتش البيداغوجي
 */
import {
  User,
  DailyNotebookEntry,
  InspectorNote,
  InspectionVisit,
  LessonPlan,
} from '../types/spex';
import { LATE_REPORT_THRESHOLD_DAYS } from '../constants/inspectorDashboard.constants';

export interface InspectorGlobalStats {
  institutionsCount: number;
  inactiveTeachers: User[];
  lateReportTeachers: Array<{ teacher: User; daysSince: number | null }>;
  completionRate: number;
  institutionChartData: Array<{ name: string; count: number }>;
  recentActivities: ActivityFeedItem[];
}

export interface ActivityFeedItem {
  id: string;
  icon: 'note' | 'visit' | 'lesson_plan' | 'notebook';
  title: string;
  subtitle: string;
  date: string;
}

export function computeInspectorGlobalStats(
  teachers: User[],
  dailyNotebook: DailyNotebookEntry[],
  notes: InspectorNote[],
  visits: InspectionVisit[],
  lessonPlans: LessonPlan[]
): InspectorGlobalStats {
  // 1. المؤسسات المشرف عليها
  const institutionNames = Array.from(
    new Set(teachers.map((t) => t.schoolName?.trim()).filter((name): name is string => Boolean(name)))
  );
  const institutionsCount = institutionNames.length;

  // 2. الأساتذة غير النشطين
  const inactiveTeachers = teachers.filter((t) => t.status === 'inactive');

  // 3. التقارير المتأخرة
  const getTeacherLastNotebookTimestamp = (teacherId: string): number | null => {
    const entries = (dailyNotebook || []).filter((e) => e && e.teacherId === teacherId);
    const timestamps = entries
      .map((e) => new Date(e.executionDate).getTime())
      .filter((n) => Number.isFinite(n));
    if (timestamps.length === 0) return null;
    return Math.max(...timestamps);
  };

  const lateReportTeachers = teachers
    .filter((t) => t.status !== 'inactive')
    .map((t) => {
      const lastTs = getTeacherLastNotebookTimestamp(t.id);
      const daysSince = lastTs === null ? null : Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24));
      return { teacher: t, daysSince };
    })
    .filter(({ daysSince }) => daysSince === null || daysSince > LATE_REPORT_THRESHOLD_DAYS)
    .sort((a, b) => (b.daysSince ?? 9999) - (a.daysSince ?? 9999));

  // 4. نسبة الإنجاز
  const totalNotebookEntries = (dailyNotebook || []).length;
  const completedNotebookEntries = (dailyNotebook || []).filter((e) => e.status === 'منجزة').length;
  const completionRate =
    totalNotebookEntries > 0 ? Math.round((completedNotebookEntries / totalNotebookEntries) * 100) : 0;

  // 5. رسم بياني لتوزيع الأساتذة حسب المؤسسات
  const institutionCounts: Record<string, number> = {};
  teachers.forEach((t) => {
    const key = t.schoolName?.trim() || 'غير محددة';
    institutionCounts[key] = (institutionCounts[key] || 0) + 1;
  });
  const institutionChartData = Object.entries(institutionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 6. آخر النشاطات
  const recentActivities: ActivityFeedItem[] = [
    ...notes.map((n) => ({
      id: `note_${n.id}`,
      icon: 'note' as const,
      title: n.title,
      subtitle: `ملاحظة إلى الأستاذ ${n.teacherName}`,
      date: n.createdAt,
    })),
    ...visits.map((v) => {
      const t = teachers.find((tt) => tt.id === v.teacherId);
      return {
        id: `visit_${v.id}`,
        icon: 'visit' as const,
        title: v.lessonObservedTitle,
        subtitle: `زيارة ${v.visitType} — الأستاذ ${t ? `${t.firstName} ${t.lastName}` : ''}`,
        date: v.visitDate,
      };
    }),
    ...(lessonPlans || []).map((lp) => ({
      id: `lp_${lp.id}`,
      icon: 'lesson_plan' as const,
      title: lp.sessionTitle,
      subtitle: `مذكرة حصة جديدة — الأستاذ ${lp.teacherName}`,
      date: lp.createdAt,
    })),
    ...(dailyNotebook || []).map((nb) => {
      const t = teachers.find((tt) => tt.id === nb.teacherId);
      return {
        id: `nb_${nb.id}`,
        icon: 'notebook' as const,
        title: `${nb.className} — ${nb.status}`,
        subtitle: `تسجيل يوميات — الأستاذ ${t ? `${t.firstName} ${t.lastName}` : ''}`,
        date: nb.executionDate,
      };
    }),
  ]
    .filter((item) => item.date && !Number.isNaN(new Date(item.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return {
    institutionsCount,
    inactiveTeachers,
    lateReportTeachers,
    completionRate,
    institutionChartData,
    recentActivities,
  };
}
