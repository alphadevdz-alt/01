import { User } from '../types/spex';

export const UserRepository = {
  findById(users: User[], id: string): User | undefined {
    return users.find((u) => u.id === id);
  },
  filterByRole(users: User[], role: string): User[] {
    return users.filter((u) => u.role === role);
  },
  filterActive(users: User[]): User[] {
    return users.filter((u) => u.status !== 'inactive');
  },
};
