'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'creator' | 'reader';
  enabled: boolean;
  lastLogin: string;
}

const mockUsers: User[] = [
  { id: '1', email: 'alice@ascendion.com', name: 'Alice Chen', role: 'admin', enabled: true, lastLogin: '2026-04-06' },
  { id: '2', email: 'bob@ascendion.com', name: 'Bob Patel', role: 'creator', enabled: true, lastLogin: '2026-04-05' },
  { id: '3', email: 'carol@ascendion.com', name: 'Carol Davis', role: 'creator', enabled: true, lastLogin: '2026-04-04' },
  { id: '4', email: 'dave@ascendion.com', name: 'Dave Kim', role: 'reader', enabled: true, lastLogin: '2026-04-03' },
  { id: '5', email: 'eve@ascendion.com', name: 'Eve Johnson', role: 'creator', enabled: false, lastLogin: '2026-03-20' },
];

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  creator: 'bg-blue-100 text-blue-700',
  reader: 'bg-gray-100 text-gray-700',
};

export function UserManagement() {
  const [users, setUsers] = useState(mockUsers);

  const handleRoleChange = (userId: string, newRole: 'admin' | 'creator' | 'reader') => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    // TODO: Call API PATCH /users/:id/role
  };

  const handleToggleStatus = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, enabled: !u.enabled } : u)));
    // TODO: Call API PATCH /users/:id/status
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Last Login</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </td>
              <td className="px-4 py-3">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'creator' | 'reader')}
                  className={cn('rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer', roleColors[user.role])}
                >
                  <option value="admin">Admin</option>
                  <option value="creator">Creator</option>
                  <option value="reader">Reader</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  user.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                )}>
                  {user.enabled ? 'Active' : 'Disabled'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{user.lastLogin}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleToggleStatus(user.id)}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium',
                    user.enabled
                      ? 'border border-red-300 text-red-600 hover:bg-red-50'
                      : 'border border-green-300 text-green-600 hover:bg-green-50',
                  )}
                >
                  {user.enabled ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
