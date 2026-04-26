export const CONTENT_VIEW_STORAGE_KEY = 'cg.adminContentView';

export const CONTENT_VIEWS = [
  { id: 'table' as const, label: 'Table', href: '/admin/content' },
  { id: 'board' as const, label: 'Board', href: '/admin/content/board' },
  { id: 'timeline' as const, label: 'Timeline', href: '/admin/content/timeline' },
];

export type ContentViewId = (typeof CONTENT_VIEWS)[number]['id'];

export function pathToContentView(pathname: string): ContentViewId {
  if (pathname.startsWith('/admin/content/board')) return 'board';
  if (pathname.startsWith('/admin/content/timeline')) return 'timeline';
  return 'table';
}

export function isValidContentView(v: string | null | undefined): v is ContentViewId {
  return v === 'table' || v === 'board' || v === 'timeline';
}

export function hrefForContentView(id: ContentViewId): string {
  return CONTENT_VIEWS.find((v) => v.id === id)!.href;
}
