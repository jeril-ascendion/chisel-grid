export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://ascendion.engineering';
export const SITE_NAME = 'Ascendion Engineering';
export const SITE_DESCRIPTION = 'Engineering knowledge portal powered by ChiselGrid';
