'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { getUserRole } from '@/lib/auth/roles';

export type UserRole = 'admin' | 'creator' | 'reader' | 'unknown';

export function useUserRole(): UserRole {
  const { data: session } = useSession();
  return useMemo(() => getUserRole(session) ?? 'unknown', [session]);
}
