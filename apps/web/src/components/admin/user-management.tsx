'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

type UserRole = 'admin' | 'creator' | 'reader';

interface User {
  username: string;
  email: string;
  status: string;
  role: UserRole | null;
  groups: string[];
  enabled: boolean;
  createdAt: string | null;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  creator: 'Creator',
  reader: 'Reader',
};

const roleBadgeClasses: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  creator: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  reader: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300',
};

const ASCENDION_EMAIL_RE = /^[^@\s]+@ascendion\.com$/i;
const DOMAIN_ERROR = 'Email address should be part of the Ascendion domain.';

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*?';
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('');
  const chars = (pick(upper, 2) + pick(lower, 6) + pick(digits, 2) + pick(symbols, 2)).split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

interface ToastState {
  id: number;
  message: string;
  kind: 'success' | 'error';
}

export function UserManagement() {
  const { data: session } = useSession();
  const currentEmail = session?.user?.email ?? null;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null);

  const pushToast = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as { users: User[] };
      setUsers(data.users);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || (u.role ?? '').includes(q),
    );
  }, [users, search]);

  const handleToggleEnabled = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !user.enabled }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      pushToast(user.enabled ? 'User deactivated.' : 'User activated.', 'success');
      await loadUsers();
    } catch (err) {
      pushToast((err as Error).message, 'error');
    } finally {
      setConfirmDeactivate(null);
    }
  };

  const handleRemove = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.username)}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      pushToast(`User ${user.email} removed.`, 'success');
      await loadUsers();
    } catch (err) {
      pushToast((err as Error).message, 'error');
    } finally {
      setConfirmRemove(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-lg px-4 py-2 text-sm text-white shadow-lg',
              t.kind === 'success' ? 'bg-green-600' : 'bg-red-600',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-xs text-gray-500">
            {loading ? 'Loading…' : `${filtered.length} user${filtered.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Add User
        </button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          Failed to load users: {loadError}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Date added</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((u) => {
              const isSelf = currentEmail && currentEmail.toLowerCase() === u.email.toLowerCase();
              const role = u.role;
              return (
                <tr
                  key={u.username}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">{u.email}</span>
                      {isSelf && (
                        <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-semibold">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {role ? (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          roleBadgeClasses[role],
                        )}
                      >
                        {roleLabels[role]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No role</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        u.enabled
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                      )}
                    >
                      {u.enabled ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing(u)}
                        className="rounded-md px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-300 hover:bg-indigo-50 dark:text-indigo-300 dark:border-indigo-800"
                      >
                        Edit
                      </button>
                      {u.enabled ? (
                        <button
                          disabled={!!isSelf}
                          title={isSelf ? 'Cannot deactivate your own account' : undefined}
                          onClick={() => setConfirmDeactivate(u)}
                          className="rounded-md px-3 py-1 text-xs font-medium text-yellow-700 border border-yellow-300 hover:bg-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed dark:text-yellow-300 dark:border-yellow-800"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleEnabled(u)}
                          className="rounded-md px-3 py-1 text-xs font-medium text-green-700 border border-green-300 hover:bg-green-50 dark:text-green-300 dark:border-green-800"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        disabled={!!isSelf}
                        title={isSelf ? 'Cannot remove your own account' : undefined}
                        onClick={() => setConfirmRemove(u)}
                        className="rounded-md px-3 py-1 text-xs font-medium text-red-700 border border-red-300 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed dark:text-red-300 dark:border-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onCreated={async (email) => {
            setShowAdd(false);
            pushToast(`User ${email} added successfully.`, 'success');
            await loadUsers();
          }}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            const e = editing.email;
            setEditing(null);
            pushToast(`User ${e} updated.`, 'success');
            await loadUsers();
          }}
        />
      )}

      {confirmDeactivate && (
        <ConfirmDialog
          title="Deactivate user"
          message={`Deactivate ${confirmDeactivate.email}? They will not be able to sign in until reactivated.`}
          confirmLabel="Deactivate"
          confirmClass="bg-yellow-600 hover:bg-yellow-700"
          onCancel={() => setConfirmDeactivate(null)}
          onConfirm={() => handleToggleEnabled(confirmDeactivate)}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove user"
          message={`Are you sure you want to remove ${confirmRemove.email}? This cannot be undone.`}
          confirmLabel="Remove"
          confirmClass="bg-red-600 hover:bg-red-700"
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => handleRemove(confirmRemove)}
        />
      )}
    </div>
  );
}

function AddUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (email: string) => void | Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [role, setRole] = useState<UserRole>('creator');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = ASCENDION_EMAIL_RE.test(email.trim());
  const passwordValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  const canSubmit = emailValid && passwordValid && !submitting;

  const emailError = emailTouched && email.length > 0 && !emailValid ? DOMAIN_ERROR : null;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role,
          sendWelcomeEmail: sendWelcome,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to add user.');
        setSubmitting(false);
        return;
      }
      await onCreated(email.trim());
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add User</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@ascendion.com"
              autoComplete="off"
              className={cn(
                'w-full rounded-lg border bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white',
                emailError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600',
              )}
            />
            {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="admin">Admin</option>
              <option value="creator">Creator</option>
              <option value="reader">Reader</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set password"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 pr-10 text-sm text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const p = generatePassword();
                  setPassword(p);
                  setShowPassword(true);
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Generate
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Min 8 characters with uppercase, lowercase, number, and symbol.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendWelcome"
              checked={sendWelcome}
              onChange={(e) => setSendWelcome(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="sendWelcome" className="text-sm text-gray-700 dark:text-gray-300">
              Send welcome email with login credentials
            </label>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {submitting ? 'Adding…' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>(user.role ?? 'reader');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordOk =
    password === '' ||
    (password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password));

  const handleSave = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { role };
      if (password !== '') body.password = password;
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to update user.');
        setSubmitting(false);
        return;
      }
      await onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Edit User</h2>
        <p className="text-sm text-gray-500 mb-4">{user.email}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="admin">Admin</option>
              <option value="creator">Creator</option>
              <option value="reader">Reader</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password (leave blank to keep current)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 pr-10 text-sm text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {!passwordOk && (
              <p className="mt-1 text-xs text-red-600">
                Password must be at least 8 chars with uppercase, lowercase, number, and symbol.
              </p>
            )}
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !passwordOk}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmClass,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium text-white', confirmClass)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
