'use client';

interface HeroAnimationProps {
  category: string;
  title?: string;
}

function CloudHero() {
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes draw-line { from { stroke-dashoffset: 200 } to { stroke-dashoffset: 0 } }
        @keyframes packet { 0% { offset-distance: 0% } 100% { offset-distance: 100% } }
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        .svc { fill: var(--bg-subtle, #F8F7F5); stroke: #C96330; stroke-width: 1.5; rx: 6; animation: fade-in 0.8s ease both; }
        .svc-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; fill: var(--ink-3, #717171); }
        .svc-title { font-family: 'IBM Plex Mono', monospace; font-size: 11px; fill: var(--ink, #111); font-weight: 500; }
        .conn { stroke: #C96330; stroke-width: 1.5; stroke-opacity: 0.5; stroke-dasharray: 200; animation: draw-line 2s ease both; fill: none; }
        .pkt { fill: #C96330; opacity: 0.7; r: 4; }
      `}</style>
      {/* API Gateway */}
      <rect className="svc" x="30" y="100" width="110" height="60" style={{ animationDelay: '0s' }} />
      <text className="svc-label" x="85" y="120" textAnchor="middle">API Gateway</text>
      <text className="svc-title" x="85" y="140" textAnchor="middle">REST</text>
      {/* Lambda */}
      <rect className="svc" x="195" y="40" width="110" height="60" style={{ animationDelay: '0.3s' }} />
      <text className="svc-label" x="250" y="60" textAnchor="middle">Lambda</text>
      <text className="svc-title" x="250" y="80" textAnchor="middle">Handler</text>
      {/* Lambda 2 */}
      <rect className="svc" x="195" y="160" width="110" height="60" style={{ animationDelay: '0.5s' }} />
      <text className="svc-label" x="250" y="180" textAnchor="middle">Lambda</text>
      <text className="svc-title" x="250" y="200" textAnchor="middle">Worker</text>
      {/* RDS */}
      <rect className="svc" x="360" y="100" width="110" height="60" style={{ animationDelay: '0.6s' }} />
      <text className="svc-label" x="415" y="120" textAnchor="middle">Aurora</text>
      <text className="svc-title" x="415" y="140" textAnchor="middle">PostgreSQL</text>
      {/* Connections */}
      <path className="conn" d="M140 130 L195 70" style={{ animationDelay: '0.8s' }} />
      <path className="conn" d="M140 130 L195 190" style={{ animationDelay: '1s' }} />
      <path className="conn" d="M305 70 L360 130" style={{ animationDelay: '1.2s' }} />
      <path className="conn" d="M305 190 L360 130" style={{ animationDelay: '1.4s' }} />
      {/* Packets */}
      <circle className="pkt" r="4" cx="0" cy="0">
        <animateMotion path="M140 130 L195 70 L305 70 L360 130" dur="3s" repeatCount="indefinite" begin="2s" />
      </circle>
      <circle className="pkt" r="3" cx="0" cy="0" opacity="0.5">
        <animateMotion path="M140 130 L195 190 L305 190 L360 130" dur="3.5s" repeatCount="indefinite" begin="2.5s" />
      </circle>
    </svg>
  );
}

function AiMlHero() {
  const inputY = [70, 140, 210];
  const hiddenY = [45, 105, 165, 225];
  const outputY = [100, 180];
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes node-act { 0%,100% { r: 8; opacity: 0.3 } 50% { r: 12; opacity: 0.7 } }
        .nn-line { stroke: var(--ink-4, #A8A8A8); stroke-opacity: 0.25; stroke-width: 1; }
        .nn-node { fill: #C96330; animation: node-act 2.5s ease-in-out infinite; }
        .nn-label { font-family: 'IBM Plex Mono', monospace; font-size: 9px; fill: var(--ink-3, #717171); }
      `}</style>
      {/* Connections input→hidden */}
      {inputY.map((iy, ii) =>
        hiddenY.map((hy, hi) => (
          <line key={`ih${ii}${hi}`} className="nn-line" x1="120" y1={iy} x2="250" y2={hy} />
        ))
      )}
      {/* Connections hidden→output */}
      {hiddenY.map((hy, hi) =>
        outputY.map((oy, oi) => (
          <line key={`ho${hi}${oi}`} className="nn-line" x1="250" y1={hy} x2="380" y2={oy} />
        ))
      )}
      {/* Input layer */}
      <text className="nn-label" x="120" y="30" textAnchor="middle">Input</text>
      {inputY.map((y, i) => (
        <circle key={`i${i}`} className="nn-node" cx="120" cy={y} r="8" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      {/* Hidden layer */}
      <text className="nn-label" x="250" y="25" textAnchor="middle">Hidden</text>
      {hiddenY.map((y, i) => (
        <circle key={`h${i}`} className="nn-node" cx="250" cy={y} r="8" style={{ animationDelay: `${1 + i * 0.3}s` }} />
      ))}
      {/* Output layer */}
      <text className="nn-label" x="380" y="75" textAnchor="middle">Output</text>
      {outputY.map((y, i) => (
        <circle key={`o${i}`} className="nn-node" cx="380" cy={y} r="8" style={{ animationDelay: `${2 + i * 0.3}s` }} />
      ))}
      {/* Signal dot */}
      <circle fill="#C96330" r="5" opacity="0.8">
        <animateMotion path="M120 70 L250 105 L380 100" dur="2s" repeatCount="indefinite" begin="0s" />
      </circle>
      <circle fill="#C96330" r="4" opacity="0.5">
        <animateMotion path="M120 210 L250 225 L380 180" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
      </circle>
    </svg>
  );
}

function DataHero() {
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes bar-grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes flow-dot { 0% { transform: translateX(-30px); opacity: 0 } 30% { opacity: 0.8 } 70% { opacity: 0.8 } 100% { transform: translateX(30px); opacity: 0 } }
        .db-body { fill: var(--bg-subtle, #F8F7F5); stroke: #C96330; stroke-width: 1.5; }
        .db-label { font-family: 'IBM Plex Mono', monospace; font-size: 9px; fill: var(--ink-3, #717171); }
        .flow-line { stroke: #C96330; stroke-opacity: 0.35; stroke-width: 1.5; stroke-dasharray: 6 4; }
        .bar { fill: #C96330; transform-origin: bottom; animation: bar-grow 1.5s ease both; }
      `}</style>
      {/* Database cylinders */}
      {[{ x: 50, label: 'Source' }, { x: 170, label: 'Ingest' }, { x: 290, label: 'Transform' }, { x: 410, label: 'Warehouse' }].map((db, i) => (
        <g key={i}>
          <ellipse className="db-body" cx={db.x + 30} cy={140} rx="30" ry="12" />
          <rect className="db-body" x={db.x} y={140} width="60" height="40" />
          <ellipse className="db-body" cx={db.x + 30} cy={180} rx="30" ry="12" />
          <text className="db-label" x={db.x + 30} y={200} textAnchor="middle">{db.label}</text>
        </g>
      ))}
      {/* Flow lines */}
      {[110, 230, 350].map((x, i) => (
        <g key={i}>
          <line className="flow-line" x1={x} y1={160} x2={x + 60} y2={160} />
          <circle fill="#C96330" r="4" opacity="0.7" cx={x} cy={160}>
            <animate attributeName="cx" from={x} to={x + 60} dur="1.5s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
          </circle>
        </g>
      ))}
      {/* Bar chart background */}
      {[370, 390, 410, 430, 450].map((x, i) => (
        <rect key={i} className="bar" x={x} y={80 - i * 8} width="12" height={20 + i * 12} opacity="0.3" rx="2"
          style={{ animationDelay: `${1.5 + i * 0.2}s` }} />
      ))}
    </svg>
  );
}

function SoftwareHero() {
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes type-in { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0% 0 0) } }
        @keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
        .code-bg { fill: #0F0F0F; rx: 8; }
        .code-text { font-family: 'IBM Plex Mono', monospace; font-size: 12px; animation: type-in 1.5s ease both; }
        .cursor { fill: #C96330; animation: blink 1s step-end infinite; }
      `}</style>
      {/* Editor window */}
      <rect className="code-bg" x="20" y="20" width="460" height="240" />
      {/* Window buttons */}
      <circle cx="44" cy="40" r="5" fill="#FF5F57" />
      <circle cx="62" cy="40" r="5" fill="#FEBC2E" />
      <circle cx="80" cy="40" r="5" fill="#28C840" />
      {/* Code lines */}
      <text className="code-text" x="40" y="80" style={{ animationDelay: '0.3s' }}>
        <tspan fill="#C96330">import</tspan><tspan fill="#C8C8C8"> {'{'} NextAuth {'}'} </tspan><tspan fill="#C96330">from</tspan><tspan fill="#6aaa6a"> &apos;next-auth&apos;</tspan>
      </text>
      <text className="code-text" x="40" y="105" style={{ animationDelay: '0.8s' }}>
        <tspan fill="#C96330">import</tspan><tspan fill="#C8C8C8"> {'{'} CognitoProvider {'}'}</tspan>
      </text>
      <text className="code-text" x="40" y="130" style={{ animationDelay: '1.3s' }}>
        <tspan fill="#C8C8C8" opacity="0.4">{'// Configure authentication'}</tspan>
      </text>
      <text className="code-text" x="40" y="160" style={{ animationDelay: '1.8s' }}>
        <tspan fill="#C96330">export const</tspan><tspan fill="#6ab0d0"> auth</tspan><tspan fill="#C8C8C8"> = NextAuth({'{'}</tspan>
      </text>
      <text className="code-text" x="40" y="185" style={{ animationDelay: '2.3s' }}>
        <tspan fill="#C8C8C8">  providers: [CognitoProvider()]</tspan>
      </text>
      <text className="code-text" x="40" y="210" style={{ animationDelay: '2.8s' }}>
        <tspan fill="#C8C8C8">{'}'})</tspan>
      </text>
      {/* Blinking cursor */}
      <rect className="cursor" x="78" y="200" width="8" height="16" rx="1" />
    </svg>
  );
}

function ArchitectureHero() {
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes draw-comp { from { stroke-dashoffset: 300 } to { stroke-dashoffset: 0 } }
        .bp-dot { fill: var(--ink-4, #A8A8A8); opacity: 0.15; }
        .bp-box { fill: none; stroke: #C96330; stroke-width: 1.5; stroke-opacity: 0.6; rx: 6; stroke-dasharray: 300; animation: draw-comp 1.5s ease both; }
        .bp-conn { stroke: #C96330; stroke-width: 1; stroke-opacity: 0.4; stroke-dasharray: 6 3; stroke-dashoffset: 300; animation: draw-comp 1s ease both; }
        .bp-label { font-family: 'IBM Plex Mono', monospace; font-size: 9px; fill: var(--ink-3, #717171); }
      `}</style>
      {/* Blueprint dot grid */}
      {Array.from({ length: 120 }, (_, i) => {
        const col = i % 15; const row = Math.floor(i / 15);
        return <circle key={i} className="bp-dot" cx={20 + col * 33} cy={20 + row * 33} r="1.2" />;
      })}
      {/* Components */}
      <rect className="bp-box" x="40" y="50" width="100" height="50" style={{ animationDelay: '0.2s' }} />
      <text className="bp-label" x="90" y="80" textAnchor="middle">Frontend</text>
      <rect className="bp-box" x="200" y="30" width="100" height="50" style={{ animationDelay: '0.7s' }} />
      <text className="bp-label" x="250" y="60" textAnchor="middle">API Layer</text>
      <rect className="bp-box" x="200" y="130" width="100" height="50" style={{ animationDelay: '1.2s' }} />
      <text className="bp-label" x="250" y="160" textAnchor="middle">Auth Service</text>
      <rect className="bp-box" x="360" y="50" width="100" height="50" style={{ animationDelay: '1.7s' }} />
      <text className="bp-label" x="410" y="80" textAnchor="middle">Database</text>
      <rect className="bp-box" x="360" y="160" width="100" height="50" style={{ animationDelay: '2.2s' }} />
      <text className="bp-label" x="410" y="190" textAnchor="middle">Cache</text>
      {/* Connections */}
      <line className="bp-conn" x1="140" y1="75" x2="200" y2="55" style={{ animationDelay: '2.5s' }} />
      <line className="bp-conn" x1="140" y1="75" x2="200" y2="155" style={{ animationDelay: '2.7s' }} />
      <line className="bp-conn" x1="300" y1="55" x2="360" y2="75" style={{ animationDelay: '2.9s' }} />
      <line className="bp-conn" x1="300" y1="155" x2="360" y2="185" style={{ animationDelay: '3.1s' }} />
      <line className="bp-conn" x1="250" y1="80" x2="250" y2="130" style={{ animationDelay: '3.3s' }} />
    </svg>
  );
}

function CultureHero() {
  const people = [
    { x: 80, y: 80 }, { x: 200, y: 50 }, { x: 320, y: 90 },
    { x: 140, y: 190 }, { x: 280, y: 200 }, { x: 420, y: 140 },
  ];
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes person-pulse { 0%,100% { opacity: 0.35 } 50% { opacity: 0.7 } }
        @keyframes line-glow { 0%,100% { stroke-opacity: 0.15 } 50% { stroke-opacity: 0.5 } }
        .person { fill: #C96330; animation: person-pulse 3s ease-in-out infinite; }
        .team-line { stroke: #C96330; stroke-width: 1; animation: line-glow 4s ease-in-out infinite; }
      `}</style>
      {/* Connections */}
      {people.map((p1, i) =>
        people.slice(i + 1).filter((_, j) => j < 2).map((p2, j) => (
          <line key={`${i}-${j}`} className="team-line" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            style={{ animationDelay: `${(i + j) * 0.5}s` }} />
        ))
      )}
      {/* Person icons */}
      {people.map((p, i) => (
        <g key={i} className="person" style={{ animationDelay: `${i * 0.5}s` }}>
          <circle cx={p.x} cy={p.y - 10} r="10" />
          <path d={`M${p.x - 14} ${p.y + 14} Q ${p.x} ${p.y + 28} ${p.x + 14} ${p.y + 14}`} fill="none" stroke="#C96330" strokeWidth="2" strokeOpacity="0.5" />
        </g>
      ))}
    </svg>
  );
}

function SecurityHero() {
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes ring-expand { 0% { r: 30; opacity: 0.5; stroke-width: 2 } 100% { r: 100; opacity: 0; stroke-width: 0.5 } }
        .shield { fill: none; stroke: #C96330; stroke-width: 2; stroke-opacity: 0.5; }
        .ring { fill: none; stroke: #C96330; animation: ring-expand 4.5s ease-out infinite; }
        .lock { fill: #C96330; opacity: 0.5; }
      `}</style>
      {/* Shield */}
      <path className="shield" d="M250 40 L340 80 L340 160 Q340 220 250 250 Q160 220 160 160 L160 80 Z" />
      {/* Lock icon */}
      <rect className="lock" x="232" y="140" width="36" height="30" rx="4" />
      <path d="M238 140 L238 125 Q238 110 250 110 Q262 110 262 125 L262 140" fill="none" stroke="#C96330" strokeWidth="2.5" strokeOpacity="0.5" />
      <circle cx="250" cy="155" r="3" fill="#fff" opacity="0.8" />
      {/* Expanding rings */}
      <circle className="ring" cx="250" cy="150" r="30" style={{ animationDelay: '0s' }} />
      <circle className="ring" cx="250" cy="150" r="30" style={{ animationDelay: '1.5s' }} />
      <circle className="ring" cx="250" cy="150" r="30" style={{ animationDelay: '3s' }} />
    </svg>
  );
}

function PlatformHero() {
  const icons = [
    { x: 250, y: 140, label: 'CG' },
    { x: 130, y: 70, label: '☁' }, { x: 370, y: 70, label: 'AI' },
    { x: 100, y: 180, label: '</>' }, { x: 250, y: 240, label: '⚙' },
    { x: 400, y: 180, label: '📊' },
  ];
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes orbit-pulse { 0%,100% { opacity: 0.35; transform: scale(1) } 50% { opacity: 0.65; transform: scale(1.1) } }
        .orb-node { animation: orbit-pulse 3s ease-in-out infinite; }
        .orb-line { stroke: #C96330; stroke-width: 1; stroke-opacity: 0.3; }
        .orb-circ { fill: var(--bg-subtle, #F8F7F5); stroke: #C96330; stroke-width: 1.5; stroke-opacity: 0.5; }
        .orb-text { font-family: 'IBM Plex Mono', monospace; font-size: 11px; fill: var(--ink-2, #444); text-anchor: middle; dominant-baseline: central; }
      `}</style>
      {/* Lines from center to satellites */}
      {icons.slice(1).map((ic, i) => (
        <line key={i} className="orb-line" x1={250} y1={140} x2={ic.x} y2={ic.y} />
      ))}
      {/* Nodes */}
      {icons.map((ic, i) => (
        <g key={i} className="orb-node" style={{ animationDelay: `${i * 0.4}s` }}>
          <circle className="orb-circ" cx={ic.x} cy={ic.y} r={i === 0 ? 28 : 22} />
          <text className="orb-text" x={ic.x} y={ic.y}>{ic.label}</text>
        </g>
      ))}
    </svg>
  );
}

function DefaultHero() {
  return (
    <svg viewBox="0 0 500 280" width="100%" height="100%">
      <style>{`
        @keyframes dot-pulse { 0%,100% { opacity: 0.2 } 50% { opacity: 0.5 } }
        .dg { fill: #C96330; animation: dot-pulse 3s ease-in-out infinite; }
      `}</style>
      {Array.from({ length: 35 }, (_, i) => {
        const col = i % 7; const row = Math.floor(i / 7);
        return <circle key={i} className="dg" cx={50 + col * 70} cy={30 + row * 50} r="3" style={{ animationDelay: `${i * 0.1}s` }} />;
      })}
      {/* A few connecting lines */}
      {[
        [50, 30, 120, 80], [120, 80, 190, 30], [190, 30, 260, 80],
        [260, 80, 330, 130], [330, 130, 400, 80], [400, 80, 470, 130],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C96330" strokeWidth="1" strokeOpacity="0.2" />
      ))}
    </svg>
  );
}

function getHero(category: string) {
  const cat = category.toLowerCase();
  if (['cloud', 'cloud-architecture', 'aws', 'infrastructure', 'devops', 'devops-sre'].includes(cat)) return <CloudHero />;
  if (['ai', 'ai-ml', 'machine-learning'].includes(cat)) return <AiMlHero />;
  if (['security', 'compliance'].includes(cat)) return <SecurityHero />;
  if (['data', 'data-engineering', 'analytics'].includes(cat)) return <DataHero />;
  if (['system-design', 'architecture'].includes(cat)) return <ArchitectureHero />;
  if (['software', 'full-stack', 'technology'].includes(cat)) return <SoftwareHero />;
  if (['engineering-culture', 'culture', 'leadership'].includes(cat)) return <CultureHero />;
  if (cat === 'platform') return <PlatformHero />;
  return <DefaultHero />;
}

export function HeroAnimation({ category }: HeroAnimationProps) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {getHero(category)}
    </div>
  );
}
