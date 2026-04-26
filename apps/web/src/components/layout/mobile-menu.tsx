'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Category } from '@/lib/mock-data';

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="p-2 rounded-lg hover:bg-muted transition-colors md:hidden"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-[var(--header-height)] left-0 right-0 bg-card border-b border-border shadow-lg md:hidden z-50">
          <nav className="flex flex-col p-4 gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                {cat.name}
              </Link>
            ))}
            <hr className="my-2 border-border" />
            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              Search
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
