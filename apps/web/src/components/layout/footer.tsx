import Link from 'next/link';
import { getCategories } from '@/lib/mock-data';

export function Footer() {
  const categories = getCategories();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-3">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-primary">
                <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.9" />
                <rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
                <rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
                <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
              </svg>
              Ascendion Engineering
            </Link>
            <p className="text-sm text-muted-foreground">
              Engineering knowledge portal. Deep technical content on cloud, AI, full-stack, and DevOps.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Categories</h3>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/feed.xml" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  RSS Feed
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Stay Updated</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get the latest engineering articles delivered to your inbox.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-2"
            >
              <input
                type="email"
                placeholder="you@example.com"
                className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Email for newsletter"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Ascendion. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by ChiselGrid
          </p>
        </div>
      </div>
    </footer>
  );
}
