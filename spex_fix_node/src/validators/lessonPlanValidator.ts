import { LessonPlan } from '../types/spex';

export function validateLessonPlan(plan: Partial<LessonPlan>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!plan.sessionTitle || plan.sessionTitle.trim().length === 0) {
    errors.push('عنوان الحصة مطلوب');
  }
  if (!plan.generalObjective || plan.generalObjective.trim().length === 0) {
    errors.push('الهدف التعلمي مطلوب');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}
