/**
 * Generate topic-specific SVG hero animations for each article category.
 * Each SVG is 500x280 viewBox with CSS keyframe animations.
 * Opacity 0.35-0.65 — clearly visible, not ambient.
 */

const ACCENT = '#C96330';
const BG = '#F8F7F5';
const INK = '#444444';
const INK3 = '#717171';

function wrap(inner: string, style: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280"><style>${style}</style>${inner}</svg>`;
}

function cloudSvg(): string {
  const style = `
    @keyframes draw{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}
    @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.7}}
    .box{fill:${BG};stroke:${ACCENT};stroke-width:1.5;rx:6;animation:pulse 3s ease-in-out infinite}
    .lbl{font:500 10px 'IBM Plex Mono',monospace;fill:${INK3}}
    .ttl{font:500 11px 'IBM Plex Mono',monospace;fill:${INK}}
    .conn{stroke:${ACCENT};stroke-width:1.5;stroke-opacity:.5;stroke-dasharray:200;animation:draw 2s ease both;fill:none}
    .pkt{fill:${ACCENT};opacity:.7}`;
  const inner = `
    <rect class="box" x="30" y="100" width="110" height="60" style="animation-delay:0s"/>
    <text class="lbl" x="85" y="120" text-anchor="middle">API Gateway</text>
    <text class="ttl" x="85" y="140" text-anchor="middle">REST</text>
    <rect class="box" x="195" y="40" width="110" height="60" style="animation-delay:.3s"/>
    <text class="lbl" x="250" y="60" text-anchor="middle">Lambda</text>
    <text class="ttl" x="250" y="80" text-anchor="middle">Handler</text>
    <rect class="box" x="195" y="160" width="110" height="60" style="animation-delay:.5s"/>
    <text class="lbl" x="250" y="180" text-anchor="middle">Lambda</text>
    <text class="ttl" x="250" y="200" text-anchor="middle">Worker</text>
    <rect class="box" x="360" y="100" width="110" height="60" style="animation-delay:.6s"/>
    <text class="lbl" x="415" y="120" text-anchor="middle">Aurora</text>
    <text class="ttl" x="415" y="140" text-anchor="middle">PostgreSQL</text>
    <path class="conn" d="M140 130 L195 70" style="animation-delay:.8s"/>
    <path class="conn" d="M140 130 L195 190" style="animation-delay:1s"/>
    <path class="conn" d="M305 70 L360 130" style="animation-delay:1.2s"/>
    <path class="conn" d="M305 190 L360 130" style="animation-delay:1.4s"/>
    <circle class="pkt" r="4"><animateMotion path="M140,130 L250,70 L360,130" dur="3s" repeatCount="indefinite" begin="2s"/></circle>
    <circle class="pkt" r="3" opacity=".5"><animateMotion path="M140,130 L250,190 L360,130" dur="3.5s" repeatCount="indefinite" begin="2.5s"/></circle>`;
  return wrap(inner, style);
}

function aiMlSvg(): string {
  const iY = [70, 140, 210], hY = [45, 105, 165, 225], oY = [100, 180];
  const style = `
    @keyframes nact{0%,100%{r:8;opacity:.3}50%{r:12;opacity:.7}}
    .nl{stroke:${INK3};stroke-opacity:.25;stroke-width:1}
    .nn{fill:${ACCENT};animation:nact 2.5s ease-in-out infinite}
    .lb{font:9px 'IBM Plex Mono',monospace;fill:${INK3}}`;
  let lines = '';
  for (const iy of iY) for (const hy of hY) lines += `<line class="nl" x1="120" y1="${iy}" x2="250" y2="${hy}"/>`;
  for (const hy of hY) for (const oy of oY) lines += `<line class="nl" x1="250" y1="${hy}" x2="380" y2="${oy}"/>`;
  let nodes = `<text class="lb" x="120" y="30" text-anchor="middle">Input</text>`;
  iY.forEach((y, i) => { nodes += `<circle class="nn" cx="120" cy="${y}" r="8" style="animation-delay:${i * .3}s"/>`; });
  nodes += `<text class="lb" x="250" y="25" text-anchor="middle">Hidden</text>`;
  hY.forEach((y, i) => { nodes += `<circle class="nn" cx="250" cy="${y}" r="8" style="animation-delay:${1 + i * .3}s"/>`; });
  nodes += `<text class="lb" x="380" y="75" text-anchor="middle">Output</text>`;
  oY.forEach((y, i) => { nodes += `<circle class="nn" cx="380" cy="${y}" r="8" style="animation-delay:${2 + i * .3}s"/>`; });
  const signal = `<circle fill="${ACCENT}" r="5" opacity=".8"><animateMotion path="M120,70 L250,105 L380,100" dur="2s" repeatCount="indefinite"/></circle>`;
  return wrap(lines + nodes + signal, style);
}

function securitySvg(): string {
  const style = `
    @keyframes rexp{0%{r:30;opacity:.5;stroke-width:2}100%{r:100;opacity:0;stroke-width:.5}}
    .sh{fill:none;stroke:${ACCENT};stroke-width:2;stroke-opacity:.5}
    .rng{fill:none;stroke:${ACCENT};animation:rexp 4.5s ease-out infinite}
    .lk{fill:${ACCENT};opacity:.5}`;
  const inner = `
    <path class="sh" d="M250 40 L340 80 L340 160 Q340 220 250 250 Q160 220 160 160 L160 80 Z"/>
    <rect class="lk" x="232" y="140" width="36" height="30" rx="4"/>
    <path d="M238 140 L238 125 Q238 110 250 110 Q262 110 262 125 L262 140" fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-opacity=".5"/>
    <circle cx="250" cy="155" r="3" fill="#fff" opacity=".8"/>
    <circle class="rng" cx="250" cy="150" r="30" style="animation-delay:0s"/>
    <circle class="rng" cx="250" cy="150" r="30" style="animation-delay:1.5s"/>
    <circle class="rng" cx="250" cy="150" r="30" style="animation-delay:3s"/>`;
  return wrap(inner, style);
}

function dataSvg(): string {
  const style = `
    @keyframes bgrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
    .db{fill:${BG};stroke:${ACCENT};stroke-width:1.5}
    .fl{stroke:${ACCENT};stroke-opacity:.35;stroke-width:1.5;stroke-dasharray:6 4}
    .lb{font:9px 'IBM Plex Mono',monospace;fill:${INK3}}
    .bar{fill:${ACCENT};transform-origin:bottom;animation:bgrow 1.5s ease both}`;
  const dbs = [{ x: 50, l: 'Source' }, { x: 170, l: 'Ingest' }, { x: 290, l: 'Transform' }, { x: 410, l: 'Warehouse' }];
  let inner = '';
  for (const d of dbs) {
    inner += `<ellipse class="db" cx="${d.x + 30}" cy="140" rx="30" ry="12"/>
    <rect class="db" x="${d.x}" y="140" width="60" height="40"/>
    <ellipse class="db" cx="${d.x + 30}" cy="180" rx="30" ry="12"/>
    <text class="lb" x="${d.x + 30}" y="200" text-anchor="middle">${d.l}</text>`;
  }
  for (const [i, x] of [110, 230, 350].entries()) {
    inner += `<line class="fl" x1="${x}" y1="160" x2="${x + 60}" y2="160"/>
    <circle fill="${ACCENT}" r="4" opacity=".7"><animate attributeName="cx" from="${x}" to="${x + 60}" dur="1.5s" repeatCount="indefinite" begin="${i * .4}s"/><animate attributeName="cy" values="160" dur="1.5s" repeatCount="indefinite"/></circle>`;
  }
  for (const [i, x] of [370, 390, 410, 430, 450].entries()) {
    inner += `<rect class="bar" x="${x}" y="${80 - i * 8}" width="12" height="${20 + i * 12}" opacity=".35" rx="2" style="animation-delay:${1.5 + i * .2}s"/>`;
  }
  return wrap(inner, style);
}

function softwareSvg(): string {
  const style = `
    @keyframes typein{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0% 0 0)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    .ct{font:12px 'IBM Plex Mono',monospace;animation:typein 1.5s ease both}
    .cur{fill:${ACCENT};animation:blink 1s step-end infinite}`;
  const inner = `
    <rect fill="#0F0F0F" x="20" y="20" width="460" height="240" rx="8"/>
    <circle cx="44" cy="40" r="5" fill="#FF5F57"/><circle cx="62" cy="40" r="5" fill="#FEBC2E"/><circle cx="80" cy="40" r="5" fill="#28C840"/>
    <text class="ct" x="40" y="80" style="animation-delay:.3s"><tspan fill="${ACCENT}">import</tspan><tspan fill="#C8C8C8"> { NextAuth } </tspan><tspan fill="${ACCENT}">from</tspan><tspan fill="#6aaa6a"> 'next-auth'</tspan></text>
    <text class="ct" x="40" y="105" style="animation-delay:.8s"><tspan fill="${ACCENT}">import</tspan><tspan fill="#C8C8C8"> { CognitoProvider }</tspan></text>
    <text class="ct" x="40" y="130" style="animation-delay:1.3s"><tspan fill="#C8C8C8" opacity=".4">// Configure authentication</tspan></text>
    <text class="ct" x="40" y="160" style="animation-delay:1.8s"><tspan fill="${ACCENT}">export const</tspan><tspan fill="#6ab0d0"> auth</tspan><tspan fill="#C8C8C8"> = NextAuth({</tspan></text>
    <text class="ct" x="40" y="185" style="animation-delay:2.3s"><tspan fill="#C8C8C8">  providers: [CognitoProvider()]</tspan></text>
    <text class="ct" x="40" y="210" style="animation-delay:2.8s"><tspan fill="#C8C8C8">})</tspan></text>
    <rect class="cur" x="78" y="200" width="8" height="16" rx="1"/>`;
  return wrap(inner, style);
}

function architectureSvg(): string {
  const style = `
    @keyframes dcomp{from{stroke-dashoffset:300}to{stroke-dashoffset:0}}
    .bd{fill:${INK3};opacity:.15}
    .bx{fill:none;stroke:${ACCENT};stroke-width:1.5;stroke-opacity:.6;rx:6;stroke-dasharray:300;animation:dcomp 1.5s ease both}
    .bc{stroke:${ACCENT};stroke-width:1;stroke-opacity:.4;stroke-dasharray:6 3;stroke-dashoffset:300;animation:dcomp 1s ease both}
    .lb{font:9px 'IBM Plex Mono',monospace;fill:${INK3}}`;
  let dots = '';
  for (let i = 0; i < 120; i++) {
    const c = i % 15, r = Math.floor(i / 15);
    dots += `<circle class="bd" cx="${20 + c * 33}" cy="${20 + r * 33}" r="1.2"/>`;
  }
  const boxes = `
    <rect class="bx" x="40" y="50" width="100" height="50" style="animation-delay:.2s"/><text class="lb" x="90" y="80" text-anchor="middle">Frontend</text>
    <rect class="bx" x="200" y="30" width="100" height="50" style="animation-delay:.7s"/><text class="lb" x="250" y="60" text-anchor="middle">API Layer</text>
    <rect class="bx" x="200" y="130" width="100" height="50" style="animation-delay:1.2s"/><text class="lb" x="250" y="160" text-anchor="middle">Auth Service</text>
    <rect class="bx" x="360" y="50" width="100" height="50" style="animation-delay:1.7s"/><text class="lb" x="410" y="80" text-anchor="middle">Database</text>
    <rect class="bx" x="360" y="160" width="100" height="50" style="animation-delay:2.2s"/><text class="lb" x="410" y="190" text-anchor="middle">Cache</text>
    <line class="bc" x1="140" y1="75" x2="200" y2="55" style="animation-delay:2.5s"/>
    <line class="bc" x1="140" y1="75" x2="200" y2="155" style="animation-delay:2.7s"/>
    <line class="bc" x1="300" y1="55" x2="360" y2="75" style="animation-delay:2.9s"/>
    <line class="bc" x1="300" y1="155" x2="360" y2="185" style="animation-delay:3.1s"/>`;
  return wrap(dots + boxes, style);
}

function cultureSvg(): string {
  const style = `
    @keyframes ppulse{0%,100%{opacity:.35}50%{opacity:.7}}
    @keyframes lglow{0%,100%{stroke-opacity:.15}50%{stroke-opacity:.5}}
    .p{fill:${ACCENT};animation:ppulse 3s ease-in-out infinite}
    .tl{stroke:${ACCENT};stroke-width:1;animation:lglow 4s ease-in-out infinite}`;
  const ppl = [{ x: 80, y: 80 }, { x: 200, y: 50 }, { x: 320, y: 90 }, { x: 140, y: 190 }, { x: 280, y: 200 }, { x: 420, y: 140 }];
  let lines = '';
  for (let i = 0; i < ppl.length; i++) {
    for (let j = i + 1; j < Math.min(i + 3, ppl.length); j++) {
      lines += `<line class="tl" x1="${ppl[i]!.x}" y1="${ppl[i]!.y}" x2="${ppl[j]!.x}" y2="${ppl[j]!.y}" style="animation-delay:${(i + j) * .3}s"/>`;
    }
  }
  let nodes = '';
  ppl.forEach((p, i) => {
    nodes += `<g class="p" style="animation-delay:${i * .5}s"><circle cx="${p.x}" cy="${p.y - 10}" r="10"/></g>`;
  });
  return wrap(lines + nodes, style);
}

function observabilitySvg(): string {
  const style = `
    @keyframes chartdraw{from{stroke-dashoffset:500}to{stroke-dashoffset:0}}
    @keyframes heartbeat{0%,40%,100%{transform:scale(1)}20%{transform:scale(1.15)}}
    .chart{stroke:${ACCENT};stroke-width:2;fill:none;stroke-dasharray:500;animation:chartdraw 3s ease forwards}
    .met{font:bold 18px 'IBM Plex Mono',monospace;fill:${ACCENT};opacity:.6}
    .lb{font:9px 'IBM Plex Mono',monospace;fill:${INK3}}
    .hb{animation:heartbeat 1.5s ease-in-out infinite}`;
  const inner = `
    <text class="lb" x="30" y="25">Latency (ms)</text>
    <path class="chart" d="M30 120 Q80 80 130 100 T230 90 T330 110 T430 85 T470 95"/>
    <line x1="30" y1="140" x2="470" y2="140" stroke="${INK3}" stroke-opacity=".2"/>
    <text class="lb" x="30" y="155">0</text><text class="lb" x="470" y="155" text-anchor="end">60s</text>
    <line x1="30" y1="95" x2="470" y2="95" stroke="red" stroke-opacity=".3" stroke-dasharray="4 4"/>
    <text class="lb" x="472" y="98" fill="red" opacity=".5">SLO</text>
    <rect x="30" y="175" width="130" height="60" rx="6" fill="${BG}" stroke="${ACCENT}" stroke-opacity=".3"/>
    <text class="lb" x="95" y="195" text-anchor="middle">Requests/s</text>
    <text class="met" x="95" y="225" text-anchor="middle" class="hb">2,847</text>
    <rect x="185" y="175" width="130" height="60" rx="6" fill="${BG}" stroke="${ACCENT}" stroke-opacity=".3"/>
    <text class="lb" x="250" y="195" text-anchor="middle">Error Rate</text>
    <text class="met" x="250" y="225" text-anchor="middle" fill="#22c55e">0.02%</text>
    <rect x="340" y="175" width="130" height="60" rx="6" fill="${BG}" stroke="${ACCENT}" stroke-opacity=".3"/>
    <text class="lb" x="405" y="195" text-anchor="middle">P99 Latency</text>
    <text class="met" x="405" y="225" text-anchor="middle">142ms</text>`;
  return wrap(inner, style);
}

function defaultSvg(): string {
  const style = `
    @keyframes dpulse{0%,100%{opacity:.2}50%{opacity:.5}}
    .dg{fill:${ACCENT};animation:dpulse 3s ease-in-out infinite}`;
  let inner = '';
  for (let i = 0; i < 35; i++) {
    const c = i % 7, r = Math.floor(i / 7);
    inner += `<circle class="dg" cx="${50 + c * 70}" cy="${30 + r * 50}" r="3" style="animation-delay:${i * .1}s"/>`;
  }
  const lines = [[50, 30, 120, 80], [120, 80, 190, 30], [190, 30, 260, 80], [260, 80, 330, 130], [330, 130, 400, 80]];
  for (const [x1, y1, x2, y2] of lines) {
    inner += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ACCENT}" stroke-width="1" stroke-opacity=".2"/>`;
  }
  return wrap(inner, style);
}

/** Map category slug to SVG generator */
export function generateHeroSvg(categorySlug: string): string {
  const cat = categorySlug.toLowerCase();

  // Cloud / Infra / DevOps
  if (['cloud-infrastructure', 'cloud-architecture', 'aws', 'azure', 'gcp', 'oracle-cloud',
       'containerization', 'infrastructure-as-code', 'infrastructure', 'ci-cd',
       'infrastructure-monitoring', 'network-architecture', 'infrastructure-resilience',
       'infrastructure-security', 'devops-tools', 'aws-technologies', 'azure-technologies',
       'gcp-technologies'].includes(cat)) return cloudSvg();

  // AI / ML / RAG
  if (['ai-native-architecture', 'ai-architecture', 'ai-ethics', 'ai-monitoring',
       'rag-architecture', 'ai-security', 'ai-native-principles', 'ai-adrs',
       'ai-ml-technologies', 'ai-agent-tools', 'ai-readiness-strategy',
       'edge-ai'].includes(cat)) return aiMlSvg();

  // Security / Compliance
  if (['security', 'application-security', 'authentication-authorization', 'cloud-security',
       'encryption', 'vulnerability-management', 'security-patterns', 'security-design',
       'security-nfr', 'security-adrs', 'compliance', 'bsp-afasa', 'gdpr',
       'iso-27001', 'pci-dss'].includes(cat)) return securitySvg();

  // Data
  if (['data-engineering', 'data-analytics', 'data-governance', 'data-integration',
       'data-lineage', 'data-mesh', 'data-modeling', 'data-patterns', 'data-design',
       'data-adrs', 'database-technologies'].includes(cat)) return dataSvg();

  // Observability
  if (['observability', 'incident-response', 'logging', 'metrics', 'sli-slo',
       'distributed-tracing'].includes(cat)) return observabilitySvg();

  // Software / Full-stack
  if (['design-patterns', 'structural-patterns', 'integration-patterns',
       'deployment-patterns', 'event-driven-architecture', 'scalable-systems',
       'high-availability', 'system-design', 'domain-driven-design',
       'ddd-aggregates', 'ddd-context-maps', 'ddd-events', 'ddd-repositories',
       'technical-design', 'low-level-design', 'performance-design', 'resilience-design',
       'angular', 'java-spring', 'api-integration', 'event-integration',
       'messaging-integration', 'partner-integration', 'workflow-integration'].includes(cat)) return softwareSvg();

  // Architecture / Frameworks / Strategy
  if (['architecture-principles', 'foundational-principles', 'modernization-principles',
       'domain-specific-principles', 'architecture-frameworks', 'gartner-framework',
       'internal-frameworks', 'nist-framework', 'togaf', 'zachman-framework',
       'architecture-decision-records', 'platform-adrs', 'architecture-views',
       'deployment-view', 'logical-view', 'physical-view', 'process-view',
       'scenario-view', 'engineering-strategy', 'modernization-strategy',
       'strategy-principles', 'target-architecture-roadmap', 'tech-evolution-roadmap',
       'modernization-roadmap'].includes(cat)) return architectureSvg();

  // Culture / Governance / Templates
  if (['engineering-governance', 'governance-checklists', 'review-templates',
       'governance-roles', 'governance-scorecards', 'engineering-playbooks',
       'api-lifecycle-playbook', 'migration-playbook', 'resilience-playbook',
       'runbooks', 'incident-runbook', 'migration-runbook', 'rollback-runbook',
       'architecture-scorecards', 'architecture-review-scorecard', 'nfr-scorecard',
       'principles-scorecard', 'engineering-templates', 'adr-template',
       'review-template', 'scorecard-template', 'engineering-tools',
       'cli-tools', 'automation-scripts', 'validation-tools',
       'technology-roadmaps', 'maturity-models', 'maturity-guidelines',
       'maturity-assessment', 'non-functional-requirements', 'maintainability',
       'performance-nfr', 'reliability', 'usability', 'technology',
       'engineering-culture'].includes(cat)) return cultureSvg();

  return defaultSvg();
}
