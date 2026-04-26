# ChiselGrid — Product Roadmap and Implementation Plan

## Vision

ChiselGrid is an AI-native Content Management Platform built for engineering organisations.
It combines a dynamic knowledge portal, an AI-agent collaboration studio (The Forge),
multi-channel distribution, and a tenant-isolated knowledge graph — all grounded in the
LLM Wiki data architecture and designed for deployment as a multi-tenant SaaS product.

The first tenant is Ascendion, deployed at ascendion.engineering, using chiselgrid.com
as the platform host.

---

## Milestone Overview

| Milestone | Name | Target Date | Status |
|-----------|------|-------------|--------|
| M1 | Portal MVP Demo | April 29 2026 | In Progress |
| M2 | Portal Production Hardening | May 30 2026 | Planned |
| M3 | Multi-tenancy Foundation | June 30 2026 | Planned |
| M4 | LLM Wiki Data Architecture | June 30 2026 | Planned |
| M5 | The Forge MVP | July 31 2026 | Planned |
| M6 | Integration Hub | September 30 2026 | Planned |
| M7 | Platform GA | October 31 2026 | Planned |

---

## MILESTONE 1 — Portal MVP Demo
**Target: April 29 2026**
**Goal: A working, polished engineering knowledge portal that can be demonstrated to Ascendion leadership and clients.**

### What is in scope
- chiselgrid.com live with real Ascendion engineering articles
- Admin authentication fully protected
- Content Queue showing readable category names
- Workspace generating and publishing articles via Bedrock
- Clean Sign In and Sign Out flow
- Homepage and category pages showing real Aurora articles

### What is out of scope
- The Forge, multi-tenancy, integrations, offline mode

---

### EPIC-01 — Admin Authentication and Route Protection
**Status: In Progress**

**TASK-01-01 — Hide admin dashboard button when not signed in**
- Subtask: Find GlobalAdminBar and ArticleAdminBar components
- Subtask: Wrap button render in session and isAdmin check
- Subtask: Use dynamic import ssr:false for auth-dependent components
- Subtask: Test unauthenticated category page shows no admin button
- Acceptance: Admin Dashboard button invisible when signed out. Visible when signed in as admin.

**TASK-01-02 — Protect all /admin/* routes from unauthenticated access**
- Subtask: Add auth check in apps/web/src/app/admin/layout.tsx
- Subtask: Redirect unauthenticated users to /login
- Subtask: Use auth() from NextAuth in server component not useSession
- Subtask: Verify /admin returns 302 redirect when no session
- Acceptance: Navigating to /admin/* without session redirects to /login immediately.

**TASK-01-03 — Fix sign in and sign out flow**
- Subtask: Verify Sign In button on nav goes to /login
- Subtask: Verify Sign Out clears session and returns to homepage
- Subtask: Verify jeril.panicker@ascendion.com can sign in successfully
- Acceptance: Full sign in and sign out cycle works without errors or loops.

---

### EPIC-02 — Content Queue Fixes
**Status: In Progress**

**TASK-02-01 — Show category names not UUIDs in Content Queue**
- Subtask: Update queue API SQL to LEFT JOIN categories table
- Subtask: Return category.name and category.slug in response JSON
- Subtask: Update queue page component to render category.name
- Acceptance: Content Queue Category column shows Cloud Architecture, AI/ML, Security etc not raw UUIDs.

**TASK-02-02 — Verify approve and reject workflow**
- Subtask: Approve one article and verify status changes to published in Aurora
- Subtask: Reject one article and verify status changes to rejected in Aurora
- Subtask: Verify approved article accessible at /articles/[slug]
- Acceptance: Approve sets status=published. Reject sets status=rejected. Both reflected immediately in queue.

---

### EPIC-03 — Article Pages Connected to Aurora
**Status: Not Started — CRITICAL FOR DEMO**

**TASK-03-01 — Homepage shows real Aurora articles**
- Subtask: Find homepage page.tsx and identify where articles are fetched
- Subtask: Replace static/mock article data with Aurora query via RDS Data API
- Subtask: Query: SELECT id, title, slug, category, ai_summary, read_time_minutes FROM content WHERE tenant_id=ascendion AND status=published ORDER BY published_at DESC LIMIT 6
- Subtask: Map Aurora response to existing article card component props
- Subtask: Handle Aurora unavailable gracefully with empty state not crash
- Acceptance: chiselgrid.com homepage shows at least 6 real Ascendion articles with real titles.

**TASK-03-02 — Category pages show real Aurora articles**
- Subtask: Find category/[slug]/page.tsx
- Subtask: Map category slug to category id via categories table
- Subtask: Query articles by category_id from Aurora
- Subtask: Verify /category/cloud-architecture shows real cloud articles
- Acceptance: Each of the 6 nav categories shows real articles from Aurora.

**TASK-03-03 — Article detail pages render real content**
- Subtask: Find articles/[slug]/page.tsx
- Subtask: Query content by slug and tenant_id from Aurora
- Subtask: Render HTML content body safely
- Subtask: Show title, category, read time, published date, ai_summary
- Acceptance: /articles/[slug] renders full article content from Aurora for any of the 155 articles.

---

### EPIC-04 — Workspace Polish
**Status: Partially Built**

**TASK-04-01 — Verify workspace generates and saves articles**
- Subtask: Test workspace at /admin/workspace with a real prompt
- Subtask: Verify Bedrock call uses anthropic.claude-sonnet-4-5
- Subtask: Verify generated article saved to Aurora with status=in_review
- Subtask: Verify article appears in Content Queue after generation
- Acceptance: Workspace generates article, saves to Aurora, appears in queue within 30 seconds.

**TASK-04-02 — Workspace UX is complete and usable**
- Subtask: Generate button clearly visible without scrolling
- Subtask: Loading state shown during generation
- Subtask: Success state navigates to content queue
- Subtask: Error state shows readable message not blank screen
- Acceptance: Full workspace flow completable by a non-technical user without confusion.

---

### EPIC-05 — Demo Readiness
**Status: Not Started**

**TASK-05-01 — ascendion.engineering DNS cutover**
- Subtask: Confirm domain transfer from jeriltech AWS account is complete
- Subtask: Add ascendion.engineering as CloudFront alias on EWLP3KOX3KKTV
- Subtask: Add ACM certificate SAN for ascendion.engineering
- Subtask: Create Route53 A record for ascendion.engineering
- Acceptance: https://ascendion.engineering loads chiselgrid.com content.

**TASK-05-02 — Smoke test all demo flows**
- Subtask: Homepage loads with real articles
- Subtask: Click article and read full content
- Subtask: Browse category and see filtered articles
- Subtask: Sign in as admin
- Subtask: View content queue with 155 articles
- Subtask: Approve one article from queue
- Subtask: Use workspace to generate a new article
- Acceptance: All 7 demo flows complete without error on chiselgrid.com.

**TASK-05-03 — Performance baseline**
- Subtask: Homepage loads under 3 seconds on a 4G connection
- Subtask: Article page loads under 2 seconds
- Subtask: No console errors on any page
- Acceptance: Lighthouse performance score above 70 on mobile.

---

## MILESTONE 2 — Portal Production Hardening
**Target: May 30 2026**
**Goal: Production-quality portal with full content management, SEO, analytics, and ascendion.engineering live as first tenant.**

### EPIC-06 — SEO and Performance
**Status: Not Started**

**TASK-06-01 — Metadata and Open Graph**
- Subtask: Dynamic page title and description per article
- Subtask: Open Graph image using article category illustration
- Subtask: Canonical URLs set correctly
- Subtask: JSON-LD structured data for articles
- Acceptance: Sharing any article on LinkedIn or Slack shows correct title, description, and image.

**TASK-06-02 — Sitemap and robots.txt**
- Subtask: Dynamic sitemap.xml generated from Aurora published articles
- Subtask: robots.txt allowing all crawlers for public pages
- Subtask: Sitemap submitted to Google Search Console
- Acceptance: sitemap.xml returns all 155 article URLs. Google Search Console shows no errors.

**TASK-06-03 — Core Web Vitals**
- Subtask: Enable CloudFront Brotli compression
- Subtask: Enable CloudFront HTTP/2
- Subtask: Lazy load images and non-critical JS
- Subtask: Lighthouse audit on homepage, category, and article pages
- Acceptance: LCP under 2.5s. CLS under 0.1. FID under 100ms on all three page types.

---

### EPIC-07 — Content Management Improvements
**Status: Not Started**

**TASK-07-01 — Bulk approve from Content Queue**
- Subtask: Add select all checkbox to queue table
- Subtask: Add Approve Selected button
- Subtask: Bulk update status=published in Aurora for selected IDs
- Acceptance: Admin can approve all 155 articles in one click.

**TASK-07-02 — Article edit after rejection**
- Subtask: Rejected articles show Edit button in queue
- Subtask: Edit page loads article content in editable form
- Subtask: Saving edit updates Aurora and sets status=in_review
- Acceptance: Rejected articles can be edited and resubmitted.

**TASK-07-03 — Article versioning**
- Subtask: Add version column to content table
- Subtask: Each edit creates new version not overwrites
- Subtask: Version history visible in article detail
- Acceptance: Admin can see previous versions of any article.

---

### EPIC-08 — Analytics Dashboard
**Status: Not Started**

**TASK-08-01 — Article view tracking**
- Subtask: POST /api/analytics/view on article page load
- Subtask: Store view in Aurora: article_id, tenant_id, viewed_at, user_agent
- Subtask: Dashboard shows views per article
- Acceptance: Each article visit increments view count visible in admin dashboard.

**TASK-08-02 — Content health dashboard**
- Subtask: Count articles by status, category, age
- Subtask: Flag articles older than 90 days as potentially stale
- Subtask: Show top 10 most viewed articles
- Acceptance: Admin dashboard shows content health metrics in real time.

---

## MILESTONE 3 — Multi-tenancy Foundation
**Target: June 30 2026**
**Goal: ChiselGrid deployable to a second client tenant with full data isolation.**

### EPIC-09 — Tenant Architecture
**Status: Not Started**

**TASK-09-01 — Tenant data model**
- Subtask: Create tenants table: id, slug, name, domain, config_json, created_at
- Subtask: Add foreign key tenant_id to all existing tables
- Subtask: Migrate existing ascendion data to tenant_id=ascendion UUID
- Subtask: Add tenant resolver middleware that extracts tenant from hostname
- Acceptance: All DB queries are scoped to resolved tenant. No cross-tenant data leakage possible.

**TASK-09-02 — Tenant resolution from hostname**
- Subtask: Middleware reads request hostname
- Subtask: Maps hostname to tenant record in tenants table
- Subtask: Sets tenant context for all downstream queries
- Subtask: Returns 404 for unknown hostnames
- Acceptance: chiselgrid.com resolves to ascendion tenant. unknown.com resolves to 404.

**TASK-09-03 — Tenant admin role separation**
- Subtask: tenant_admin role: can manage content for their tenant only
- Subtask: super_admin role: can manage all tenants
- Subtask: Cognito groups: {tenantSlug}_admin maps to tenant_admin
- Acceptance: Tenant admin cannot see or modify another tenant's content.

**TASK-09-04 — Tenant onboarding API**
- Subtask: POST /api/super-admin/tenants to create new tenant
- Subtask: Provisions Cognito group for tenant
- Subtask: Seeds default categories for tenant
- Subtask: Returns tenant config with domain and credentials
- Acceptance: New tenant can be onboarded via API call in under 2 minutes.

---

## MILESTONE 4 — LLM Wiki Data Architecture
**Target: June 30 2026**
**Goal: ChiselGrid knowledge layer built on Karpathy LLM Wiki principles with full RAG capability.**

Reference: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

### EPIC-10 — Knowledge Graph and RAG
**Status: Partially Started — ai_summary column exists**

**TASK-10-01 — Knowledge graph edges**
- Subtask: Create content_relations table: id, source_id, target_id, relation_type, weight, tenant_id
- Subtask: Relation types: references, extends, contradicts, requires, related
- Subtask: Populate initial edges from ai_summary cross-reference via Bedrock batch
- Subtask: Backlink count column on content table: times_referenced
- Acceptance: content_relations table populated. Most-referenced articles identifiable. Foundational articles surface to top.

**TASK-10-02 — Markdown export on publish**
- Subtask: On article status change to published, generate .md file
- Subtask: Include rich frontmatter: title, slug, category, tags, difficulty, audience, ai_summary, published_at, version
- Subtask: Write to S3 at /knowledge/{tenant_id}/{slug}.md
- Subtask: Regenerate on each article update
- Acceptance: Every published article has a corresponding .md in S3 within 5 seconds of publish.

**TASK-10-03 — Two-pass RAG retrieval**
- Subtask: Pass 1: query ai_summary embeddings for candidate articles (fast, low cost)
- Subtask: Pass 2: fetch full content blocks for top 3 candidates only
- Subtask: Implement via pgvector extension on Aurora
- Subtask: Add vector column to content table for ai_summary embedding
- Acceptance: RAG query returns relevant articles in under 500ms. Token cost reduced by 60 percent vs full content retrieval.

**TASK-10-04 — Knowledge gap logging**
- Subtask: Log every search query that returns zero results
- Subtask: Store in knowledge_gaps table: query, tenant_id, count, created_at
- Subtask: Admin dashboard shows top 10 knowledge gaps
- Subtask: One-click create article from knowledge gap
- Acceptance: Admin can see what readers are searching for but not finding, and act on it.

**TASK-10-05 — TOON token optimisation**
- Subtask: Implement token counting before every Bedrock call
- Subtask: Use ai_summary instead of full content wherever context is sufficient
- Subtask: Cache Bedrock responses for identical prompts via ElastiCache or DynamoDB TTL
- Subtask: Log token usage per tenant per month
- Acceptance: Average tokens per generation request reduced by 40 percent. Token cost visible in admin AI Usage dashboard.

---

## MILESTONE 5 — The Forge MVP
**Target: July 31 2026**
**Goal: The Forge collaborative AI session feature working for the Union Bank pilot with 5 sessions.**

### EPIC-11 — The Forge Core
**Status: Designed Only — See CHAMBER.md for full specification**

**TASK-11-01 — Session data model**
- Subtask: Create forge_sessions table: id, tenant_id, scenario_id, status, participants, created_at
- Subtask: Create forge_contributions table: id, session_id, speaker, utterance, competency_signals, timestamp
- Subtask: Create forge_documents table: id, session_id, document_type, content_json, generated_at
- Acceptance: Full session lifecycle storable in Aurora from creation to document generation.

**TASK-11-02 — Voice infrastructure**
- Subtask: Amazon Chime SDK session creation API
- Subtask: Amazon Transcribe Streaming connected to Chime audio
- Subtask: Speaker identification from Chime participant IDs
- Subtask: Real-time transcript delivery via WebSocket to whiteboard
- Acceptance: 4 participants in a Chime session with live transcript visible on whiteboard within 300ms latency.

**TASK-11-03 — AI agent personas via Bedrock**
- Subtask: Moderator agent: reads scenario, manages time, injects constraints at 20 minute mark
- Subtask: Devil's Advocate agent: challenges every major decision with why not X
- Subtask: Domain Expert agent: answers domain questions with specificity
- Subtask: Each agent has distinct system prompt, temperature, and behavioral rules
- Subtask: Moderator orchestrates when to invoke other agents
- Acceptance: 3 AI agents participate in session with distinct voices and behaviors indistinguishable from prepared human participants.

**TASK-11-04 — Real-time whiteboard**
- Subtask: DynamoDB table for whiteboard state: session_id, zone, components, updated_at
- Subtask: WebSocket API via API Gateway for real-time sync
- Subtask: Seven zones: Requirements, Assumptions, Constraints, Architecture Canvas, Decisions, Open Questions, Risks
- Subtask: Entity extraction from transcript populates whiteboard automatically
- Acceptance: Whiteboard updates within 500ms of spoken utterance. All 4 participants see identical state.

**TASK-11-05 — Post-session document generation**
- Subtask: Aggregate all whiteboard state at session end
- Subtask: Bedrock generates Solutions Design Document from session content
- Subtask: ADR cards generated for each decision made
- Subtask: Document saved to Aurora forge_documents and S3
- Subtask: Download as Word .docx via existing document generation pipeline
- Acceptance: Session produces a downloadable Word document within 2 minutes of session end.

**TASK-11-06 — Assessment engine**
- Subtask: Classify each utterance against 8 competency dimensions
- Subtask: Accumulate scores across session
- Subtask: Generate personal development report 48 hours post session
- Subtask: Report delivered privately to individual participant only
- Acceptance: Each participant receives private development report with specific behavioral evidence within 48 hours.

---

## MILESTONE 6 — Integration Hub
**Target: September 30 2026**

### EPIC-12 — Microsoft Ecosystem
**Status: Not Started**

**TASK-12-01 — Microsoft Teams integration**
- Subtask: Teams AI Library bot for article recommendations
- Subtask: /forge command to start a Forge session from Teams
- Subtask: Article notifications posted to Teams channel on publish
- Acceptance: Engineers can discover and read ChiselGrid articles from within Teams.

**TASK-12-02 — SharePoint content sync**
- Subtask: SharePoint connector reads documents from specified site
- Subtask: Converts Word and PDF to ChiselGrid article format
- Subtask: Syncs on schedule or on document change
- Acceptance: Documents uploaded to SharePoint appear in ChiselGrid admin queue within 15 minutes.

**TASK-12-03 — Outlook Add-in**
- Subtask: Add-in surfaces relevant ChiselGrid articles in email context
- Subtask: One-click save email thread as ChiselGrid article draft
- Acceptance: Engineers can save knowledge from email to ChiselGrid without leaving Outlook.

### EPIC-13 — Messaging Channels
**Status: Not Started**

**TASK-13-01 — Slack integration**
- Subtask: Slash command /chisel search [query]
- Subtask: Article link unfurling in Slack
- Subtask: Daily digest bot posting top articles
- Acceptance: Slack users can search and share ChiselGrid articles without leaving Slack.

**TASK-13-02 — Email digest**
- Subtask: Weekly digest email via Amazon SES
- Subtask: Personalised article recommendations per subscriber
- Subtask: Unsubscribe link and preference management
- Acceptance: Subscribers receive weekly email with 5 relevant articles based on their category preferences.

### EPIC-14 — Offline and Edge Mode
**Status: Not Started**

**TASK-14-01 — Service worker for offline reading**
- Subtask: Cache last 20 visited articles in service worker
- Subtask: Offline indicator in nav when disconnected
- Subtask: Cached articles readable without network
- Acceptance: Previously visited articles readable with no network connection.

**TASK-14-02 — Local folder sync**
- Subtask: Desktop agent watches specified local folder
- Subtask: New .md or .docx files trigger import to ChiselGrid queue
- Subtask: Available for Windows and Mac
- Acceptance: Dropping a .md file into a watched folder creates a draft article in ChiselGrid within 60 seconds.

---

## MILESTONE 7 — Platform General Availability
**Target: October 31 2026**

### EPIC-15 — Mobile Application
**Status: Scaffolded only**

**TASK-15-01 — React Native core screens**
- Subtask: Home feed with article cards
- Subtask: Article reading experience with offline support
- Subtask: Search
- Subtask: Sign in with Cognito
- Acceptance: App published to TestFlight and Google Play internal track.

**TASK-15-02 — Forge mobile participation**
- Subtask: Join Forge session from mobile
- Subtask: Voice contribution via mobile microphone
- Subtask: View whiteboard in read-only mode on mobile
- Acceptance: Mobile user can participate in Forge session as a voice contributor.

### EPIC-16 — Platform Operations
**Status: Not Started**

**TASK-16-01 — Tenant billing and metering**
- Subtask: Track token usage per tenant per month
- Subtask: Track storage per tenant
- Subtask: Track Forge sessions per tenant
- Subtask: Stripe integration for subscription billing
- Acceptance: Platform owner can see per-tenant costs and bill accordingly.

**TASK-16-02 — Platform observability**
- Subtask: CloudWatch dashboards per tenant
- Subtask: Alerts on Aurora high CPU, Lambda errors, CloudFront 5xx
- Subtask: Runbook for each alert
- Acceptance: Any production incident surfaces alert within 2 minutes.

---

## Architecture Decisions and Constraints

### Permanent Rules (from CLAUDE.md)
1. Never put useSession() in root layout.tsx — causes infinite login loops
2. Never call router.refresh() after signIn()
3. Extract user roles from Cognito JWT claims cognito:groups not AdminListGroupsForUser API
4. Use dynamic import with ssr:false for auth-dependent components in static pages
5. Never disable CloudFront distribution that is active Route53 ALIAS target

### Data Architecture Principles (LLM Wiki)
1. Every published article exports to .md in S3 at /knowledge/{tenant}/{slug}.md
2. Two-pass RAG: ai_summary for retrieval, full content for generation
3. content_relations table tracks knowledge graph edges
4. Most referenced articles are most foundational — surface them first
5. Knowledge gap logging drives the content backlog
6. TOON token optimisation on all Bedrock calls

### Tenant Isolation Rules
1. Every DB query must include WHERE tenant_id = resolved_tenant_id
2. S3 paths are prefixed with tenant_id
3. Bedrock knowledge bases are per-tenant
4. Cognito user pools or groups are per-tenant
5. No cross-tenant data is ever returned regardless of auth state

---

## Current Infrastructure Reference

See INFRASTRUCTURE.md for full AWS resource map, costs, and start/stop commands.

| Resource | Role |
|----------|------|
| Aurora Serverless v2 | Primary database |
| Lambda chiselgrid-Dev-nextjs-server | Next.js server |
| CloudFront EWLP3KOX3KKTV | chiselgrid.com UI and /api/* proxy |
| CloudFront E23TR00XJJCH02 | Lambda API direct access |
| API Gateway ux71c274nd | Lambda proxy |
| S3 chiselgrid-frontend-dev-storage | Static assets |
| Cognito ap-southeast-1_udIDE5cgD | Authentication |
| Bedrock claude-sonnet-4-5 | Content generation and AI agents |

---

## Progress Tracking

Update the Status column as work proceeds.
Statuses: Not Started, In Progress, Complete, Blocked

| EPIC | Milestone | Status |
|------|-----------|--------|
| EPIC-01 Admin Auth | M1 | In Progress |
| EPIC-02 Content Queue | M1 | In Progress |
| EPIC-03 Article Pages Aurora | M1 | Not Started |
| EPIC-04 Workspace Polish | M1 | In Progress |
| EPIC-05 Demo Readiness | M1 | Not Started |
| EPIC-06 SEO Performance | M2 | Not Started |
| EPIC-07 Content Management | M2 | Not Started |
| EPIC-08 Analytics | M2 | Not Started |
| EPIC-09 Multi-tenancy | M3 | Not Started |
| EPIC-10 LLM Wiki RAG | M4 | Not Started |
| EPIC-11 The Forge | M5 | Designed Only |
| EPIC-12 Microsoft Ecosystem | M6 | Not Started |
| EPIC-13 Messaging Channels | M6 | Not Started |
| EPIC-14 Offline Edge | M6 | Not Started |
| EPIC-15 Mobile App | M7 | Scaffolded |
| EPIC-16 Platform Operations | M7 | Not Started |

---

*Last updated: April 2026*
*Owner: Jeril Panicker, Solutions Architect, Ascendion Digital Services Philippines*
