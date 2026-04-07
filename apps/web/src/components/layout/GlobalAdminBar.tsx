'use client';

import dynamic from 'next/dynamic';

const AdminBarWrapper = dynamic(
  () => import('@/components/article/AdminBarWrapper').then((m) => m.AdminBarWrapper),
  { ssr: false }
);

export function GlobalAdminBar() {
  return <AdminBarWrapper />;
}
