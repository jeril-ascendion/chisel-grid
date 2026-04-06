# ChiselGrid — Project Status

**Last Updated:** 2026-04-06
**Current Sprint:** Sprint 3 — Phase 2B Complete
**Active EPIC:** Phase 2B COMPLETE (EPIC-06, EPIC-08, EPIC-09, EPIC-11)

## Completed — Phase 2B

### EPIC-06: Reader-Facing Frontend (branch: epic/06-reader-frontend)
- [x] T-06.1: Design system — CSS custom properties, typography scale, dark/light mode
- [x] T-06.2: Navigation — header, mobile menu, search bar, theme toggle
- [x] T-06.3: Article page — ISR revalidate:60, sticky ToC, audio player, related articles
- [x] T-06.4: Content block renderer — text/heading/code/callout/diagram blocks
- [x] T-06.5: Homepage — hero feature, category grid, recent articles, newsletter
- [x] T-06.6: Category listing — pagination, tag filter, breadcrumbs
- [x] T-06.7: Search page — debounced input, result highlighting
- [x] T-06.8: Article card component
- [x] T-06.9: RSS feed (/feed.xml)
- [x] T-06.10: Open Graph & JSON-LD

### EPIC-08: Audio Generation Pipeline (branch: epic/08-audio-pipeline)
- [x] T-08.1: ContentToSSML converter (40+ term pronunciation dict)
- [x] T-08.2: Polly Neural TTS Lambda (async, Matthew voice, MP3 to S3)
- [x] T-08.3: SQS job queue + EventBridge rule + DLQ (CDK audio stack)
- [x] T-08.4: Audio player component (waveform, seek, speed control)
- [x] T-08.5: Batch audio generation script

### EPIC-09: Content Migration (branch: epic/09-migration)
- [x] T-09.1: Static site crawler (HTML/MD/MMD + frontmatter)
- [x] T-09.2: Content converter (MD/HTML → ContentBlock[])
- [x] T-09.3: Mermaid importer (.mmd → DiagramBlock)
- [x] T-09.4: URL slug mapper + redirect generator
- [x] T-09.5: Bulk DB importer (batched, idempotent)
- [x] T-09.6: CloudFront redirect rules (generated JS function)
- [x] T-09.7: Migration validation (concurrent URL checker)

### EPIC-11: SEO & Performance (branch: epic/11-seo)
- [x] T-11.1: Lighthouse CI config (CWV thresholds)
- [x] T-11.2: Core Web Vitals (next/image, web-vitals reporter)
- [x] T-11.3: Sitemap generation (/sitemap.xml)
- [x] T-11.4: Structured data (Article, BreadcrumbList, Organization, WebSite JSON-LD)
- [x] T-11.5: CloudFront cache optimization (headers, security)
- [x] T-11.6: Bundle analysis (analyze script, optimizeCss)

## Completed — Phase 1

### EPIC-01: Foundation & Infrastructure Setup
- [x] T-01.1–T-01.6: All deployed to dev (ap-southeast-1)

### EPIC-02: Authentication & User Management
- [x] T-02.1–T-02.5: Cognito, NextAuth, JWT authorizer, user management API

### EPIC-03: Content Model & Database Schema
- [x] T-03.1–T-03.5: 10 tables, repositories, seed data, RLS

## Deployed Resources (dev / ap-southeast-1)
- VPC: vpc-0ae155cc9e8c03fa4 (10.0.0.0/16)
- Aurora: chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn (PostgreSQL 15.8, available)
- CloudFront: d1f3r42tp7znsx.cloudfront.net (EWLP3KOX3KKTV)
- S3 Media: chiselgrid-media-dev-storage
- S3 Frontend: chiselgrid-frontend-dev-storage

## Validation
- `pnpm typecheck` — passes on all packages per branch
- `cdk synth` — all stacks synthesize successfully
- EPIC-06: 20 files, full reader frontend with mock data
- EPIC-08: SSML converter, Polly Lambda, CDK audio stack
- EPIC-09: 8-file migration toolkit (tools/migration)
- EPIC-11: Lighthouse CI, structured data, cache headers

## Blocked
- Git push — GitHub HTTPS credentials not configured. See BLOCKED.md.

## Next Up
- Phase 2A: EPIC-04 (AI Brain), EPIC-05 (Creation Workspace), EPIC-07 (Admin Dashboard)
- Phase 3: EPIC-10 (Testing), EPIC-12 (Mobile)
