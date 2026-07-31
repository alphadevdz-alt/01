import { LessonPlan } from '../types/spex';

export const LessonPlanRepository = {
  findByTeacherId(plans: LessonPlan[], teacherId: string): LessonPlan[] {
    return plans.filter((p) => p.teacherId === teacherId);
  },
  findByLevel(plans: LessonPlan[], levelName: string): LessonPlan[] {
    return plans.filter((p) => p.levelName?.includes(levelName));
  },
};
