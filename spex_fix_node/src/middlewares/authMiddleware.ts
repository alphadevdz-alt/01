import { User } from '../types/spex';

export function isInspectorUser(user: User): boolean {
  return user.role === 'inspector' || user.role === 'admin';
}

export function isTeacherUser(user: User): boolean {
  return user.role === 'teacher' || user.role === 'admin';
}
