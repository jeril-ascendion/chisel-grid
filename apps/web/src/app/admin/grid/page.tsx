'use client';

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
        {[
          { title: 'Architecture Diagrams', desc: 'C4, AWS, sequence and flow diagrams', icon: '⬡', status: 'Coming Soon' },
          { title: 'Animated Explainers', desc: 'Step-by-step animated content walkthroughs', icon: '▶', status: 'Coming Soon' },
          { title: 'Data Visualisations', desc: 'Charts, graphs and infographics', icon: '◈', status: 'Coming Soon' },
          { title: 'System Maps', desc: 'Interactive topology and network maps', icon: '⬡', status: 'Coming Soon' },
          { title: 'Timeline Views', desc: 'Roadmap and milestone visualisations', icon: '◷', status: 'Coming Soon' },
          { title: 'Comparison Tables', desc: 'Trade-off and feature comparison grids', icon: '▦', status: 'Coming Soon' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
            <div className="text-3xl">{item.icon}</div>
            <div>
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground w-fit">
              {item.status}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Grid visual creation tools are in development and will be available in Milestone 2.
        </p>
        <p className="text-muted-foreground text-xs mt-2">
          Use Chamber to draft content, then Grid will generate matching visuals automatically.
        </p>
      </div>
    </div>
  );
}
