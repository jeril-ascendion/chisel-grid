# ChiselGrid — Project Status

**Last Updated:** 2026-04-06
**Current Sprint:** Sprint 1 — Foundation
**Active EPIC:** EPIC-01 COMPLETE — EPIC-02 Auth & User Management starting next

## In Progress
(none — EPIC-01 complete)

## Completed
- [x] T-01.1: Monorepo Initialization — pnpm workspace, Turborepo, app scaffolding, shared packages
- [x] T-01.2: CDK App & Stack Skeleton — 6 stacks, env context, resource tagging
- [x] T-01.3: Networking Stack — VPC, 2 AZs, NAT, VPC endpoints, security groups (code complete, deploy blocked)
- [x] T-01.4: Aurora Serverless v2 — PostgreSQL 15, Serverless v2, Secrets Manager (code complete, deploy blocked)
- [x] T-01.5: S3 + CloudFront — media bucket, frontend bucket, OAC, HTTPS distribution (code complete, deploy blocked)
- [x] T-01.6: GitHub Actions CI/CD — PR checks, CDK diff comment, staging deploy via OIDC

## Blocked
- AWS credentials not configured — see BLOCKED.md. CDK deploy requires `aws configure` or `aws sso login`, then `cdk bootstrap`. All CDK code is written and synthesizes successfully.

## Next Up (EPIC-02)
- T-02.1: Cognito User Pool Setup
- T-02.2: Azure AD SSO Federation
- T-02.3: NextAuth.js Frontend Integration
- T-02.4: API JWT Authorizer Lambda
