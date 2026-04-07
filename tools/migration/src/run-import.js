#!/usr/bin/env node
/**
 * Self-contained taxonomy import script — runs on bastion without monorepo.
 * Reads HTML files, generates SVG animations, inserts into Aurora.
 * Usage: DATABASE_URL=... node run-import.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const SOURCE_DIR = '/tmp/taxonomy-source/dist';
const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('DATABASE_URL required'); process.exit(1); }

// ── Category mapping ────────────────────────────────────────
const URL_TO_CAT = {"ai":"ai-native-architecture","ai/architecture":"ai-architecture","ai/ethics":"ai-ethics","ai/monitoring":"ai-monitoring","ai/rag":"rag-architecture","ai/security":"ai-security","cloud":"cloud-infrastructure","cloud/architecture":"cloud-architecture","cloud/aws":"aws","cloud/azure":"azure","cloud/containerization":"containerization","cloud/gcp":"gcp","cloud/iac":"infrastructure-as-code","cloud/oracle":"oracle-cloud","security":"security","security/appsec":"application-security","security/authn-authz":"authentication-authorization","security/cloud":"cloud-security","security/encryption":"encryption","security/vulnerability":"vulnerability-management","data":"data-engineering","data/analytics":"data-analytics","data/governance":"data-governance","data/integration":"data-integration","data/lineage":"data-lineage","data/mesh":"data-mesh","data/modeling":"data-modeling","patterns":"design-patterns","patterns/data":"data-patterns","patterns/deployment":"deployment-patterns","patterns/integration":"integration-patterns","patterns/security":"security-patterns","patterns/structural":"structural-patterns","system-design":"system-design","system-design/edge-ai":"edge-ai","system-design/event-driven":"event-driven-architecture","system-design/ha-dr":"high-availability","system-design/scalable":"scalable-systems","principles":"architecture-principles","principles/ai-native":"ai-native-principles","principles/domain-specific":"domain-specific-principles","principles/foundational":"foundational-principles","principles/modernization":"modernization-principles","observability":"observability","observability/incident-response":"incident-response","observability/logs":"logging","observability/metrics":"metrics","observability/sli-slo":"sli-slo","observability/traces":"distributed-tracing","infra":"infrastructure","infra/ci-cd":"ci-cd","infra/monitoring":"infrastructure-monitoring","infra/network":"network-architecture","infra/resilience":"infrastructure-resilience","infra/security":"infrastructure-security","governance":"engineering-governance","governance/checklists":"governance-checklists","governance/review-templates":"review-templates","governance/roles":"governance-roles","governance/scorecards":"governance-scorecards","compliance":"compliance","compliance/bsp-afasa":"bsp-afasa","compliance/gdpr":"gdpr","compliance/iso27001":"iso-27001","compliance/pci-dss":"pci-dss","integration":"integration-patterns","integration/api":"api-integration","integration/event":"event-integration","integration/messaging":"messaging-integration","integration/partners":"partner-integration","integration/workflow":"workflow-integration","ddd":"domain-driven-design","ddd/aggregates":"ddd-aggregates","ddd/context-maps":"ddd-context-maps","ddd/events":"ddd-events","ddd/repositories":"ddd-repositories","design":"technical-design","design/data":"data-design","design/low-level":"low-level-design","design/performance":"performance-design","design/resilience":"resilience-design","design/security":"security-design","frameworks":"architecture-frameworks","frameworks/gartner":"gartner-framework","frameworks/internal":"internal-frameworks","frameworks/nist":"nist-framework","frameworks/togaf":"togaf","frameworks/zachman":"zachman-framework","adrs":"architecture-decision-records","adrs/ai":"ai-adrs","adrs/data":"data-adrs","adrs/platform":"platform-adrs","adrs/security":"security-adrs","maturity":"maturity-models","maturity/guidelines":"maturity-guidelines","maturity/models":"maturity-assessment","nfr":"non-functional-requirements","nfr/maintainability":"maintainability","nfr/performance":"performance-nfr","nfr/reliability":"reliability","nfr/security":"security-nfr","nfr/usability":"usability","playbooks":"engineering-playbooks","playbooks/api-lifecycle":"api-lifecycle-playbook","playbooks/migration":"migration-playbook","playbooks/resilience":"resilience-playbook","roadmaps":"technology-roadmaps","roadmaps/modernization":"modernization-roadmap","roadmaps/target-architecture":"target-architecture-roadmap","roadmaps/tech-evolution":"tech-evolution-roadmap","runbooks":"runbooks","runbooks/incident":"incident-runbook","runbooks/migration":"migration-runbook","runbooks/rollback":"rollback-runbook","scorecards":"architecture-scorecards","scorecards/architecture-review":"architecture-review-scorecard","scorecards/nfr":"nfr-scorecard","scorecards/principles":"principles-scorecard","strategy":"engineering-strategy","strategy/ai-readiness":"ai-readiness-strategy","strategy/modernization":"modernization-strategy","strategy/principles":"strategy-principles","tech":"technology","tech/ai-ml":"ai-ml-technologies","tech/angular":"angular","tech/aws":"aws-technologies","tech/azure":"azure-technologies","tech/databases":"database-technologies","tech/devops":"devops-tools","tech/gcp":"gcp-technologies","tech/java-spring":"java-spring","templates":"engineering-templates","templates/adr-template":"adr-template","templates/review-template":"review-template","templates/scorecard-template":"scorecard-template","tools":"engineering-tools","tools/ai-agents":"ai-agent-tools","tools/cli":"cli-tools","tools/scripts":"automation-scripts","tools/validators":"validation-tools","views":"architecture-views","views/deployment":"deployment-view","views/logical":"logical-view","views/physical":"physical-view","views/process":"process-view","views/scenario":"scenario-view"};

function slugToName(s) { return s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '); }

// ── HTML parsing (no cheerio - use regex for bastion simplicity) ──
function parseHtml(filePath, urlPath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)</);
  const title = (titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : urlPath).replace(/\s+/g, ' ');
  const descMatch = html.match(/class="hero-desc"[^>]*>([\s\S]*?)<\//) || html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
  const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Extract sections
  const sections = [];
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m;
  while ((m = h2Regex.exec(html)) !== null) {
    const heading = m[1].replace(/<[^>]+>/g, '').trim();
    // Get content until next h2
    const start = m.index + m[0].length;
    const nextH2 = html.indexOf('<h2', start);
    const sectionHtml = html.slice(start, nextH2 > 0 ? nextH2 : start + 5000);
    const content = sectionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
    if (heading) sections.push({ heading, level: 2, content });
  }
  if (sections.length === 0) {
    const paras = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    while ((m = pRegex.exec(html)) !== null) {
      const t = m[1].replace(/<[^>]+>/g, '').trim();
      if (t.length > 20) paras.push(t);
    }
    if (paras.length) sections.push({ heading: 'Overview', level: 2, content: paras.join('\n\n').slice(0, 3000) });
  }

  const mermaidMatch = html.match(/class="mermaid"[^>]*>([\s\S]*?)<\/div>/i);
  const mermaid = mermaidMatch ? mermaidMatch[1].trim() : null;

  return { urlPath, title, description: desc, sections, mermaidCode: mermaid };
}

// ── SVG generator (simplified) ──────────────────────────────
function generateSvg(cat) {
  const A = '#C96330', B = '#F8F7F5';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280"><style>@keyframes p{0%,100%{opacity:.35}50%{opacity:.65}}.n{fill:${A};animation:p 3s ease-in-out infinite}</style>${Array.from({length:20},(_, i)=>{const x=30+i%5*110,y=30+Math.floor(i/5)*60;return `<circle class="n" cx="${x}" cy="${y}" r="${3+i%3}" style="animation-delay:${i*.15}s"/>`}).join('')}${[[30,30,140,90],[140,90,250,30],[250,30,360,90],[360,90,470,30]].map(([x1,y1,x2,y2])=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${A}" stroke-width="1" stroke-opacity=".25"/>`).join('')}</svg>`;
}

// ── Build blocks ────────────────────────────────────────────
function buildBlocks(parsed, catSlug) {
  const blocks = [];
  blocks.push({ type: 'diagram', diagramType: 'svg', content: generateSvg(catSlug) });
  for (const s of parsed.sections) {
    blocks.push({ type: 'heading', level: s.level, content: s.heading });
    for (const p of s.content.split('\n\n').filter(x => x.trim())) {
      blocks.push({ type: 'text', content: p.trim() });
    }
  }
  if (parsed.mermaidCode) {
    blocks.push({ type: 'heading', level: 2, content: 'Architecture Diagram' });
    blocks.push({ type: 'diagram', diagramType: 'mermaid', content: parsed.mermaidCode });
  }
  return blocks;
}

// ── Discover articles ───────────────────────────────────────
function discover(dir) {
  const results = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name === 'index.html') {
        const rel = path.relative(dir, path.dirname(f));
        if (rel && rel !== '.') results.push({ filePath: f, urlPath: rel });
      }
    }
  }
  walk(dir);
  return results.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false }, max: 5 });
  const r = await pool.query('SELECT current_database() as db');
  console.log('Connected to:', r.rows[0].db);

  // Ensure tenant
  let tenantId;
  const te = await pool.query("SELECT tenant_id FROM tenants WHERE subdomain = 'ascendion'");
  if (te.rows.length > 0) { tenantId = te.rows[0].tenant_id; }
  else {
    tenantId = randomUUID();
    await pool.query("INSERT INTO tenants (tenant_id, name, subdomain, plan) VALUES ($1, $2, $3, $4)", [tenantId, 'Ascendion Engineering', 'ascendion', 'internal']);
    console.log('Created tenant:', tenantId);
  }

  // Ensure user
  let authorId;
  const ue = await pool.query("SELECT user_id FROM users WHERE email = 'migration@ascendion.engineering'");
  if (ue.rows.length > 0) { authorId = ue.rows[0].user_id; }
  else {
    authorId = randomUUID();
    await pool.query("INSERT INTO users (user_id, tenant_id, email, name, role, cognito_sub, enabled) VALUES ($1,$2,$3,$4,$5,$6,$7)", [authorId, tenantId, 'migration@ascendion.engineering', 'Taxonomy Migration', 'admin', randomUUID(), true]);
    console.log('Created user:', authorId);
  }

  // Seed categories
  const catSlugs = [...new Set(Object.values(URL_TO_CAT))];
  const catMap = new Map();
  for (const slug of catSlugs) {
    const ex = await pool.query("SELECT category_id FROM categories WHERE tenant_id = $1 AND slug = $2", [tenantId, slug]);
    if (ex.rows.length > 0) { catMap.set(slug, ex.rows[0].category_id); }
    else {
      const id = randomUUID();
      const parts = slug.split('-');
      const pSlug = Object.entries(URL_TO_CAT).find(([k, v]) => v === slug)?.[0];
      const parentUrl = pSlug?.includes('/') ? pSlug.split('/')[0] : undefined;
      const parentSlug = parentUrl ? URL_TO_CAT[parentUrl] : undefined;
      const parentId = parentSlug ? catMap.get(parentSlug) : null;
      await pool.query("INSERT INTO categories (category_id, tenant_id, name, slug, parent_id) VALUES ($1,$2,$3,$4,$5)", [id, tenantId, slugToName(slug), slug, parentId || null]);
      catMap.set(slug, id);
    }
  }
  console.log('Categories:', catMap.size);

  // Import articles
  const articles = discover(SOURCE_DIR);
  console.log('Found', articles.length, 'articles');
  let imported = 0, skipped = 0, failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const { filePath, urlPath } = articles[i];
    const slug = 'ascendion-' + urlPath.replace(/\//g, '-');
    const catSlug = URL_TO_CAT[urlPath] || 'engineering-culture';
    try {
      const ex = await pool.query("SELECT 1 FROM content WHERE tenant_id = $1 AND slug = $2", [tenantId, slug]);
      if (ex.rows.length > 0) { skipped++; continue; }

      const parsed = parseHtml(filePath, urlPath);
      const blocks = buildBlocks(parsed, catSlug);
      const readTime = Math.max(5, Math.ceil(parsed.sections.reduce((a, s) => a + s.content.length, 0) / 1500));

      await pool.query(
        "INSERT INTO content (content_id, tenant_id, author_id, title, slug, description, content_type, status, blocks, read_time_minutes, category_id, seo_meta_title, seo_meta_description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
        [randomUUID(), tenantId, authorId, parsed.title.slice(0, 500), slug.slice(0, 500), parsed.description || null, 'standard_doc', 'in_review', JSON.stringify(blocks), readTime, catMap.get(catSlug) || null, parsed.title.slice(0, 200), (parsed.description || '').slice(0, 500)]
      );
      imported++;
      if ((i + 1) % 10 === 0) console.log(`[${i + 1}/${articles.length}] ${imported} imported`);
    } catch (err) {
      failed++;
      console.error(`FAIL [${urlPath}]:`, err.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Total:', articles.length, '| Imported:', imported, '| Skipped:', skipped, '| Failed:', failed);

  // Verify
  const vc = await pool.query("SELECT count(*) as c FROM content WHERE tenant_id = $1 AND status = 'in_review'", [tenantId]);
  console.log('Total in_review:', vc.rows[0].c);
  const pub = await pool.query("SELECT count(*) as c FROM content WHERE tenant_id = $1 AND status = 'published'", [tenantId]);
  console.log('Published:', pub.rows[0].c, pub.rows[0].c === '0' ? '(correct)' : '');
  const svg = await pool.query("SELECT count(*) as c FROM content WHERE tenant_id = $1 AND blocks::text LIKE '%diagramType%svg%'", [tenantId]);
  console.log('With SVG animation:', svg.rows[0].c);

  await pool.end();
  console.log('\n=== IMPORT COMPLETE ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
