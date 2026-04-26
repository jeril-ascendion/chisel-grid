import { cn } from '@/lib/utils';
import { contentTypeMeta } from '@/lib/content-types';

interface Props {
  contentType: string | null | undefined;
  className?: string;
}

export function ContentTypeBadge({ contentType, className }: Props) {
  const meta = contentTypeMeta(contentType);
  return (
    <span
      title={meta.description}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        meta.badge,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
