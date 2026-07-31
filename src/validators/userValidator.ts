import { User } from '../types/spex';

export function validateUserData(user: Partial<User>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!user.firstName || user.firstName.trim() === '') {
    errors.push('الاسم الأول مطلوب');
  }
  if (!user.lastName || user.lastName.trim() === '') {
    errors.push('اللقب مطلوب');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}
