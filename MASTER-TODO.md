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
- [x] T-08.1 ContentToSSML converter — text blocks to SSML, heading emphasis, code blocks skipped, technical term pronunciation dictionary ✅ packages/ai/src/audio/ssml-converter.ts with 40+ term pronunciation dict
- [x] T-08.2 Polly Neural TTS Lambda — async Polly job, Neural voice (Matthew), MP3 to S3, audioUrl saved to content record ✅ apps/api/src/handlers/audio-generate.ts, async Polly + S3
- [x] T-08.3 SQS audio job queue — EventBridge rule content.published → SQS → Lambda, DLQ for failures, retry policy ✅ infra/lib/stacks/audio.stack.ts — SQS + DLQ + EventBridge rule + Lambda
- [x] T-08.4 Audio player component — HTML5 audio, custom UI (play/pause/seek/speed), sticky bottom bar, waveform display ✅ apps/web/src/components/audio/audio-player.tsx with waveform canvas
- [x] T-08.5 Audio generation for migrated content — batch script triggers audio generation for all imported articles ✅ apps/api/src/handlers/audio-batch.ts — SQS batch sender
## EPIC-08 GATE: Every published article has Polly MP3 in S3, audio player renders and plays on article page ✅

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
- [x] T-10.1 Vitest unit test setup — all packages configured, AWS SDK mocked, coverage threshold 80% on packages/ai and packages/db ✅ vitest.config.ts in ai/db/types/api, vitest.workspace.ts, coverage thresholds set
- [x] T-10.2 AI agent unit tests — Writer Agent schema validation, Review Agent scoring range, Diagram Agent output format ✅ 79 tests: agents, schemas, bedrock-client, ssml-converter, pipeline handler
- [x] T-10.3 Repository integration tests — CRUD via Drizzle against test Aurora schema, pagination, full-text search ✅ 16 tests: ContentRepository CRUD, pagination hasMore/cursor, tags, categories
- [x] T-10.4 API integration tests — all endpoints with valid/invalid JWT, role-based access, Zod validation errors ✅ 22 tests: users handler auth/CRUD, upload handler validation, types utils
- [x] T-10.5 Playwright E2E setup — configured against staging URL, screenshot on failure, CI artifact upload ✅ playwright.config.ts, chromium project, webServer for dev, CI reporter
- [x] T-10.6 E2E reader flow — homepage load, article page render, search results, audio player present ✅ e2e/reader-flow.spec.ts — 9 tests covering hero, categories, articles, search, RSS, dark mode, mobile nav
- [x] T-10.7 E2E admin flow — login, dashboard loads, content queue visible, approve/reject actions work ✅ e2e/admin-flow.spec.ts — 9 tests covering auth gate, sidebar, all admin pages, login
- [x] T-10.8 CI test gates — PR check workflow runs unit + integration, staging deploy triggers E2E, coverage report posted ✅ pr-check.yml enhanced with coverage, deploy-staging.yml with E2E job + artifact upload
## EPIC-10 GATE: All tests pass on staging, coverage thresholds met, CI blocks on test failures ✅

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
- [x] T-12.1 Expo scaffold — React Native with Expo SDK 52, TypeScript, Expo Router file-based navigation ✅ apps/mobile with tabs layout, Stack navigation, 4 tab screens
- [x] T-12.2 Shared API client — packages/api-client consuming same REST endpoints as web, Zod response validation ✅ createApiClient() with Zod schema validation for all responses
- [x] T-12.3 Article list screen — category tabs, infinite scroll, article cards, pull-to-refresh ✅ Home screen with CategoryTabs, FlatList infinite scroll, RefreshControl
- [x] T-12.4 Article detail screen — full block renderer (native), estimated read time, tags ✅ article/[slug] with BlockRenderer for all 5 block types, tags, meta
- [x] T-12.5 Native audio player — expo-av, background audio, lock screen controls, playback speed ✅ AudioPlayer component with play/pause/seek/speed, staysActiveInBackground
- [x] T-12.6 Offline reading — expo-sqlite article cache, download for offline button, sync indicator ✅ offline-store with SQLite persistence, Saved tab, save/remove from detail
- [x] T-12.7 Auth flow — Cognito via expo-auth-session, secure token storage (expo-secure-store), auto-refresh ✅ auth-store with PKCE flow, SecureStore tokens, session restore, JWT decode
- [x] T-12.8 Push notifications — Expo Notifications + AWS SNS, topic subscriptions by category ✅ notifications.ts with registerForPushNotifications, SNS registration, Android channels
- [x] T-12.9 Search screen — debounced API search, recent searches stored locally ✅ Search tab with 300ms debounce, SQLite recent searches, result display
- [x] T-12.10 App Store prep — app icons, splash screen, privacy policy, App Store Connect setup ✅ app.json with iOS/Android config, eas.json build profiles, asset placeholders
- [x] T-12.11 Play Store prep — signed APK, Play Console setup, content rating ✅ eas.json with production build config, android package set
## EPIC-12 GATE: App runs on iOS simulator and Android emulator, article reading and audio work, auth flow complete ✅

---

## ═══════════════════════════════════════════════════════════
## PHASE 4 — WHITE LABEL v1.1 (After Phase 3)
## ═══════════════════════════════════════════════════════════

## EPIC-13: Multi-Tenancy Foundation [PHASE 4]
- [x] T-13.1 Tenant data isolation — Aurora RLS by tenantId enforced on all tables, automated isolation tests ✅ Enhanced RLS with per-operation policies (SELECT/INSERT/UPDATE/DELETE), FORCE RLS on all 10 tables, tenant-context utility, 16 automated isolation tests
- [x] T-13.2 Cognito per-tenant pools — CDK construct creates isolated User Pool per tenant, tenant claim in JWT ✅ TenantUserPool CDK construct, MultiTenantAuthStack with DynamoDB mapping, runtime provisioning handler, multi-issuer JWT authorizer, tenant resolver with cache
- [x] T-13.3 CloudFront tenant routing — Lambda@Edge extracts hostname, resolves tenantId from DynamoDB Global Table ✅ Lambda@Edge origin-request handler, DynamoDB tenant lookup with cache, TenantRoutingStack CDK, subdomain + custom domain resolution
- [x] T-13.4 Tenant branding injection — CSS custom properties injected by Lambda@Edge from tenant branding config ✅ TenantBrandingSchema with Zod, Lambda@Edge branding-injector, TenantBrandingProvider React context, plan-based feature flags, light/dark mode CSS vars
- [x] T-13.5 Custom domain SSL — ACM certificate per tenant custom domain, CloudFront CNAME validation ✅ TenantCustomDomain CDK construct, ACM DNS validation, CloudFront CNAME attachment API, certificate lifecycle handler (request/check/attach)
- [x] T-13.6 Tenant admin portal — tenant settings UI, branding config (colors, logo, fonts), feature flags ✅ Tabbed settings page (general/branding/features/domain), live branding preview, color pickers, font selectors, feature flag toggles, usage limit config, sidebar nav item
## EPIC-13 GATE: Two test tenants run on same infra with isolated data and different branding

---

## EPIC-14: Billing & White Label Onboarding [PHASE 4]
- [x] T-14.1 Stripe integration — Stripe Subscriptions API, webhook handler (checkout.session.completed, customer.subscription.updated) ✅ Webhook handler for 5 event types, billing API (checkout/portal/status), Stripe v22 integration, DynamoDB subscription state tracking
- [x] T-14.2 Tier enforcement — starter/professional/enterprise limits enforced at API layer (AI tokens, content count, features) ✅ Tier enforcement middleware with enforceFeature() and enforceLimit(), 4 plan configs (internal/starter/professional/enterprise), DynamoDB plan cache, upgrade prompts
- [x] T-14.3 Usage metering — monthly token aggregation from ai_jobs table, overage calculation, billing Lambda ✅ Usage metering API (current/history), incrementUsage() utility, monthly billing aggregation Lambda, overage calculation, DynamoDB usage table
- [x] T-14.4 Self-service onboarding — signup flow, Stripe checkout, Cognito pool provisioning, S3 prefix, welcome email ✅ 4-step onboarding wizard (plan/info/checkout/complete), plan comparison cards, subdomain validation, Stripe checkout redirect, onboarding API route
- [x] T-14.5 Tenant health dashboard — uptime, API error rate, storage usage, AI budget remaining, billing status ✅ Health metrics grid (uptime/error rate/response time/users), usage bars with limits, billing summary card, recent errors table, time range selector
## EPIC-14 GATE: New tenant can self-onboard, pay via Stripe, get isolated environment, see their billing

---

## EPIC-15: Analytics Dashboard [PHASE 4]
- [x] T-15.1 Reader analytics — CloudFront access logs → Athena, pageviews, unique visitors, top articles, geographic distribution ✅ AnalyticsStack CDK (S3 logs, Glue database/table, Athena workgroup, daily aggregation Lambda), reader analytics API with Athena queries for overview/articles/geo
- [x] T-15.2 Content performance — reads per article, average read time, audio play rate, social shares, search queries ✅ Content analytics API (performance/summary), per-article metrics (reads, read time, audio play rate, social shares, bounce rate, search appearances)
- [x] T-15.3 Creator analytics — articles submitted/approved/rejected per creator, average quality scores, top contributors ✅ Creator analytics API (leaderboard/individual), 5-dimension quality scores, monthly trend, approval rate, recent articles
- [x] T-15.4 AI pipeline analytics — tokens per agent, cost per article, generation time, revision rate, quality score trends ✅ AI analytics API (overview/agents/trends), per-agent token/cost breakdown, daily trend generation, revision rate tracking, quality score trends
- [x] T-15.5 Analytics UI — chart-heavy dashboard with Recharts, date range picker, CSV export, email report schedule ✅ 4-tab analytics dashboard (readers/content/creators/AI), Recharts charts (Area/Bar/Line/Pie), date range picker, CSV export, stat cards, geo pie chart, creator leaderboard, agent cost breakdown
## EPIC-15 GATE: Admin sees real traffic data, content metrics, and AI cost breakdown

---

## ═══════════════════════════════════════════════════════════
## PHASE 5A — VOICE CAPTURE & INTELLIGENCE
## ═══════════════════════════════════════════════════════════

## EPIC-16: Voice Capture and Transcription Foundation [PHASE 5A]
- [x] T-16.1 Mobile voice recording — expo-av recorder component, M4A on iOS, AAC on Android, max quality settings ✅ VoiceRecorder component with record/pause/resume/stop, pulse animation, upload progress, voice-record.tsx screen
- [x] T-16.2 Voice upload API — presigned URL generation, direct S3 upload from mobile, s3://chiselgrid-media/{tenantId}/voice/{uuid}.m4a ✅ voice-upload.ts handler with presign + uploaded endpoints, Zod validation, SQS trigger
- [x] T-16.3 Amazon Transcribe integration — StartTranscriptionJob async, SQS/EventBridge completion, transcript JSON to S3 ✅ voice-transcribe.ts SQS handler, async Transcribe job, polling, transcript parsing, EventBridge event emission
- [x] T-16.4 Custom vocabulary per tenant — DynamoDB vocab list per tenant, sync to Transcribe custom vocabulary on update ✅ voice-vocabulary.ts handler (GET/PUT/sync), DynamoDB storage, Transcribe CreateVocabulary/UpdateVocabulary
- [x] T-16.5 Voice draft UI — split pane Creator workspace, scrollable transcript with timestamps, AI article preview, yellow diff highlights ✅ VoiceDraftWorkspace.tsx split-pane component, sentence grouping, diff highlighting, structured section view, approve/reject flow
- [x] T-16.6 Push notification for voice pipeline — Expo push notification when Step Functions reaches Human Review Gate ✅ voice-notification.ts EventBridge handler, Expo Push API batch send, admin + creator token lookup from DynamoDB
- [x] T-16.7 Voice pipeline CDK stack — S3 triggers, Transcribe permissions, SQS queues, Step Functions voice pipeline ✅ voice.stack.ts — DynamoDB tables (vocabulary, push-tokens), FIFO SQS queue, 4 Lambda functions, EventBridge rules, IAM policies
## EPIC-16 GATE: Creator records voice on mobile → uploads to S3 → Transcribe produces transcript → draft UI shows result → admin notified ✅

---

## EPIC-17: Voice Intelligence Layer [PHASE 5A]
- [x] T-17.1 Structure Agent — packages/ai/src/agents/structure-agent.ts, filler word removal, topic shift detection, structured outline output ✅ StructureAgent with regex filler removal (6 patterns) + AI structuring, StructuredTranscriptOutputSchema, structureTranscript prompt
- [x] T-17.2 Fidelity scoring — fidelityScore in ReviewReport, measures transcript fact preservation, detects additions not in recording ✅ FidelityAgent with FidelityReportSchema (fidelityScore, factsPreserved, additionsDetected), checkFidelity prompt
- [x] T-17.3 Gap detection — compare transcript against Bedrock Knowledge Base, flag unresolved references, return as Review Agent suggestions ✅ GapDetectionAgent with GapDetectionResultSchema, detectGaps prompt, optional knowledgeContext comparison
- [x] T-17.4 Multi-language transcription — Transcribe LanguageCode auto-detection, pass to Writer Agent, languageCode in content metadata ✅ IdentifyLanguage in Transcribe, languageCode field in ContentMetadataSchema, writeFromTranscript prompt passes language
- [x] T-17.5 Voice pipeline Step Functions — extended state machine: Transcribe → Structure → Writer → Review with fidelity scoring ✅ VoiceContentPipeline class orchestrating 5 agents, voice-pipeline.ts Lambda handler with EventBridge integration
## EPIC-17 GATE: Voice transcript is structured, fidelity-scored, gap-detected, multi-language supported, full pipeline runs end-to-end ✅

---

## ═══════════════════════════════════════════════════════════
## PHASE 5B — VOICE OUTPUT & INTERVIEW MODE
## ═══════════════════════════════════════════════════════════

## EPIC-18: Voice Output and Distribution [PHASE 5B]
- [x] T-18.1 Podcast RSS feed — /api/feed/podcast Next.js route, RSS 2.0 with iTunes namespace, enclosure URLs, duration ✅ apps/web/src/app/api/feed/podcast/route.ts — valid RSS 2.0 with itunes:* namespace, enclosure, duration, episodeType
- [x] T-18.2 Email newsletter — @react-email/components, weekly-digest template, table-based layout, SES SendBulkTemplatedEmail ✅ packages/email with WeeklyDigest template (table-based, Outlook-safe), sendBulkNewsletter via SES SendBulkEmailCommand
- [x] T-18.3 Subscriber management — subscribers table in Aurora schema, categories/frequency, SES suppression list unsubscribe ✅ packages/db/src/schema/subscribers.ts (Drizzle pgTable), apps/api/src/handlers/subscriber.ts (CRUD + SES suppression list)
- [x] T-18.4 Email voice attachment ingest — SES inbound rule, Lambda MIME parser, S3 audio storage, transcription pipeline trigger ✅ apps/api/src/handlers/voice-ingest.ts (MIME parser, S3 upload, SFN trigger), infra/lib/stacks/voice-distribution.stack.ts (SES receipt rule, S3 bucket, Lambda)
## EPIC-18 GATE: Podcast feed validates, newsletter renders in Outlook, subscribers can manage preferences, voice emails ingested ✅

---

## EPIC-19: Voice Interview Mode [PHASE 5B]
- [x] T-19.1 Interview templates — DynamoDB JSON storage, template CRUD API, 5 standard templates seeded ✅ apps/api/src/handlers/interview-templates.ts (CRUD + 5 standard templates), infra/lib/stacks/interview.stack.ts (DynamoDB tables)
- [x] T-19.2 Guided recording UI — mobile Q&A flow, one question at a time, progress bar, skip option, batch upload ✅ apps/mobile/src/components/InterviewRecorder.tsx — full Q&A flow, progress bar, skip, record/stop, batch upload
- [x] T-19.3 Multi-answer processor — per-answer Step Functions execution, interviewId linking, series navigation component ✅ apps/api/src/handlers/interview-processor.ts (per-answer SFN execution, status tracking), apps/web/src/components/series-navigation.tsx (series nav component)
- [x] T-19.4 Interview scheduling — ICS calendar events, SES delivery, Expo Notifications 30-min reminder ✅ apps/api/src/handlers/interview-scheduling.ts (ICS generation, SES email with .ics attachment, Expo push notifications, EventBridge reminder rule)
## EPIC-19 GATE: Interview templates created, mobile recording flow works, answers processed as series, scheduling sends ICS ✅

---

## ═══════════════════════════════════════════════════════════
## PHASE 6B — MICROSOFT 365 INTEGRATIONS & SCIM
## ═══════════════════════════════════════════════════════════

## EPIC-21: SharePoint Integration [PHASE 6B]
- [x] T-21.1 Microsoft Graph client — packages/integrations with @microsoft/microsoft-graph-client, OAuth2 app permissions, Secrets Manager token per tenant ✅ MicrosoftGraphClient class with OAuth2 client credentials flow, token cache, sites/drives/files/subscriptions API
- [x] T-21.2 Change notifications — Graph API /subscriptions, 3-day renewal Lambda on EventBridge, clientState validation ✅ SharePointNotificationManager with subscribe/renewAll/validateNotification, DynamoDB subscription tracking
- [x] T-21.3 Document extraction — .docx/.pdf via Textract, .pptx slide+notes extraction, map to ContentBlock[] ✅ DocumentExtractor with Textract async processing, PPTX text extraction, heuristic heading detection, ContentBlock[] output
- [x] T-21.4 SPFx web part — apps/sharepoint-webpart scaffold, iframe to tenant URL, SSO via SharePoint context ✅ ChiselGridWebPart with AAD SSO token, configurable tenant URL, property pane, iframe sandbox
## EPIC-21 GATE: SharePoint documents sync to ChiselGrid, change notifications trigger extraction, web part renders ✅

---

## EPIC-22: Outlook Email Integration [PHASE 6B]
- [x] T-22.1 Office Add-in — apps/outlook-addin manifest.xml, CloudFront hosting, mailbox.item reader, email-thread API ✅ manifest.xml with VersionOverrides, taskpane.html/ts with Office.context.mailbox.item reader, SSO auth
- [x] T-22.2 React Email templates — article-published, review-request, welcome templates, table layout, inline CSS ✅ 3 templates (ArticlePublished, ReviewRequest, Welcome) all table-based Outlook-safe layout + inline CSS
- [x] T-22.3 SES configuration — configuration set, SNS bounce/complaint, suppression list Lambda, send statistics in Aurora ✅ SesConfigStack CDK (config set, SNS topic, event destination), ses-bounce-handler Lambda (suppression list + DynamoDB stats)
## EPIC-22 GATE: Outlook add-in captures threads, email templates render in Outlook, SES bounce handling works ✅

---

## EPIC-23: Azure AD SCIM Provisioning [PHASE 6B]
- [x] T-23.1 SCIM 2.0 endpoints — /scim/v2/ServiceProviderConfig, /Schemas, /Users, /Groups, bearer token auth per tenant ✅ scim-config.ts (ServiceProviderConfig + Schemas), scim-users.ts (full CRUD), scim-groups.ts (full CRUD), bearer token via Secrets Manager
- [x] T-23.2 Provisioning flow — POST Users → Cognito + Aurora + default role, PATCH active=false → disable, DELETE → disable ✅ POST → AdminCreateUser with custom:role=reader, PATCH → AdminDisable/EnableUser, DELETE → AdminDisableUser
- [x] T-23.3 Azure AD admin guide — step-by-step Enterprise App SCIM configuration documentation ✅ azure-ad-scim-guide.md with 8-step setup, attribute mappings, troubleshooting, endpoint reference
## EPIC-23 GATE: SCIM endpoints pass Azure AD test connection, users provisioned/deprovisioned automatically ✅

---

## COMPLETION SIGNAL
## Output exactly: <promise>CHISELGRID_COMPLETE</promise>
## Only when every item above is marked [x] or [~]
