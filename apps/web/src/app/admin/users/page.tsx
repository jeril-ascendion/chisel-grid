import { UsersAccessGuard } from '@/components/admin/users-access-guard';

export const metadata = { title: 'User Management' };

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage user roles and access</p>
      </div>
      <UsersAccessGuard />
    </div>
  );
}
