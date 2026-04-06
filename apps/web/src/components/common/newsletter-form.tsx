'use client';

export function NewsletterForm({ className }: { className?: string }) {
  return (
    <form
      className={className ?? 'flex gap-2'}
      onSubmit={(e) => {
        e.preventDefault();
        // TODO: Wire to newsletter API
      }}
    >
      <input
        type="email"
        placeholder="you@example.com"
        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
        aria-label="Email for newsletter"
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
      >
        Subscribe
      </button>
    </form>
  );
}
