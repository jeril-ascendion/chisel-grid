'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const labelMap: Record<string, string> = {
  admin: 'Dashboard',
  queue: 'Content Queue',
  content: 'All Content',
  chamber: 'Chamber',
  workspace: 'Workspace',
  users: 'Users',
  categories: 'Categories',
  edit: 'Edit',
  studio: 'Studio',
  grid: 'Grid',
  architecture: 'Architecture Diagrams',
  session: 'Session',
};

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const label = labelMap[seg] ?? seg;
        const isLast = i === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            {isLast ? (
              <span className="text-gray-900 dark:text-white font-medium">{label}</span>
            ) : (
              <Link href={href} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
