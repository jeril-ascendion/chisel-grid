import type { Session } from 'next-auth';

export type UserRole = 'admin' | 'creator' | 'reader';

type SessionLike =
  | {
      user?: {
        groups?: string[];
        role?: string;
      } & Record<string, unknown>;
    }
  | Session
  | null
  | undefined;

export function getUserRole(session: SessionLike): UserRole | null {
  if (!session?.user) return null;
  const user = session.user as Record<string, unknown>;
  const groups =
    (user.groups as string[] | undefined) ??
    (user['cognito:groups'] as string[] | undefined) ??
    [];
  if (groups.includes('admin') || groups.includes('admins')) return 'admin';
  if (groups.includes('creator') || groups.includes('creators')) return 'creator';
  if (groups.includes('reader') || groups.includes('readers')) return 'reader';
  const role = user.role as string | undefined;
  if (role === 'admin' || role === 'creator' || role === 'reader') return role;
  return null;
}

export const permissions = {
  admin: {
    canManageUsers: true,
    canEditArticles: true,
    canApproveArticles: true,
    canUseWorkspace: true,
    canViewAnalytics: true,
    canViewAdminDashboard: true,
    canManageCategories: true,
    canManageTenantSettings: true,
  },
  creator: {
    canManageUsers: false,
    canEditArticles: true,
    canApproveArticles: true,
    canUseWorkspace: true,
    canViewAnalytics: true,
    canViewAdminDashboard: true,
    canManageCategories: true,
    canManageTenantSettings: false,
  },
  reader: {
    canManageUsers: false,
    canEditArticles: false,
    canApproveArticles: false,
    canUseWorkspace: false,
    canViewAnalytics: true,
    canViewAdminDashboard: true,
    canManageCategories: false,
    canManageTenantSettings: false,
  },
} as const;

export type Permission = keyof (typeof permissions)['admin'];

export function hasPermission(role: UserRole | null, perm: Permission): boolean {
  if (!role) return false;
  return permissions[role][perm];
}
