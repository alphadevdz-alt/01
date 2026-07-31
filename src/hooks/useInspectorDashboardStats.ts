import { useMemo } from 'react';
import {
  User,
  DailyNotebookEntry,
  InspectorNote,
  InspectionVisit,
  LessonPlan,
} from '../types/spex';
import {
  computeInspectorGlobalStats,
  InspectorGlobalStats,
} from '../services/inspectorDashboard.service';

export function useInspectorDashboardStats(
  teachers: User[],
  dailyNotebook: DailyNotebookEntry[],
  notes: InspectorNote[],
  visits: InspectionVisit[],
  lessonPlans: LessonPlan[]
): InspectorGlobalStats {
  return useMemo(
    () => computeInspectorGlobalStats(teachers, dailyNotebook, notes, visits, lessonPlans),
    [teachers, dailyNotebook, notes, visits, lessonPlans]
  );
}
