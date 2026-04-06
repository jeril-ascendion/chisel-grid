# ChiselGrid — Project Status

**Last Updated:** 2026-04-06
**Current Sprint:** Sprint 1 — Foundation
**Active EPIC:** EPIC-01 COMPLETE — EPIC-02 Auth & User Management starting next

## In Progress
(none — EPIC-01 complete)

## Completed
- [x] T-01.1: Monorepo Initialization — pnpm workspace, Turborepo, app scaffolding, shared packages
- [x] T-01.2: CDK App & Stack Skeleton — 6 stacks, env context, resource tagging
- [x] T-01.3: Networking Stack — VPC, 2 AZs, NAT, VPC endpoints, security groups — DEPLOYED
- [x] T-01.4: Aurora Serverless v2 — PostgreSQL 15.8, private subnets, Secrets Manager — DEPLOYED
- [x] T-01.5: S3 + CloudFront — media bucket, frontend bucket, OAC, HTTPS distribution — DEPLOYED
- [x] T-01.6: GitHub Actions CI/CD — PR checks, CDK diff comment, staging deploy via OIDC

## Deployed Resources (dev / ap-southeast-1)
- VPC: vpc-0ae155cc9e8c03fa4 (10.0.0.0/16)
- Aurora: chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn (PostgreSQL 15.8, available)
- CloudFront: d1f3r42tp7znsx.cloudfront.net (EWLP3KOX3KKTV)
- S3 Media: chiselgrid-media-dev-storage
- S3 Frontend: chiselgrid-frontend-dev-storage

## Blocked
- Git push — GitHub HTTPS credentials not configured. See BLOCKED.md.

## Next Up (EPIC-02)
- T-02.1: Cognito User Pool Setup
- T-02.2: Azure AD SSO Federation
- T-02.3: NextAuth.js Frontend Integration
- T-02.4: API JWT Authorizer Lambda
