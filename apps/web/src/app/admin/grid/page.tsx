'use client';

import Link from 'next/link';
import { CurrentWorkspaceBadge } from '@/components/admin/CurrentWorkspaceBadge';

interface GridMode {
  title: string;
  desc: string;
  icon: string;
  href: string;
  borderClass: string;
  hoverClass: string;
  badge: string;
}

interface GridCard {
  title: string;
  desc: string;
  icon: string;
}

const MODES: GridMode[] = [
  {
    title: 'Architecture',
    desc: 'Interactive, validated, PCI/BSP aware',
    icon: '⬡',
    href: '/admin/grid/architecture',
    borderClass: 'border-primary/70',
    hoverClass: 'hover:border-primary hover:bg-primary/5',
    badge: 'Open →',
  },
  {
    title: 'Sketch',
    desc: 'Hand-drawn, whiteboard, quick draft',
    icon: '✎',
    href: '/admin/grid/sketch',
    borderClass: 'border-amber-400',
    hoverClass: 'hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-900/10',
    badge: 'Sketch →',
  },
  {
    title: 'Precise',
    desc: 'Enterprise, export, slides ready',
    icon: '◧',
    href: '/admin/grid/precise',
    borderClass: 'border-blue-400',
    hoverClass: 'hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10',
    badge: 'Precise →',
  },
];

const FEATURES: GridCard[] = [
  { title: 'Animated Explainers', desc: 'Step-by-step animated content walkthroughs', icon: '▶' },
  { title: 'Data Visualisations', desc: 'Charts, graphs and infographics', icon: '◈' },
  { title: 'System Maps', desc: 'Interactive topology and network maps', icon: '⬡' },
  { title: 'Timeline Views', desc: 'Roadmap and milestone visualisations', icon: '◷' },
  { title: 'Comparison Tables', desc: 'Trade-off and feature comparison grids', icon: '▦' },
];

export default function GridPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Grid</h1>
          <CurrentWorkspaceBadge />
        </div>
        <p className="text-muted-foreground mt-1">
          Create diagrams, animations, visual charts and graphs for your content
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Modes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MODES.map((mode) => (
            <Link
              key={mode.title}
              href={mode.href}
              className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
            >
              <div
                className={`rounded-xl border-2 ${mode.borderClass} ${mode.hoverClass} bg-card p-5 flex flex-col gap-3 h-full transition-colors`}
              >
                <div className="text-3xl">{mode.icon}</div>
                <div>
                  <h3 className="font-semibold text-base">{mode.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-foreground text-background w-fit">
                  {mode.badge}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Coming soon
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 h-full opacity-80"
            >
              <div className="text-3xl">{item.icon}</div>
              <div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground w-fit">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Three rendering modes share one Grid-IR pipeline. Use Chamber to draft content, then Grid generates matching visuals automatically.
        </p>
      </div>
    </div>
  );
}
