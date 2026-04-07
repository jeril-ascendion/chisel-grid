'use client';

interface TopicAnimationProps {
  category: string;
}

function CloudAnimation() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
      <style>{`
        @keyframes node-pulse { 0%,100% { r: 3; opacity: 0.05 } 50% { r: 4.5; opacity: 0.08 } }
        .np { fill: currentColor; animation: node-pulse 4s ease-in-out infinite; }
      `}</style>
      <line x1="10%" y1="30%" x2="25%" y2="60%" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
      <line x1="25%" y1="60%" x2="40%" y2="20%" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
      <line x1="40%" y1="20%" x2="55%" y2="70%" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
      <line x1="55%" y1="70%" x2="70%" y2="40%" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
      <line x1="70%" y1="40%" x2="85%" y2="25%" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
      <circle className="np" cx="10%" cy="30%" r="3" style={{ animationDelay: '0s' }} />
      <circle className="np" cx="25%" cy="60%" r="3" style={{ animationDelay: '0.8s' }} />
      <circle className="np" cx="40%" cy="20%" r="3" style={{ animationDelay: '1.6s' }} />
      <circle className="np" cx="55%" cy="70%" r="3" style={{ animationDelay: '2.4s' }} />
      <circle className="np" cx="70%" cy="40%" r="3" style={{ animationDelay: '3.2s' }} />
      <circle className="np" cx="85%" cy="25%" r="3" style={{ animationDelay: '4s' }} />
    </svg>
  );
}

function AiMlAnimation() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
      <style>{`
        @keyframes neural-flow { 0%,100% { opacity: 0.04 } 50% { opacity: 0.08 } }
        .nf { fill: currentColor; animation: neural-flow 4s ease-in-out infinite; }
      `}</style>
      {/* Layer 1 */}
      <circle className="nf" cx="30%" cy="30%" r="3" style={{ animationDelay: '0s' }} />
      <circle className="nf" cx="30%" cy="70%" r="3" style={{ animationDelay: '0s' }} />
      {/* Layer 2 */}
      <circle className="nf" cx="50%" cy="20%" r="3" style={{ animationDelay: '1s' }} />
      <circle className="nf" cx="50%" cy="50%" r="3" style={{ animationDelay: '1s' }} />
      <circle className="nf" cx="50%" cy="80%" r="3" style={{ animationDelay: '1s' }} />
      {/* Layer 3 */}
      <circle className="nf" cx="70%" cy="25%" r="3" style={{ animationDelay: '2s' }} />
      <circle className="nf" cx="70%" cy="55%" r="3" style={{ animationDelay: '2s' }} />
      <circle className="nf" cx="70%" cy="85%" r="3" style={{ animationDelay: '2s' }} />
      {/* Connections L1→L2 */}
      <line x1="30%" y1="30%" x2="50%" y2="20%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="30%" y1="30%" x2="50%" y2="50%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="30%" y1="70%" x2="50%" y2="50%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="30%" y1="70%" x2="50%" y2="80%" stroke="currentColor" strokeOpacity="0.03" />
      {/* Connections L2→L3 */}
      <line x1="50%" y1="20%" x2="70%" y2="25%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="50%" y1="50%" x2="70%" y2="55%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="50%" y1="80%" x2="70%" y2="85%" stroke="currentColor" strokeOpacity="0.03" />
    </svg>
  );
}

function SecurityAnimation() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
      <style>{`
        @keyframes shield-expand { 0% { r: 20; opacity: 0.07 } 100% { r: 80; opacity: 0 } }
        .se { fill: none; stroke: currentColor; animation: shield-expand 4.5s ease-out infinite; }
      `}</style>
      <circle className="se" cx="50%" cy="60%" r="20" style={{ animationDelay: '0s' }} />
      <circle className="se" cx="50%" cy="60%" r="20" style={{ animationDelay: '1.5s' }} />
      <circle className="se" cx="50%" cy="60%" r="20" style={{ animationDelay: '3s' }} />
    </svg>
  );
}

function DataAnimation() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
      <style>{`
        @keyframes data-flow { 0% { cx: -5% } 100% { cx: 105% } }
        .df { fill: currentColor; opacity: 0.06; animation: data-flow 5s linear infinite; }
      `}</style>
      <line x1="0" y1="25%" x2="100%" y2="25%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="0" y1="40%" x2="100%" y2="40%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="0" y1="60%" x2="100%" y2="60%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="0" y1="75%" x2="100%" y2="75%" stroke="currentColor" strokeOpacity="0.03" />
      <circle className="df" cy="25%" r="2.5" style={{ animationDelay: '0s' }} />
      <circle className="df" cy="40%" r="2.5" style={{ animationDelay: '0.7s' }} />
      <circle className="df" cy="60%" r="2.5" style={{ animationDelay: '1.4s' }} />
      <circle className="df" cy="75%" r="2.5" style={{ animationDelay: '2.1s' }} />
    </svg>
  );
}

function ArchitectureAnimation() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
      <style>{`
        @keyframes grid-in { from { stroke-dashoffset: 400 } to { stroke-dashoffset: 0 } }
        .gi { stroke: currentColor; stroke-opacity: 0.03; stroke-dasharray: 400; animation: grid-in 3s ease forwards; }
      `}</style>
      {[15, 30, 45, 60, 75, 90].map(x => (
        <line key={`v${x}`} className="gi" x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" />
      ))}
      {[25, 50, 75, 100].map(y => (
        <line key={`h${y}`} className="gi" x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} style={{ animationDelay: '0.3s' }} />
      ))}
    </svg>
  );
}

function SoftwareAnimation() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
      <style>{`
        @keyframes bracket-pulse { 0%,100% { opacity: 0.04 } 50% { opacity: 0.07 } }
        .bp { fill: none; stroke: currentColor; stroke-width: 1.5; animation: bracket-pulse 3s ease-in-out infinite; }
      `}</style>
      <text className="bp" x="15%" y="35%" fontSize="28" style={{ animationDelay: '0s' }}>&lt;</text>
      <text className="bp" x="25%" y="35%" fontSize="28" style={{ animationDelay: '0s' }}>&gt;</text>
      <text className="bp" x="45%" y="60%" fontSize="22" style={{ animationDelay: '1s' }}>&lt;</text>
      <text className="bp" x="53%" y="60%" fontSize="22" style={{ animationDelay: '1s' }}>&gt;</text>
      <text className="bp" x="72%" y="40%" fontSize="18" style={{ animationDelay: '2s' }}>&lt;</text>
      <text className="bp" x="78%" y="40%" fontSize="18" style={{ animationDelay: '2s' }}>&gt;</text>
    </svg>
  );
}

function CultureAnimation() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
      <style>{`
        @keyframes team-pulse { 0%,100% { opacity: 0.04 } 50% { opacity: 0.08 } }
        .tp { fill: currentColor; animation: team-pulse 6s ease-in-out infinite; }
      `}</style>
      {/* Connections */}
      <line x1="20%" y1="40%" x2="40%" y2="30%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="40%" y1="30%" x2="60%" y2="50%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="60%" y1="50%" x2="80%" y2="35%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="20%" y1="40%" x2="50%" y2="70%" stroke="currentColor" strokeOpacity="0.03" />
      <line x1="50%" y1="70%" x2="80%" y2="35%" stroke="currentColor" strokeOpacity="0.03" />
      {/* Person icons (head circle + shoulder arc) */}
      {[
        { x: 20, y: 40, d: 0 },
        { x: 40, y: 30, d: 1 },
        { x: 60, y: 50, d: 2 },
        { x: 80, y: 35, d: 3 },
        { x: 50, y: 70, d: 4 },
      ].map((p) => (
        <g key={p.d} className="tp" style={{ animationDelay: `${p.d * 0.8}s` }}>
          <circle cx={`${p.x}%`} cy={`${p.y}%`} r="4" />
          <path d={`M ${p.x - 1.5}% ${p.y + 3}% Q ${p.x}% ${p.y + 5}% ${p.x + 1.5}% ${p.y + 3}%`} fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.06" />
        </g>
      ))}
    </svg>
  );
}

function DefaultAnimation() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
      {Array.from({ length: 15 }, (_, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);
        return (
          <circle
            key={i}
            cx={`${15 + col * 18}%`}
            cy={`${25 + row * 25}%`}
            r="1.5"
            fill="currentColor"
            opacity="0.03"
          />
        );
      })}
    </svg>
  );
}

function getAnimation(category: string) {
  const cat = category.toLowerCase();
  if (['cloud', 'cloud-architecture', 'aws', 'infrastructure', 'devops', 'devops-sre'].includes(cat)) return <CloudAnimation />;
  if (['ai', 'ai-ml', 'machine-learning'].includes(cat)) return <AiMlAnimation />;
  if (['security'].includes(cat)) return <SecurityAnimation />;
  if (['data', 'data-engineering', 'analytics'].includes(cat)) return <DataAnimation />;
  if (['system-design', 'architecture'].includes(cat)) return <ArchitectureAnimation />;
  if (['software', 'full-stack', 'technology'].includes(cat)) return <SoftwareAnimation />;
  if (['engineering-culture', 'culture', 'leadership'].includes(cat)) return <CultureAnimation />;
  return <DefaultAnimation />;
}

export function TopicAnimation({ category }: TopicAnimationProps) {
  return (
    <div
      className="topic-animation absolute inset-0 z-0 pointer-events-none overflow-hidden text-[var(--ink,#111)]"
      aria-hidden="true"
    >
      {getAnimation(category)}
    </div>
  );
}
