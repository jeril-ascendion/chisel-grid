'use client';

import dynamic from 'next/dynamic';

const ArchitectureWorkspace = dynamic(
  () =>
    import('@/components/admin/architecture-workspace').then((m) => m.ArchitectureWorkspace),
  { ssr: false },
);

export default function ArchitecturePage() {
  return (
    <div className="h-[calc(100vh-7rem)]">
      <ArchitectureWorkspace />
    </div>
  );
}
