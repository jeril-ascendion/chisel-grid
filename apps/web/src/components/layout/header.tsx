import Link from 'next/link';
import { getCategories } from '@/lib/mock-data';
import { ThemeToggle } from './theme-toggle';
import { MobileMenu } from './mobile-menu';

export function Header() {
  const categories = getCategories();

  return (
    <header className="sticky top-0 z-40 h-[var(--header-height)] border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-primary">
            <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.9" />
            <rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
          </svg>
          <span className="hidden sm:inline">Ascendion Engineering</span>
          <span className="sm:hidden">Ascendion</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {categories.slice(0, 4).map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {cat.name}
            </Link>
          ))}
          {categories.length > 4 && (
            <span className="px-2 text-sm text-muted-foreground">
              +{categories.length - 4} more
            </span>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Link
            href="/search"
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Search articles"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </Link>
          <ThemeToggle />
          <MobileMenu categories={categories} />
        </div>
      </div>
    </header>
  );
}
