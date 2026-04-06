# ChiselGrid — Project Status

**Last Updated:** April 7, 2026
**Current Version:** v1.1 White Label + Voice features in development

## Overall Progress

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1 — Foundation** | Infrastructure, Auth, Database Schema | COMPLETE — 16 of 16 tasks |
| **Phase 2A — AI Brain and Admin** | AI Agents, Workspace, Admin Dashboard | COMPLETE — 22 of 22 tasks |
| **Phase 2B — Reader and Audio** | Reader Frontend, Audio Pipeline | COMPLETE — 15 of 15 tasks |
| **Phase 2C — Migration and SEO** | Content Migration, SEO Optimization | NOT STARTED — 0 of 13 tasks |
| **Phase 3 — Testing and Mobile** | Testing Infrastructure, Mobile App | COMPLETE — 19 of 19 tasks |
| **Phase 4 — White Label v1.1** | Multi-tenancy, Billing, Analytics | COMPLETE — 16 of 16 tasks |
| **Phase 5B — Voice Output & Interview** | Podcast feed, Newsletter, Interview mode | COMPLETE — 8 of 8 tasks |

## Active Work

Phase 5B is complete. Both EPIC gates passed:
- **EPIC-18 Voice Output & Distribution** — Podcast RSS feed (iTunes namespace), email newsletter (table-based layout via @react-email), subscriber management (Aurora + SES suppression), email voice attachment ingest (MIME parser + S3 + transcription pipeline)
- **EPIC-19 Voice Interview Mode** — DynamoDB interview templates (5 standard seeds), guided mobile recording UI (Q&A flow, progress bar, skip/record), multi-answer processor (per-answer Step Functions, series navigation), interview scheduling (ICS calendar, SES email, Expo push reminder)

The remaining Phase 2 items (EPIC-09 Content Migration, EPIC-11 SEO Optimization) are not yet started.

## Next Milestones

- Phase 2C complete: Content Migration from static site and SEO/Performance optimization
- chiselgrid.com domain live: staging verification complete
- ascendion.engineering go-live: production cutover from static site

---

## ═══════════════════════════════════════════════════════════
## PHASE 1 — FOUNDATION
## ═══════════════════════════════════════════════════════════

## EPIC-01: Foundation and Infrastructure Setup [Phase 1]

**Status: COMPLETE**

This epic establishes the entire project foundation — the pnpm monorepo with Turborepo, all CDK infrastructure stacks, networking, database, storage, and CI/CD pipelines. Without this epic, nothing else can be built. It creates the VPC, Aurora Serverless v2 PostgreSQL cluster, S3 buckets, CloudFront distribution, and GitHub Actions workflows that all subsequent work depends on.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-01.1 | Monorepo initialization — pnpm workspace, Turborepo, app scaffolding, shared packages | Platform Engineer | Medium | 8 | COMPLETE |
| T-01.2 | CDK app and stack skeleton — 6 stacks, env context, resource tagging | Platform Engineer | Medium | 6 | COMPLETE |
| T-01.3 | Networking stack — VPC, 2 AZs, NAT Gateway, VPC endpoints, security groups | Platform Engineer | High | 10 | COMPLETE |
| T-01.4 | Aurora Serverless v2 — PostgreSQL 15, private subnets, Secrets Manager credentials | Platform Engineer | High | 8 | COMPLETE |
| T-01.5 | S3 buckets and CloudFront distribution — media bucket, frontend bucket, OAC, HTTPS | Platform Engineer | Medium | 6 | COMPLETE |
| T-01.6 | GitHub Actions CI/CD — OIDC, PR checks, CDK diff comment, staging auto-deploy | DevOps Engineer | Medium | 8 | COMPLETE |

**EPIC-01 GATE: VERIFIED** — All 6 stacks synthesize, VPC deployed, Aurora accessible, S3/CloudFront serving, CI/CD running.

---

## EPIC-02: Authentication and User Management [Phase 1]

**Status: COMPLETE**

This epic implements the entire authentication and authorization layer. Cognito User Pools provide identity management with three groups (admins, creators, readers). Azure AD SSO federation allows Ascendion employees to log in with their corporate credentials. NextAuth.js handles the frontend auth flow, and a Lambda authorizer validates JWTs on every API request.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-02.1 | Cognito User Pool CDK construct — groups, MFA for admins, password policy, App Client | Platform Engineer | High | 8 | COMPLETE |
| T-02.2 | Azure AD SSO federation — OIDC identity provider in Cognito, group claim mapping | Platform Engineer | High | 10 | COMPLETE |
| T-02.3 | NextAuth.js frontend integration — Cognito provider, login/logout pages, session context | Frontend Engineer | Medium | 8 | COMPLETE |
| T-02.4 | API JWT Lambda authorizer — JWKS validation, Cognito groups to IAM policy, 5-min cache | Backend Engineer | High | 8 | COMPLETE |
| T-02.5 | User management API endpoints — GET /users, PATCH role, PATCH status, audit log writes | Backend Engineer | Medium | 6 | COMPLETE |

**EPIC-02 GATE: VERIFIED** — Cognito deployed, admin can log in via web, JWT authorizer protecting API routes.

---

## EPIC-03: Content Model and Database Schema [Phase 1]

**Status: COMPLETE**

This epic defines the entire data layer. Ten PostgreSQL tables are created via Drizzle ORM covering tenants, users, content, revisions, tags, categories, media assets, AI jobs, and audit logs. The ContentRepository provides typed CRUD operations with cursor pagination and full-text search. Row-level security policies ensure tenant isolation at the database level.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-03.1 | Core database schema — tenants, users, content, content_revisions, content_tags, media_assets, ai_jobs, audit_log | Backend Engineer | High | 12 | COMPLETE |
| T-03.2 | Content repository layer — typed CRUD, cursor pagination, full-text search, tenant-scoped queries | Backend Engineer | High | 10 | COMPLETE |
| T-03.3 | Taxonomy and engineering domain seed — Ascendion category tree (6 domains, 18 subcategories) | Backend Engineer | Low | 4 | COMPLETE |
| T-03.4 | Database migration runner — drizzle-kit generate, migrate script, seed script | Backend Engineer | Medium | 4 | COMPLETE |
| T-03.5 | Row-level security policies — Aurora PostgreSQL RLS by tenantId, verify isolation | Backend Engineer | High | 6 | COMPLETE |

**EPIC-03 GATE: VERIFIED** — All tables created, repositories type-safe, seed data applied, RLS verified.

---

## ═══════════════════════════════════════════════════════════
## PHASE 2 — PARALLEL STREAMS
## ═══════════════════════════════════════════════════════════

## EPIC-04: AI Brain — Core Agents [Phase 2 — Stream A]

**Status: COMPLETE**

This epic builds the AI content pipeline — the heart of ChiselGrid. Four AI agents (Writer, Review, Diagram, SEO) are implemented as TypeScript classes with Zod schema validation. A Bedrock client wraps the AWS SDK with retry logic and token tracking. The Step Functions state machine orchestrates the full pipeline: Writer drafts, Review scores, revision loop iterates, SEO generates metadata, and the Human Review Gate pauses for admin approval.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-04.1 | Bedrock client and prompt library — typed wrapper, streaming support, token usage tracking, retry with backoff | AI Engineer | High | 10 | COMPLETE |
| T-04.2 | Writer Agent — ContentBlock[] JSON output, structured sections, code blocks, Zod schema validation | AI Engineer | High | 12 | COMPLETE |
| T-04.3 | Review Agent — 5-dimension scoring (accuracy/completeness/readability/SEO/depth), ReviewReport schema | AI Engineer | High | 10 | COMPLETE |
| T-04.4 | Step Functions content pipeline — Writer to Review to revision loop to Human Gate to Publish DAG | Platform Engineer | Very High | 16 | COMPLETE |
| T-04.5 | Diagram Agent — Mermaid code generation from architecture/process descriptions | AI Engineer | Medium | 6 | COMPLETE |
| T-04.6 | SEO Agent — meta title/description, OG tags, JSON-LD schema, keyword map, internal link suggestions | AI Engineer | Medium | 6 | COMPLETE |
| T-04.7 | Human review gate — SES email notification to admins, approve/reject API endpoints, Step Functions callback | Backend Engineer | High | 8 | COMPLETE |

**EPIC-04 GATE: VERIFIED** — Writer produces valid draft, Review scores it, Step Functions pipeline runs end-to-end.

---

## EPIC-05: Content Creation Workspace [Phase 2 — Stream A]

**Status: COMPLETE**

This epic builds the Creator-facing AI workspace — a split-pane interface where creators interact with AI agents to produce content. It includes the chat panel, agent timeline, block editor, code and diagram renderers, SEO panel, submit flow, and file upload. WebSocket streaming pushes real-time agent progress to the browser.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-05.1 | AI chat interface — split-pane workspace layout, chat input with file upload, agent timeline | Frontend Engineer | High | 12 | COMPLETE |
| T-05.2 | WebSocket agent streaming — API Gateway WebSocket, Lambda pushes Step Functions events | Backend Engineer | High | 10 | COMPLETE |
| T-05.3 | Content block preview editor — renders all ContentBlock types, inline editing, Zustand state | Frontend Engineer | High | 10 | COMPLETE |
| T-05.4 | Code block renderer — syntax highlighting, copy-to-clipboard, filename display | Frontend Engineer | Medium | 4 | COMPLETE |
| T-05.5 | Diagram block renderer — Mermaid.js client-side rendering, responsive sizing | Frontend Engineer | Medium | 4 | COMPLETE |
| T-05.6 | SEO panel — meta preview, read time, word count, keyword density display | Frontend Engineer | Medium | 4 | COMPLETE |
| T-05.7 | Submit flow — category/tag/slug form, uniqueness validation, draft save, submit to review queue | Frontend Engineer | Medium | 6 | COMPLETE |
| T-05.8 | File upload to S3 — presigned URL generation, multipart upload, progress indicator | Backend Engineer | Medium | 6 | COMPLETE |

**EPIC-05 GATE: VERIFIED** — Admin can type topic, watch agents work, see preview, edit blocks, submit.

---

## EPIC-06: Reader-Facing Frontend [Phase 2 — Stream B]

**Status: COMPLETE**

This epic builds the public-facing reader experience — everything a visitor sees without logging in. It includes the design system, navigation, homepage, article pages with ISR, category listings, search, article cards, RSS feed, and Open Graph/JSON-LD metadata. The frontend uses Next.js App Router with Incremental Static Regeneration for performance.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-06.1 | ChiselGrid design system — CSS custom properties, Tailwind theme, typography scale, dark/light mode | Frontend Engineer | Medium | 8 | COMPLETE |
| T-06.2 | Navigation component — top nav with category links, mobile hamburger, search bar, dark mode toggle | Frontend Engineer | Medium | 6 | COMPLETE |
| T-06.3 | Article page — ISR revalidate:60, hero image, author/date/readtime, sticky ToC, audio player, related | Frontend Engineer | High | 12 | COMPLETE |
| T-06.4 | Content block renderer (reader) — all block types, responsive images, accessible code blocks | Frontend Engineer | High | 8 | COMPLETE |
| T-06.5 | Homepage — hero feature article, category grid with icons, 6 recent articles, newsletter signup | Frontend Engineer | Medium | 8 | COMPLETE |
| T-06.6 | Category listing page — paginated article cards (12/page), tag filter, breadcrumb navigation | Frontend Engineer | Medium | 6 | COMPLETE |
| T-06.7 | Search page — full-text search via PostgreSQL tsvector, debounced input, result highlighting | Frontend Engineer | Medium | 6 | COMPLETE |
| T-06.8 | Article card component — hero image, title, excerpt, author avatar, date, read time, tags | Frontend Engineer | Low | 4 | COMPLETE |
| T-06.9 | RSS feed — /feed.xml route, valid RSS 2.0, all published articles, CloudFront cache headers | Frontend Engineer | Low | 3 | COMPLETE |
| T-06.10 | Open Graph and JSON-LD — per-article OG tags, Article schema, BreadcrumbList, canonical URLs | Frontend Engineer | Medium | 4 | COMPLETE |

**EPIC-06 GATE: VERIFIED** — Reader can browse homepage, navigate categories, read full articles, search content.

---

## EPIC-07: Admin Dashboard [Phase 2 — Stream A]

**Status: COMPLETE**

This epic builds the admin interface for managing the content lifecycle, users, categories, and AI usage. It includes the dashboard shell with sidebar navigation, the content review queue with AI quality scores, a content status board, inline content editing, user management, category management, and an AI usage analytics panel.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-07.1 | Dashboard shell — admin layout, sidebar navigation, breadcrumbs, responsive for 1280px+ | Frontend Engineer | Medium | 6 | COMPLETE |
| T-07.2 | Content queue — in_review items table, AI quality scores display, preview link, approve/reject | Frontend Engineer | High | 8 | COMPLETE |
| T-07.3 | Content status board — all statuses (draft/review/approved/published/deprecated) with counts | Frontend Engineer | Medium | 4 | COMPLETE |
| T-07.4 | Content edit page — full block editor for existing content, version history sidebar, publish controls | Frontend Engineer | High | 10 | COMPLETE |
| T-07.5 | User management page — user table with role/status, inline role change, deactivate/reactivate | Frontend Engineer | Medium | 6 | COMPLETE |
| T-07.6 | Category management — create/edit/delete categories, drag-to-reorder hierarchy, slug management | Frontend Engineer | Medium | 6 | COMPLETE |
| T-07.7 | AI usage panel — tokens consumed per agent, cost estimate, per-creator usage, daily trend chart | Frontend Engineer | Medium | 6 | COMPLETE |

**EPIC-07 GATE: VERIFIED** — Admin can manage all content lifecycle, users, and see AI usage metrics.

---

## EPIC-08: Audio Generation Pipeline [Phase 2 — Stream C]

**Status: COMPLETE**

This epic adds audio narration to every published article. A ContentToSSML converter transforms article blocks into speech-optimized SSML with a 60+ term technical pronunciation dictionary. Amazon Polly Neural TTS generates MP3 audio asynchronously via SQS. An EventBridge rule triggers audio generation when content is published. The web frontend includes a custom audio player with play/pause, seek, and speed controls.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-08.1 | ContentToSSML converter — text blocks to SSML, heading emphasis, code blocks skipped, pronunciation dictionary | AI Engineer | Medium | 6 | COMPLETE |
| T-08.2 | Polly Neural TTS Lambda — async Polly job, Neural voice (Matthew), MP3 to S3, audioUrl saved | Backend Engineer | Medium | 6 | COMPLETE |
| T-08.3 | SQS audio job queue — EventBridge rule content.published to SQS to Lambda, DLQ for failures | Platform Engineer | Medium | 6 | COMPLETE |
| T-08.4 | Audio player component — HTML5 audio, custom UI (play/pause/seek/speed), sticky bottom bar, waveform | Frontend Engineer | Medium | 6 | COMPLETE |
| T-08.5 | Audio generation for migrated content — batch script triggers audio generation for all imported articles | Backend Engineer | Low | 4 | COMPLETE |

**EPIC-08 GATE: VERIFIED** — Every published article has Polly MP3 in S3, audio player renders and plays on article page.

---

## EPIC-09: Content Migration from Static Site [Phase 2 — Stream C]

**Status: NOT STARTED**

This epic migrates all existing content from the current static site (HTML/Markdown/Mermaid files on GitHub) into ChiselGrid. It includes a crawler to read existing files, a Bedrock-powered converter to transform content into ContentBlock[] JSON, a Mermaid importer, URL slug mapping to preserve SEO-critical URLs, bulk database import, CloudFront redirect rules for changed URLs, and validation to ensure zero broken links.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-09.1 | Static site crawler — reads existing HTML/MD/MMD files from GitHub repo, extracts content structure | Backend Engineer | Medium | 6 | NOT STARTED |
| T-09.2 | Content converter — Bedrock converts HTML/MD to ContentBlock[] JSON (batched, rate-limited) | AI Engineer | High | 10 | NOT STARTED |
| T-09.3 | Mermaid importer — .mmd files imported as DiagramBlock content blocks with captions | Backend Engineer | Low | 3 | NOT STARTED |
| T-09.4 | URL slug mapper — maps existing file paths to ChiselGrid slugs, preserves SEO-critical URLs | Backend Engineer | Medium | 4 | NOT STARTED |
| T-09.5 | Bulk DB importer — Drizzle bulk insert with ON CONFLICT DO NOTHING, category assignment, idempotent | Backend Engineer | Medium | 6 | NOT STARTED |
| T-09.6 | CloudFront redirect rules — 301 redirects for any URL changes, submit updated sitemap to Google | Platform Engineer | Medium | 4 | NOT STARTED |
| T-09.7 | Migration validation — crawl all migrated URLs, verify HTTP 200, check content renders correctly | QA Engineer | Medium | 6 | NOT STARTED |

**EPIC-09 GATE: NOT STARTED** — All existing content visible on new platform, zero 404s on existing URLs, audio generated.

---

## ═══════════════════════════════════════════════════════════
## PHASE 3 — COMPLETION
## ═══════════════════════════════════════════════════════════

## EPIC-10: Testing Infrastructure [Phase 3]

**Status: COMPLETE**

This epic establishes comprehensive testing across the entire codebase. Vitest is configured in all 4 testable packages (ai, db, types, api) with 146 unit and integration tests covering AI agents, schemas, the Bedrock client, SSML converter, pipeline handler, content repository, API handlers, and type validation. Playwright E2E tests cover reader and admin flows. GitHub Actions CI is enhanced with coverage reporting and E2E test gates on staging deployment.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-10.1 | Vitest unit test setup — all packages configured, AWS SDK mocked, coverage threshold 80% | Platform Engineer | Medium | 6 | COMPLETE |
| T-10.2 | AI agent unit tests — Writer Agent schema validation, Review Agent scoring range, Diagram Agent output | QA Engineer | High | 10 | COMPLETE |
| T-10.3 | Repository integration tests — CRUD via Drizzle against test schema, pagination, full-text search | QA Engineer | High | 8 | COMPLETE |
| T-10.4 | API integration tests — all endpoints with valid/invalid JWT, role-based access, Zod validation | QA Engineer | High | 8 | COMPLETE |
| T-10.5 | Playwright E2E setup — configured against staging URL, screenshot on failure, CI artifact upload | QA Engineer | Medium | 4 | COMPLETE |
| T-10.6 | E2E reader flow — homepage load, article page render, search results, audio player present | QA Engineer | Medium | 6 | COMPLETE |
| T-10.7 | E2E admin flow — login, dashboard loads, content queue visible, approve/reject actions | QA Engineer | Medium | 6 | COMPLETE |
| T-10.8 | CI test gates — PR check runs unit + integration, staging deploy triggers E2E, coverage report posted | DevOps Engineer | Medium | 4 | COMPLETE |

**EPIC-10 GATE: VERIFIED** — All 146 tests pass, coverage thresholds met, CI blocks on test failures.

---

## EPIC-11: SEO and Performance Optimization [Phase 2 — Stream B]

**Status: NOT STARTED**

This epic optimizes the reader-facing frontend for search engines and Core Web Vitals. It includes a Lighthouse baseline audit, LCP/CLS/FID optimization, sitemap generation, JSON-LD structured data on all pages, CloudFront cache optimization with Brotli compression, and bundle analysis to eliminate large dependencies.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-11.1 | Lighthouse baseline audit — run against staging, document current scores, set targets | Frontend Engineer | Low | 3 | NOT STARTED |
| T-11.2 | Core Web Vitals optimization — LCP < 2.5s, CLS < 0.1, FID < 100ms, image optimization | Frontend Engineer | High | 10 | NOT STARTED |
| T-11.3 | Sitemap generation — /sitemap.xml auto-generated from published content | Frontend Engineer | Low | 3 | NOT STARTED |
| T-11.4 | Structured data — JSON-LD Article, BreadcrumbList, Organization, WebSite schemas | Frontend Engineer | Medium | 4 | NOT STARTED |
| T-11.5 | CloudFront cache optimization — long TTL for static assets, stale-while-revalidate, Brotli | Platform Engineer | Medium | 4 | NOT STARTED |
| T-11.6 | Bundle analysis — next-bundle-analyzer, identify and eliminate large dependencies, code splitting | Frontend Engineer | Medium | 4 | NOT STARTED |

**EPIC-11 GATE: NOT STARTED** — Lighthouse scores meet targets, sitemap submitted, structured data validates.

---

## EPIC-12: Mobile Application [Phase 3]

**Status: COMPLETE**

This epic builds the React Native mobile app using Expo SDK 52 with Expo Router for file-based navigation. The app provides article browsing with category tabs and infinite scroll, full article reading with a native block renderer, audio playback via expo-av with background playback and speed controls, offline reading via expo-sqlite, Cognito authentication via expo-auth-session with PKCE, push notifications via Expo Notifications, and debounced search with local recent search history.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-12.1 | Expo scaffold — React Native with Expo SDK 52, TypeScript, Expo Router file-based navigation | Mobile Engineer | Medium | 6 | COMPLETE |
| T-12.2 | Shared API client — packages/api-client consuming same REST endpoints as web, Zod validation | Backend Engineer | Medium | 6 | COMPLETE |
| T-12.3 | Article list screen — category tabs, infinite scroll, article cards, pull-to-refresh | Mobile Engineer | Medium | 6 | COMPLETE |
| T-12.4 | Article detail screen — full block renderer (native), estimated read time, tags | Mobile Engineer | High | 8 | COMPLETE |
| T-12.5 | Native audio player — expo-av, background audio, lock screen controls, playback speed | Mobile Engineer | High | 8 | COMPLETE |
| T-12.6 | Offline reading — expo-sqlite article cache, download for offline button, sync indicator | Mobile Engineer | High | 8 | COMPLETE |
| T-12.7 | Auth flow — Cognito via expo-auth-session, secure token storage (expo-secure-store), auto-refresh | Mobile Engineer | High | 8 | COMPLETE |
| T-12.8 | Push notifications — Expo Notifications + AWS SNS, topic subscriptions by category | Mobile Engineer | Medium | 6 | COMPLETE |
| T-12.9 | Search screen — debounced API search, recent searches stored locally | Mobile Engineer | Medium | 4 | COMPLETE |
| T-12.10 | App Store prep — app icons, splash screen, privacy policy, App Store Connect setup | Mobile Engineer | Low | 4 | COMPLETE |
| T-12.11 | Play Store prep — signed APK, Play Console setup, content rating | Mobile Engineer | Low | 4 | COMPLETE |

**EPIC-12 GATE: VERIFIED** — App runs on iOS simulator and Android emulator, article reading and audio work, auth flow complete.

---

## ═══════════════════════════════════════════════════════════
## PHASE 4 — WHITE LABEL v1.1
## ═══════════════════════════════════════════════════════════

## EPIC-13: Multi-Tenancy Foundation [Phase 4]

**Status: COMPLETE**

This epic transforms ChiselGrid from a single-tenant Ascendion portal into a multi-tenant platform. Enhanced RLS with per-operation policies (SELECT/INSERT/UPDATE/DELETE) enforces tenant isolation on all 10 tables. Per-tenant Cognito User Pools are provisioned via CDK constructs and runtime API. Lambda@Edge functions handle tenant routing (subdomain + custom domain) and branding injection. A tenant admin portal provides self-service configuration for branding, features, and custom domains.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-13.1 | Tenant data isolation — enhanced RLS with per-operation policies, FORCE RLS, 16 automated tests | Backend Engineer | High | 10 | COMPLETE |
| T-13.2 | Cognito per-tenant pools — TenantUserPool CDK construct, MultiTenantAuthStack, tenant resolver | Platform Engineer | High | 10 | COMPLETE |
| T-13.3 | CloudFront tenant routing — Lambda@Edge origin-request, DynamoDB lookup, subdomain + custom domain | Platform Engineer | Very High | 12 | COMPLETE |
| T-13.4 | Tenant branding injection — Lambda@Edge CSS injection, TenantBrandingProvider, light/dark mode | Frontend Engineer | Medium | 6 | COMPLETE |
| T-13.5 | Custom domain SSL — TenantCustomDomain CDK construct, ACM DNS validation, CloudFront attachment API | Platform Engineer | High | 8 | COMPLETE |
| T-13.6 | Tenant admin portal — tabbed settings (general/branding/features/domain), live preview, feature flags | Frontend Engineer | High | 10 | COMPLETE |

**EPIC-13 GATE: VERIFIED** — Two test tenants run on same infra with isolated data and different branding.

---

## EPIC-14: Billing and White Label Onboarding [Phase 4]

**Status: COMPLETE**

This epic adds Stripe-based billing and self-service tenant onboarding. Stripe webhook handlers process 5 event types (checkout completed, subscription updated/deleted, payment succeeded/failed). Tier enforcement middleware checks plan limits at the API layer. Usage metering tracks monthly consumption with overage calculation. A 4-step onboarding wizard (plan selection, org info, checkout, completion) handles self-service signup. A tenant health dashboard monitors uptime, errors, storage, and billing.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-14.1 | Stripe integration — webhook handler (5 events), billing API (checkout/portal/status) | Backend Engineer | High | 10 | COMPLETE |
| T-14.2 | Tier enforcement — enforceFeature() and enforceLimit() middleware, 4 plan configs | Backend Engineer | High | 8 | COMPLETE |
| T-14.3 | Usage metering — current/history API, incrementUsage(), monthly aggregation Lambda | Backend Engineer | Medium | 6 | COMPLETE |
| T-14.4 | Self-service onboarding — 4-step wizard, plan cards, Stripe checkout, onboarding API | Full Stack Engineer | Very High | 16 | COMPLETE |
| T-14.5 | Tenant health dashboard — metrics grid, usage bars, billing card, errors table | Frontend Engineer | High | 10 | COMPLETE |

**EPIC-14 GATE: VERIFIED** — New tenant can self-onboard, pay via Stripe, get isolated environment, see their billing.

---

## EPIC-15: Analytics Dashboard [Phase 4]

**Status: COMPLETE**

This epic builds comprehensive analytics for content performance, reader engagement, creator productivity, and AI pipeline efficiency. An AnalyticsStack CDK provisions S3 for CloudFront access logs, Glue database/table, Athena workgroup, and a daily aggregation Lambda. API handlers serve reader, content, creator, and AI analytics. A Recharts-powered dashboard provides 4 tabs with charts, date range filtering, and CSV export.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-15.1 | Reader analytics — AnalyticsStack CDK, Athena queries for overview/articles/geo | Data Engineer | High | 10 | COMPLETE |
| T-15.2 | Content performance — per-article metrics, read time, audio rate, social shares, search | Data Engineer | Medium | 6 | COMPLETE |
| T-15.3 | Creator analytics — leaderboard, 5-dim quality scores, monthly trend, approval rate | Data Engineer | Medium | 6 | COMPLETE |
| T-15.4 | AI pipeline analytics — per-agent breakdown, daily trends, cost tracking, quality scores | Data Engineer | Medium | 6 | COMPLETE |
| T-15.5 | Analytics UI — 4-tab Recharts dashboard, date range picker, CSV export, stat cards | Frontend Engineer | High | 12 | COMPLETE |

**EPIC-15 GATE: VERIFIED** — Admin sees real traffic data, content metrics, and AI cost breakdown.

---

## ═══════════════════════════════════════════════════════════
## PHASE 5B — VOICE OUTPUT & INTERVIEW MODE
## ═══════════════════════════════════════════════════════════

## EPIC-18: Voice Output and Distribution [Phase 5B]

**Status: COMPLETE**

This epic adds voice content distribution channels. A podcast RSS feed with iTunes namespace serves audio articles as podcast episodes. An email newsletter system using @react-email/components with table-based layouts (Outlook-safe) sends weekly digests via SES SendBulkEmail. A subscriber management system with Aurora schema supports category filtering and frequency preferences, with unsubscribe via SES suppression list. Email voice attachment ingest parses incoming MIME emails, extracts audio, stores in S3, and triggers the transcription pipeline.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-18.1 | Podcast RSS feed — /api/feed/podcast route, RSS 2.0, iTunes namespace, enclosures | Backend Engineer | Medium | 6 | COMPLETE |
| T-18.2 | Email newsletter — @react-email/components, weekly-digest template, SES bulk send | Full Stack Engineer | Medium | 8 | COMPLETE |
| T-18.3 | Subscriber management — Aurora subscribers table, CRUD API, SES suppression list | Backend Engineer | Medium | 6 | COMPLETE |
| T-18.4 | Email voice attachment ingest — SES inbound rule, MIME parser Lambda, S3 + pipeline trigger | Platform Engineer | High | 10 | COMPLETE |

**EPIC-18 GATE: VERIFIED** — Podcast feed validates, newsletter renders in Outlook, subscribers managed, voice emails ingested.

---

## EPIC-19: Voice Interview Mode [Phase 5B]

**Status: COMPLETE**

This epic adds structured voice interview capability. Interview templates stored in DynamoDB define question flows with follow-ups and expected durations; 5 standard templates are seeded per tenant. A mobile guided recording UI presents questions one at a time with progress tracking, skip option, and batch upload. A multi-answer processor launches separate Step Functions executions per answer, linked by interviewId, and publishes results as a navigable content series. Interview scheduling generates ICS calendar events sent via SES and triggers Expo push notification reminders 30 minutes before.

| Task | Description | Role | Complexity | Hours | Status |
|------|-------------|------|------------|-------|--------|
| T-19.1 | Interview templates — DynamoDB storage, CRUD API, 5 standard templates seeded | Backend Engineer | Medium | 6 | COMPLETE |
| T-19.2 | Guided recording UI — mobile Q&A flow, progress bar, skip option, batch upload | Mobile Engineer | High | 10 | COMPLETE |
| T-19.3 | Multi-answer processor — per-answer Step Functions, interviewId linking, series navigation | Backend Engineer | High | 10 | COMPLETE |
| T-19.4 | Interview scheduling — ICS calendar events, SES delivery, Expo push 30-min reminder | Full Stack Engineer | Medium | 8 | COMPLETE |

**EPIC-19 GATE: VERIFIED** — Interview templates created, mobile recording works, answers processed as series, scheduling sends ICS.
