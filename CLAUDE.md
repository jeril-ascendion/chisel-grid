# ChiselGrid — Claude Code Project Context

## Project Overview
- **Platform:** ChiselGrid — AI-native CMS for ascendion.engineering
- **Stack:** Next.js / TypeScript / pnpm monorepo / AWS CDK / Aurora PostgreSQL / AWS Bedrock
- **AWS Region:** ap-southeast-1 (Singapore)
- **Current Phase:** v1.0 — Foundation being established (EPIC-01)

## Monorepo Structure
- `apps/web` — Next.js App Router frontend (@chiselgrid/web)
- `apps/api` — Lambda API handlers (@chiselgrid/api)
- `packages/db` — Drizzle ORM schema and repositories (@chiselgrid/db)
- `packages/ai` — AI agent implementations (@chiselgrid/ai)
- `packages/types` — Shared Zod schemas and TypeScript types (@chiselgrid/types)
- `packages/ui` — Shared React component library (@chiselgrid/ui)
- `packages/config` — Shared ESLint, TypeScript, Prettier configs (@chiselgrid/config)
- `infra/` — AWS CDK infrastructure code

## CRITICAL PERMANENT RULES

1. NEVER disable CloudFront distributions that are active Route53
   ALIAS targets. A disabled CF distribution returns no A records,
   causing DNS_PROBE_FINISHED_NXDOMAIN even if Route53 is correct.
   Always verify distribution is Enabled: true before diagnosing
   DNS issues.

2. ADMIN LAYOUT AUTH GUARD — The auth() check and redirect('/login') in
   apps/web/src/app/admin/layout.tsx must NEVER be removed. It has regressed
   multiple times. Any change to admin/layout.tsx must preserve:

       const session = await auth()
       if (!session || !session.user) { redirect('/login') }

   The file must remain a server component (NO 'use client' directive).
   A client layout renders the HTML shell before redirecting, which returns
   200 to curl and leaks the admin chrome to unauthenticated users.

   Middleware at apps/web/src/middleware.ts is the second layer and must
   use the NextAuth v5 wrapper form `auth((req) => ...)` so `req.auth`
   is populated — `await auth()` alone does NOT see session cookies in
   middleware. Both the layout guard and middleware must exist simultaneously.

   Regression test (run in CI or before every deploy):
       curl -s -o /dev/null -w "%{http_code}\n" https://www.chiselgrid.com/admin
   MUST print 307 or 302. If it prints 200, the guard has regressed.

## Architecture Decisions (Follow These Always)
- Content stored as `ContentBlock[]` JSON in Aurora JSONB column — see packages/types/src/content.ts
- AI agent workflows run in Step Functions — never block synchronous API responses
- All AWS infrastructure in infra/lib/stacks — never create resources manually in Console
- Drizzle ORM for all DB access — no raw SQL outside packages/db/src/repositories/
- Every Lambda handler validates input with Zod before processing
- All secrets in AWS Secrets Manager — never in .env files in deployed environments
- Multi-tenant by design — every DB query is scoped by tenantId

## Key Commands
- `pnpm dev` — start all apps in development
- `pnpm typecheck` — TypeScript check all packages
- `pnpm test` — run all tests
- `pnpm build` — production build
- `pnpm db:generate` — generate Drizzle migrations
- `pnpm db:migrate` — apply migrations to target DB
- `pnpm cdk:diff` — preview infra changes
- `pnpm cdk:deploy` — deploy to AWS

## Do Not Modify Without Discussion
- `packages/types/src/content.ts` — ContentBlock schema is the contract between all layers
- `infra/lib/stacks/network.stack.ts` — VPC/subnet config once locked in T-01.3
- `packages/db/src/migrations/` — never edit generated migration files

## Current Sprint
See project-status.md

## Important Pattern — useSession in Static Pages

Article pages use generateStaticParams (SSG). Any component using
useSession MUST be wrapped with dynamic import + ssr:false:

import dynamic from 'next/dynamic'
const MyComponent = dynamic(() => import('./MyComponent'), { ssr: false })

Direct import of useSession components in SSG pages causes them to
always return null because there is no session context at build time.

## Role Extraction

Role must be extracted from Cognito ID token JWT claims (cognito:groups),
NOT from AdminListGroupsForUserCommand. The Admin API requires IAM
credentials that the Next.js dev server does not have.
