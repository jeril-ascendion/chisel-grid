'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'creator' | 'reader';
  enabled: boolean;
  lastLogin: string;
  createdAt: string;
}

const mockUsers: User[] = [
  { id: '1', email: 'alice@ascendion.com', name: 'Alice Chen', role: 'admin', enabled: true, lastLogin: '2026-04-06', createdAt: '2025-12-01' },
  { id: '2', email: 'bob@ascendion.com', name: 'Bob Patel', role: 'creator', enabled: true, lastLogin: '2026-04-05', createdAt: '2026-01-15' },
  { id: '3', email: 'carol@ascendion.com', name: 'Carol Davis', role: 'creator', enabled: true, lastLogin: '2026-04-04', createdAt: '2026-01-20' },
  { id: '4', email: 'dave@ascendion.com', name: 'Dave Kim', role: 'reader', enabled: true, lastLogin: '2026-04-03', createdAt: '2026-02-10' },
  { id: '5', email: 'eve@ascendion.com', name: 'Eve Johnson', role: 'creator', enabled: false, lastLogin: '2026-03-20', createdAt: '2026-02-15' },
];

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  creator: 'bg-blue-100 text-blue-700',
  reader: 'bg-gray-100 text-gray-700',
};

const USERS_PER_PAGE = 20;

export function UserManagement() {
  const { data: session } = useSession();
  const [users, setUsers] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Add user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'creator' | 'reader'>('reader');
  const [sendWelcome, setSendWelcome] = useState(true);
  const [addingUser, setAddingUser] = useState(false);

  const currentUserEmail = session?.user?.email;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'creator' | 'reader') => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      showToast(`Role updated to ${newRole}`);
    } catch {
      showToast('Failed to update role');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newActive = !user.enabled;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, enabled: newActive } : u)));
    try {
      await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      });
      showToast(newActive ? 'User reactivated' : 'User deactivated');
    } catch {
      showToast('Failed to update status');
    }
  };

  const handleRemoveUser = async (user: User) => {
    try {
      await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast(`User ${user.name} removed`);
    } catch {
      showToast('Failed to remove user');
    }
    setConfirmRemove(null);
  };

  const handleAddUser = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    setAddingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, role: newRole, sendWelcomeEmail: sendWelcome }),
      });
      if (res.ok) {
        const created = await res.json();
        setUsers((prev) => [...prev, { ...created, enabled: true, lastLogin: 'Never', createdAt: new Date().toISOString().split('T')[0] }]);
        showToast(`User ${newName} added successfully`);
        setShowAddModal(false);
        setNewName('');
        setNewEmail('');
        setNewRole('reader');
        setSendWelcome(true);
      } else {
        showToast('Failed to add user');
      }
    } catch {
      showToast('Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Header with search and add */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64"
          />
          <span className="text-xs text-gray-500">
            Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add User
        </button>
      </div>

      {/* User table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Last Login</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => {
              const isSelf = currentUserEmail === user.email;
              return (
                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                      {isSelf && (
                        <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-semibold">You</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'creator' | 'reader')}
                      disabled={isSelf}
                      className={cn('rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer', roleColors[user.role], isSelf && 'opacity-60 cursor-not-allowed')}
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
                  <td className="px-4 py-3 text-gray-500 text-xs">{user.createdAt}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{user.lastLogin}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isSelf && (
                        <>
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
                          <button
                            onClick={() => setConfirmRemove(user)}
                            className="rounded-md px-3 py-1 text-xs font-medium text-red-600 border border-red-300 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'creator' | 'reader')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="reader">Reader</option>
                  <option value="creator">Creator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendWelcome"
                  checked={sendWelcome}
                  onChange={(e) => setSendWelcome(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="sendWelcome" className="text-sm text-gray-700 dark:text-gray-300">Send Welcome Email</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={addingUser || !newName.trim() || !newEmail.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {addingUser ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Remove User</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Remove {confirmRemove.name} permanently? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveUser(confirmRemove)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
