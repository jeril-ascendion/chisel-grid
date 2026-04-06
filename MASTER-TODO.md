# CHISELGRID MASTER TODO
# Ralph Loop reads this file on every iteration to find the next unchecked task.
# Claude checks off items as they complete. Never delete items — only check them off.
# Format: - [ ] = pending, - [x] = complete, - [~] = skipped/deferred, - [!] = blocked

## EXECUTION RULES (Read before every iteration)
# 1. Find the FIRST unchecked item [ ] in the current active EPIC
# 2. Complete that task fully — write code, run commands, validate
# 3. Check it off [x] with completion note
# 4. Update project-status.md after every task
# 5. HARD STOP items require AskFollowupQuestion before proceeding
# 6. If blocked, mark [!] with reason, move to next task if possible
# 7. Output <promise>CHISELGRID_COMPLETE</promise> only when ALL items are [x] or [~]

---

## DEPENDENCY GATES
# Phase 1 (Sequential): EPIC-01 → EPIC-02 → EPIC-03
# Phase 2 (Parallel A): EPIC-04 → EPIC-05 → EPIC-07  [needs Phase 1]
# Phase 2 (Parallel B): EPIC-06 → EPIC-11            [needs Phase 1]
# Phase 2 (Parallel C): EPIC-08 → EPIC-09            [needs EPIC-03]
# Phase 3: EPIC-10, EPIC-12                           [needs Phase 2]
# Phase 4: EPIC-13 → EPIC-14 → EPIC-15               [v1.1, needs Phase 3]

---

## ═══════════════════════════════════════════════════════════
## PHASE 1 — FOUNDATION (Sequential)
## ═══════════════════════════════════════════════════════════

## EPIC-01: Foundation & Infrastructure Setup [PHASE 1]
- [x] T-01.1 Monorepo initialization — pnpm workspace, Turborepo, app scaffolding, shared packages
- [x] T-01.2 CDK app and stack skeleton — 6 stacks, env context, resource tagging
- [x] T-01.3 Networking stack — VPC, 2 AZs, NAT Gateway, VPC endpoints, security groups
- [x] T-01.4 Aurora Serverless v2 — PostgreSQL 15, private subnets, Secrets Manager credentials
- [x] T-01.5 S3 buckets and CloudFront distribution — media bucket, frontend bucket, OAC, HTTPS
- [x] T-01.6 GitHub Actions CI/CD — OIDC, PR checks, CDK diff comment, staging auto-deploy
## EPIC-01 GATE: All 6 tasks complete ✅

---

## EPIC-02: Authentication & User Management [PHASE 1]
- [x] T-02.1 Cognito User Pool CDK construct — groups (admins/creators/readers), MFA for admins, password policy, App Client ✅ CDK synth verified
- [x] T-02.2 Azure AD SSO federation — OIDC identity provider in Cognito, group claim mapping, Ascendion SSO ✅ Conditional OIDC provider via CDK context
- [x] T-02.3 NextAuth.js frontend integration — Cognito provider, login/logout pages, protected route proxy, session context ✅ typecheck passes
- [x] T-02.4 API JWT Lambda authorizer — JWKS validation, Cognito groups → IAM policy, 5-min cache, user context injection ✅ typecheck passes
- [x] T-02.5 User management API endpoints — GET /users, PATCH /users/:id/role, PATCH /users/:id/status, audit log writes ✅ typecheck passes
## EPIC-02 GATE: Cognito deployed, Admin can log in via web, JWT authorizer protecting API routes

---

## EPIC-03: Content Model & Database Schema [PHASE 1]
- [x] T-03.1 Core database schema — tenants, users, content, content_revisions, content_tags, media_assets, ai_jobs, audit_log tables via Drizzle ✅ 8 tables, typecheck passes
- [x] T-03.2 Content repository layer — typed CRUD, cursor pagination, full-text search, tenant-scoped queries ✅ ContentRepository class, typecheck passes
- [x] T-03.3 Taxonomy & engineering domain seed — Ascendion category tree (6 domains, 18 subcategories), slug generation ✅ seed script ready
- [x] T-03.4 Database migration runner — drizzle-kit generate, migrate script, seed script wired to pnpm db:* commands ✅ migration generated (10 tables)
- [x] T-03.5 Row-level security policies — Aurora PostgreSQL RLS by tenantId, verify isolation with test queries ✅ RLS SQL + verify script
## EPIC-03 GATE: All tables created, repositories type-safe, seed data applied, RLS verified

---

## ═══════════════════════════════════════════════════════════
## PHASE 2 — PARALLEL STREAMS (Start after Phase 1 complete)
## ═══════════════════════════════════════════════════════════

## EPIC-04: AI Brain — Core Agents [PHASE 2 — Stream A]
- [x] T-04.1 Bedrock client and prompt library — typed wrapper, streaming support, token usage tracking, retry with backoff ✅ BedrockClient class with invoke/stream/retry, typecheck passes
- [x] T-04.2 Writer Agent — ContentBlock[] JSON output, structured sections, code blocks, Zod schema validation ✅ WriterAgent with write/revise methods, Zod-validated output
- [x] T-04.3 Review Agent — 5-dimension scoring (accuracy/completeness/readability/SEO/depth), ReviewReport schema, revision threshold ✅ ReviewAgent with 5-dim scoring, ReviewReportSchema
- [x] T-04.4 Step Functions content pipeline — Writer → Review → revision loop → Human Gate → Publish DAG, callback token pattern ✅ CDK state machine with 6 steps, revision loop choice, waitForTaskToken
- [x] T-04.5 Diagram Agent — Mermaid code generation from architecture/process descriptions, D2 for complex diagrams ✅ DiagramAgent with Mermaid output parsing
- [x] T-04.6 SEO Agent — meta title/description, OG tags, JSON-LD schema, keyword map, internal link suggestions ✅ SEOAgent with SEOReportSchema validation
- [x] T-04.7 Human review gate — SES email notification to admins, approve/reject API endpoints, Step Functions callback resume ✅ SES notification, SendTaskSuccess/Failure callback
## EPIC-04 GATE: Writer produces valid draft, Review scores it, Step Functions pipeline runs end-to-end ✅

---

## EPIC-05: Content Creation Workspace [PHASE 2 — Stream A]
- [ ] T-05.1 AI chat interface — split-pane workspace layout, chat input with file upload, agent timeline progress component
- [ ] T-05.2 WebSocket agent streaming — API Gateway WebSocket, Lambda pushes Step Functions events to connected clients
- [ ] T-05.3 Content block preview editor — renders all ContentBlock types, inline block editing, Zustand editor state
- [ ] T-05.4 Code block renderer — Shiki server-side syntax highlighting, copy-to-clipboard, filename display
- [ ] T-05.5 Diagram block renderer — Mermaid.js client-side rendering, responsive sizing, zoom on click
- [ ] T-05.6 SEO panel — meta preview, read time, word count, keyword density display
- [ ] T-05.7 Submit flow — category/tag/slug form, uniqueness validation, draft save, submit to review queue
- [ ] T-05.8 File upload to S3 — presigned URL generation, multipart upload, progress indicator, Textract trigger for PDFs
## EPIC-05 GATE: Admin can type topic → watch agents work → see preview → edit blocks → submit

---

## EPIC-06: Reader-Facing Frontend [PHASE 2 — Stream B]
- [x] T-06.1 ChiselGrid design system — CSS custom properties, Tailwind theme extension, typography scale, dark/light mode ✅ globals.css design tokens, prose-chisel typography
- [x] T-06.2 Navigation component — top nav with category links, mobile hamburger, search bar, dark mode toggle ✅ Header, MobileMenu, ThemeToggle components
- [x] T-06.3 Article page — ISR revalidate:60, hero image, author/date/readtime, sticky ToC, audio player, related articles ✅ /articles/[slug] with ISR, ToC, audio, related
- [x] T-06.4 Content block renderer (reader) — all block types, responsive images, accessible code blocks ✅ BlockRenderer handles text/heading/code/callout/diagram
- [x] T-06.5 Homepage — hero feature article, category grid with icons, 6 recent articles, newsletter signup ✅ Hero, category grid, recent articles, newsletter CTA
- [x] T-06.6 Category listing page — paginated article cards (12/page), tag filter, breadcrumb navigation ✅ /category/[slug] with pagination, tag filter, breadcrumbs
- [x] T-06.7 Search page — full-text search via PostgreSQL tsvector, debounced input, result highlighting ✅ /search with debounced input, result highlighting
- [x] T-06.8 Article card component — hero image, title, excerpt, author avatar, date, read time, tags ✅ ArticleCard component with all fields
- [x] T-06.9 RSS feed — /feed.xml route, valid RSS 2.0, all published articles, CloudFront cache headers ✅ /feed.xml route with RSS 2.0, cache headers
- [x] T-06.10 Open Graph & JSON-LD — per-article OG tags, Article schema, BreadcrumbList, correct canonical URLs ✅ generateMetadata, JSON-LD Article + BreadcrumbList
## EPIC-06 GATE: Reader can browse homepage, navigate categories, read full articles, search content ✅

---

## EPIC-07: Admin Dashboard [PHASE 2 — Stream A]
- [ ] T-07.1 Dashboard shell — admin layout, sidebar navigation, breadcrumbs, responsive for 1280px+
- [ ] T-07.2 Content queue — in_review items table, AI quality scores display, preview link, approve/reject actions
- [ ] T-07.3 Content status board — all statuses (draft/review/approved/published/deprecated) with counts
- [ ] T-07.4 Content edit page — full block editor for existing StandardDocs, version history sidebar, publish controls
- [ ] T-07.5 User management page — user table with role/status, inline role change, deactivate/reactivate, audit log view
- [ ] T-07.6 Category management — create/edit/delete categories, drag-to-reorder hierarchy, slug management
- [ ] T-07.7 AI usage panel — tokens consumed per agent, cost estimate, per-creator usage, daily trend chart
## EPIC-07 GATE: Admin can manage all content lifecycle, users, and see AI usage metrics

---

## EPIC-08: Audio Generation Pipeline [PHASE 2 — Stream C]
- [ ] T-08.1 ContentToSSML converter — text blocks to SSML, heading emphasis, code blocks skipped, technical term pronunciation dictionary
- [ ] T-08.2 Polly Neural TTS Lambda — async Polly job, Neural voice (Matthew), MP3 to S3, audioUrl saved to content record
- [ ] T-08.3 SQS audio job queue — EventBridge rule content.published → SQS → Lambda, DLQ for failures, retry policy
- [ ] T-08.4 Audio player component — HTML5 audio, custom UI (play/pause/seek/speed), sticky bottom bar, waveform display
- [ ] T-08.5 Audio generation for migrated content — batch script triggers audio generation for all imported articles
## EPIC-08 GATE: Every published article has Polly MP3 in S3, audio player renders and plays on article page

---

## EPIC-09: Content Migration from Static Site [PHASE 2 — Stream C]
- [ ] T-09.1 Static site crawler — reads existing HTML/MD/MMD files from GitHub repo, extracts content structure
- [ ] T-09.2 Content converter — Bedrock converts HTML/MD to ContentBlock[] JSON (batched, rate-limited)
- [ ] T-09.3 Mermaid importer — .mmd files imported as DiagramBlock content blocks with captions
- [ ] T-09.4 URL slug mapper — maps existing file paths to ChiselGrid slugs, preserves SEO-critical URLs
- [ ] T-09.5 Bulk DB importer — Drizzle bulk insert with ON CONFLICT DO NOTHING, category assignment, idempotent
- [ ] T-09.6 CloudFront redirect rules — 301 redirects for any URL changes, submit updated sitemap to Google
- [ ] T-09.7 Migration validation — crawl all migrated URLs, verify HTTP 200, check content renders correctly
## EPIC-09 GATE: All existing content visible on new platform, zero 404s on existing URLs, audio generated

---

## ═══════════════════════════════════════════════════════════
## PHASE 3 — COMPLETION (After Phase 2)
## ═══════════════════════════════════════════════════════════

## EPIC-10: Testing Infrastructure [PHASE 3]
- [ ] T-10.1 Vitest unit test setup — all packages configured, AWS SDK mocked, coverage threshold 80% on packages/ai and packages/db
- [ ] T-10.2 AI agent unit tests — Writer Agent schema validation, Review Agent scoring range, Diagram Agent output format
- [ ] T-10.3 Repository integration tests — CRUD via Drizzle against test Aurora schema, pagination, full-text search
- [ ] T-10.4 API integration tests — all endpoints with valid/invalid JWT, role-based access, Zod validation errors
- [ ] T-10.5 Playwright E2E setup — configured against staging URL, screenshot on failure, CI artifact upload
- [ ] T-10.6 E2E reader flow — homepage load, article page render, search results, audio player present
- [ ] T-10.7 E2E admin flow — login, dashboard loads, content queue visible, approve/reject actions work
- [ ] T-10.8 CI test gates — PR check workflow runs unit + integration, staging deploy triggers E2E, coverage report posted
## EPIC-10 GATE: All tests pass on staging, coverage thresholds met, CI blocks on test failures

---

## EPIC-11: SEO & Performance Optimization [PHASE 2 — Stream B]
- [ ] T-11.1 Lighthouse baseline audit — run against staging, document current scores, set targets (Perf>90, Access>90, SEO>95)
- [ ] T-11.2 Core Web Vitals optimization — LCP < 2.5s, CLS < 0.1, FID < 100ms, image optimization with next/image
- [ ] T-11.3 Sitemap generation — /sitemap.xml auto-generated from published content, submitted to Google Search Console
- [ ] T-11.4 Structured data — JSON-LD Article, BreadcrumbList, Organization, WebSite schemas on all pages
- [ ] T-11.5 CloudFront cache optimization — long TTL for static assets, stale-while-revalidate headers, Brotli compression
- [ ] T-11.6 Bundle analysis — next-bundle-analyzer, identify and eliminate large dependencies, code splitting
## EPIC-11 GATE: Lighthouse scores meet targets, sitemap submitted, structured data validates in Google Rich Results Test

---

## EPIC-12: Mobile Application [PHASE 3]
- [ ] T-12.1 Expo scaffold — React Native with Expo SDK 51+, TypeScript, Expo Router file-based navigation
- [ ] T-12.2 Shared API client — packages/api-client consuming same REST endpoints as web, Zod response validation
- [ ] T-12.3 Article list screen — category tabs, infinite scroll, article cards, pull-to-refresh
- [ ] T-12.4 Article detail screen — full block renderer (native), estimated read time, tags
- [ ] T-12.5 Native audio player — expo-av, background audio, lock screen controls, playback speed
- [ ] T-12.6 Offline reading — expo-sqlite article cache, download for offline button, sync indicator
- [ ] T-12.7 Auth flow — Cognito via expo-auth-session, secure token storage (expo-secure-store), auto-refresh
- [ ] T-12.8 Push notifications — Expo Notifications + AWS SNS, topic subscriptions by category
- [ ] T-12.9 Search screen — debounced API search, recent searches stored locally
- [ ] T-12.10 App Store prep — app icons, splash screen, privacy policy, App Store Connect setup
- [ ] T-12.11 Play Store prep — signed APK, Play Console setup, content rating
## EPIC-12 GATE: App runs on iOS simulator and Android emulator, article reading and audio work, auth flow complete

---

## ═══════════════════════════════════════════════════════════
## PHASE 4 — WHITE LABEL v1.1 (After Phase 3)
## ═══════════════════════════════════════════════════════════

## EPIC-13: Multi-Tenancy Foundation [PHASE 4]
- [ ] T-13.1 Tenant data isolation — Aurora RLS by tenantId enforced on all tables, automated isolation tests
- [ ] T-13.2 Cognito per-tenant pools — CDK construct creates isolated User Pool per tenant, tenant claim in JWT
- [ ] T-13.3 CloudFront tenant routing — Lambda@Edge extracts hostname, resolves tenantId from DynamoDB Global Table
- [ ] T-13.4 Tenant branding injection — CSS custom properties injected by Lambda@Edge from tenant branding config
- [ ] T-13.5 Custom domain SSL — ACM certificate per tenant custom domain, CloudFront CNAME validation
- [ ] T-13.6 Tenant admin portal — tenant settings UI, branding config (colors, logo, fonts), feature flags
## EPIC-13 GATE: Two test tenants run on same infra with isolated data and different branding

---

## EPIC-14: Billing & White Label Onboarding [PHASE 4]
- [ ] T-14.1 Stripe integration — Stripe Subscriptions API, webhook handler (checkout.session.completed, customer.subscription.updated)
- [ ] T-14.2 Tier enforcement — starter/professional/enterprise limits enforced at API layer (AI tokens, content count, features)
- [ ] T-14.3 Usage metering — monthly token aggregation from ai_jobs table, overage calculation, billing Lambda
- [ ] T-14.4 Self-service onboarding — signup flow, Stripe checkout, Cognito pool provisioning, S3 prefix, welcome email
- [ ] T-14.5 Tenant health dashboard — uptime, API error rate, storage usage, AI budget remaining, billing status
## EPIC-14 GATE: New tenant can self-onboard, pay via Stripe, get isolated environment, see their billing

---

## EPIC-15: Analytics Dashboard [PHASE 4]
- [ ] T-15.1 Reader analytics — CloudFront access logs → Athena, pageviews, unique visitors, top articles, geographic distribution
- [ ] T-15.2 Content performance — reads per article, average read time, audio play rate, social shares, search queries
- [ ] T-15.3 Creator analytics — articles submitted/approved/rejected per creator, average quality scores, top contributors
- [ ] T-15.4 AI pipeline analytics — tokens per agent, cost per article, generation time, revision rate, quality score trends
- [ ] T-15.5 Analytics UI — chart-heavy dashboard with Recharts, date range picker, CSV export, email report schedule
## EPIC-15 GATE: Admin sees real traffic data, content metrics, and AI cost breakdown

---

## COMPLETION SIGNAL
## Output exactly: <promise>CHISELGRID_COMPLETE</promise>
## Only when every item above is marked [x] or [~]
