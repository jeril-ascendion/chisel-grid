# ChiselGrid — Project Status

**Last Updated:** 2026-04-06
**Current Sprint:** Sprint 2 — Auth & Content Model
**Active EPIC:** EPIC-03 COMPLETE — Phase 1 finished, Phase 2 starts next

## In Progress
(none — EPIC-02 and EPIC-03 complete)

## Completed — EPIC-02: Authentication & User Management
- [x] T-02.1: Cognito User Pool CDK construct — groups, MFA, password policy, App Client
- [x] T-02.2: Azure AD SSO federation — OIDC identity provider, conditional via CDK context
- [x] T-02.3: NextAuth.js frontend integration — Cognito provider, login/logout pages, proxy (Next.js 16), session context
- [x] T-02.4: API JWT Lambda authorizer — JWKS validation, 5-min cache, Cognito groups → IAM policy
- [x] T-02.5: User management API endpoints — GET /users, PATCH role/status, audit logging

## Completed — EPIC-03: Content Model & Database Schema
- [x] T-03.1: Core database schema — 10 tables via Drizzle (tenants, users, content, content_revisions, categories, tags, content_tags, media_assets, ai_jobs, audit_log)
- [x] T-03.2: Content repository layer — typed CRUD, cursor pagination, full-text search, tenant-scoped queries
- [x] T-03.3: Taxonomy & engineering domain seed — 6 domains, 18 subcategories, slug generation
- [x] T-03.4: Database migration runner — drizzle-kit generate, migrate/seed scripts, pnpm db:* commands
- [x] T-03.5: Row-level security policies — PostgreSQL RLS by tenantId, apply + verify scripts

## Completed — EPIC-01: Foundation & Infrastructure Setup
- [x] T-01.1: Monorepo Initialization
- [x] T-01.2: CDK App & Stack Skeleton
- [x] T-01.3: Networking Stack — DEPLOYED
- [x] T-01.4: Aurora Serverless v2 — DEPLOYED
- [x] T-01.5: S3 + CloudFront — DEPLOYED
- [x] T-01.6: GitHub Actions CI/CD

## Deployed Resources (dev / ap-southeast-1)
- VPC: vpc-0ae155cc9e8c03fa4 (10.0.0.0/16)
- Aurora: chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn (PostgreSQL 15.8, available)
- CloudFront: d1f3r42tp7znsx.cloudfront.net (EWLP3KOX3KKTV)
- S3 Media: chiselgrid-media-dev-storage
- S3 Frontend: chiselgrid-frontend-dev-storage

## Validation
- `pnpm typecheck` — 6/6 packages pass
- `cdk synth` — all 6 stacks synthesize successfully
- `drizzle-kit generate` — 10 tables, migration generated

## Blocked
- Git push — GitHub HTTPS credentials not configured. See BLOCKED.md.

## Next Up (Phase 2)
- EPIC-04: AI Brain — Core Agents (Stream A)
- EPIC-06: Reader-Facing Frontend (Stream B)
- EPIC-08: Audio Generation Pipeline (Stream C)
