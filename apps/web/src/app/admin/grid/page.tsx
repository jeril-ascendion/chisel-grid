'use client';

import Link from 'next/link';

interface GridCard {
  title: string;
  desc: string;
  icon: string;
  href?: string;
  active?: boolean;
}

const CARDS: GridCard[] = [
  {
    title: 'Architecture Diagrams',
    desc: 'C4, AWS, sequence and flow diagrams',
    icon: '⬡',
    href: '/admin/grid/architecture',
    active: true,
  },
  { title: 'Animated Explainers', desc: 'Step-by-step animated content walkthroughs', icon: '▶' },
  { title: 'Data Visualisations', desc: 'Charts, graphs and infographics', icon: '◈' },
  { title: 'System Maps', desc: 'Interactive topology and network maps', icon: '⬡' },
  { title: 'Timeline Views', desc: 'Roadmap and milestone visualisations', icon: '◷' },
  { title: 'Comparison Tables', desc: 'Trade-off and feature comparison grids', icon: '▦' },
];

export default function GridPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grid</h1>
        <p className="text-muted-foreground mt-1">
          Create diagrams, animations, visual charts and graphs for your content
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((item) => {
          const card = (
            <div
              className={`rounded-xl border p-5 flex flex-col gap-3 h-full transition-colors ${
                item.active
                  ? 'border-blue-500/60 bg-card hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                  : 'border-border bg-card opacity-80'
              }`}
            >
              <div className="text-3xl">{item.icon}</div>
              <div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
              {item.active ? (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-600 text-white w-fit">
                  Open →
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground w-fit">
                  Coming Soon
                </span>
              )}
            </div>
          );
          return item.href ? (
            <Link key={item.title} href={item.href} className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl">
              {card}
            </Link>
          ) : (
            <div key={item.title}>{card}</div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Architecture Diagrams is live. Other Grid tools are in development and will ship in upcoming milestones.
        </p>
        <p className="text-muted-foreground text-xs mt-2">
          Use Chamber to draft content, then Grid will generate matching visuals automatically.
        </p>
      </div>
    </div>
  );
}
