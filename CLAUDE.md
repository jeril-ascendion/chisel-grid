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

3. BOTH BUILD_IDs MUST COEXIST IN S3 — The static-export build and the
   OpenNext Lambda build produce different BUILD_IDs and different chunk
   filenames. CloudFront's default origin is S3, so every /_next/static/*
   request (including those referenced by Lambda-SSR'd /admin pages) hits
   S3 first. If the OpenNext BUILD_ID's chunks aren't in S3, /admin loads
   without CSS/JS and appears as plain unstyled HTML with blue links.

   After any Lambda deploy (npx open-next build + cdk deploy), the script
   scripts/chiselgrid-aws.sh deploy MUST be run, OR equivalently:

       aws s3 sync apps/web/.open-next/assets/_next/static/ \
         s3://chiselgrid-frontend-dev-storage/_next/static/ \
         --cache-control "public,max-age=31536000,immutable" \
         --profile PowerUserAccess-852973339602 --region ap-southeast-1

   Note: CloudFront /admin* and /api/* behaviors already target the API
   Gateway origin and do NOT need changing. /admin returning 307 to curl
   proves routing is correct — an unstyled /admin after login is always
   a missing-chunks problem, never a routing problem.

   Regression test:
       ls apps/web/.open-next/assets/_next/static/ | grep -E '^[A-Za-z0-9_-]{20,}$'
   The listed BUILD_ID dir must exist under _next/static/ in S3.

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

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. The
skill has multi-step workflows, checklists, and quality gates that produce better
results than an ad-hoc answer. When in doubt, invoke the skill. A false positive is
cheaper than a false negative.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke /office-hours
- Strategy, scope, "think bigger", "what should we build" → invoke /plan-ceo-review
- Architecture, "does this design make sense" → invoke /plan-eng-review
- Design system, brand, "how should this look" → invoke /design-consultation
- Design review of a plan → invoke /plan-design-review
- Developer experience of a plan → invoke /plan-devex-review
- "Review everything", full review pipeline → invoke /autoplan
- Bugs, errors, "why is this broken", "wtf", "this doesn't work" → invoke /investigate
- Test the site, find bugs, "does this work" → invoke /qa (or /qa-only for report only)
- Code review, check the diff, "look at my changes" → invoke /review
- Visual polish, design audit, "this looks off" → invoke /design-review
- Developer experience audit, try onboarding → invoke /devex-review
- Ship, deploy, create a PR, "send it" → invoke /ship
- Merge + deploy + verify → invoke /land-and-deploy
- Configure deployment → invoke /setup-deploy
- Post-deploy monitoring → invoke /canary
- Update docs after shipping → invoke /document-release
- Weekly retro, "how'd we do" → invoke /retro
- Second opinion, codex review → invoke /codex
- Safety mode, careful mode, lock it down → invoke /careful or /guard
- Restrict edits to a directory → invoke /freeze or /unfreeze
- Upgrade gstack → invoke /gstack-upgrade
- Save progress, "save my work" → invoke /context-save
- Resume, restore, "where was I" → invoke /context-restore
- Security audit, OWASP, "is this secure" → invoke /cso
- Make a PDF, document, publication → invoke /make-pdf
- Launch real browser for QA → invoke /open-gstack-browser
- Import cookies for authenticated testing → invoke /setup-browser-cookies
- Performance regression, page speed, benchmarks → invoke /benchmark
- Review what gstack has learned → invoke /learn
- Tune question sensitivity → invoke /plan-tune
- Code quality dashboard → invoke /health
