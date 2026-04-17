# ChiselGrid — Blocked Items

**Last Updated:** April 2026

## Currently Blocked

| Item | Blocked By | Who Can Unblock | Resumption Steps |
|------|-----------|----------------|-----------------|
| Teams Bot deployment | Azure Bot Service registration by IT team | IT / Azure AD Admin | All code complete. Add real Bot ID to apps/teams-app/.env as TEAMS_BOT_ID and deploy when available. |
| EPIC-09 Content Migration (run) | Aurora is in private VPC — not reachable from local WSL (TCP to cluster:5432 times out). Cluster status is `available` in ap-southeast-1. | Anyone with VPC access — bastion host, Lambda, or AWS SSM port-forward | Scripts are ready and schema-correct: `tools/migration/src/seed-categories.ts` (tenant + 156 categories), `tools/migration/src/import-taxonomy.ts` (parses 156 HTML files from `/tmp/taxonomy-source/dist`, Bedrock-enhances via Claude Sonnet 3.5, inserts as `status='in_review'`), `tools/migration/src/verify-import.ts`. Source HTML already extracted (156 files confirmed). To run: open SSM port-forward to `chiselgrid-dev-data-auroracluster23d869c0-tcmmbxk2uwgn.cluster-c946ag2qstlg.ap-southeast-1.rds.amazonaws.com:5432`, then `export DATABASE_URL=postgresql://chiselgrid_admin:<password>@localhost:5432/chiselgrid?sslmode=require` (password in Secrets Manager `chiselgrid/ChiselGrid-Dev-Data/aurora-master-credentials`), then `pnpm --filter @chiselgrid/migration seed-categories && pnpm --filter @chiselgrid/migration import-taxonomy && pnpm --filter @chiselgrid/migration verify-import`. |

## Recently Unblocked

| Item | Was Blocked By | Resolution | Date |
|------|---------------|------------|------|
| AWS CDK deployment | Expired AWS SSO token | Configured PowerUserAccess profile and set AWS_PROFILE env var | April 2026 |
| GitHub push | HTTPS auth not configured | Switched remote URL to SSH and added SSH key to GitHub | April 2026 |
| pnpm build | .js extensions in types index.ts | Removed .js extensions from export paths | April 2026 |
| AudioStack CDK build | config.stage property missing from EnvConfig | Derived envName from stack id string | April 2026 |
| Ralph Loop plugin | Wrong command syntax slash ralph-loop | Correct syntax is /ralph-loop:ralph-loop | April 2026 |
| AWS region mismatch | Default profile pointed to ap-south-1 Mumbai | Set AWS_DEFAULT_REGION=ap-southeast-1 in bashrc | April 2026 |
| Parallel stream merge conflicts | pnpm-lock.yaml conflicts from two simultaneous streams | Accepted theirs version then ran pnpm install to regenerate lockfile | April 2026 |
| Next.js Lambda cold start crash | OpenNext NFT tracer couldn't follow pnpm symlinks + stale `apps/web/pnpm-lock.yaml` prevented monorepo detection | Added `node-linker=hoisted` to `.npmrc`, deleted stale lockfile, fixed JSX namespace for React 19 | April 2026 |
| CloudFront /api/* returns 403 | AWS Org SCP blocks Lambda Function URL invocations + Function URL auth drift | Replaced Function URL with HTTP API Gateway as CloudFront origin, switched OpenNext wrapper to `aws-lambda` (non-streaming) | April 2026 |
| Route 53 cutover to Lambda distribution | Old S3 CloudFront dist (`EWLP3KOX3KKTV`) had domain aliases, needed removal before reassignment | Removed aliases from old dist, added ACM cert + domainNames to new dist, created Route 53 A records via CDK, disabled old dist | April 2026 |

## How to Report a New Blocker

If something becomes blocked during development:

1. Mark the task `[!]` in MASTER-TODO.md with the exact reason on the same line
2. Add a new row to the **Currently Blocked** table in this file with: what is blocked, what is needed, who can unblock it, and exact resumption steps
3. Skip to the next unblocked task and continue
4. Update the In Progress section of project-status.md

## Known Bugs — Fix Before Production

| Bug | Description | Priority |
|---|---|---|
| Login error=Configuration | NextAuth CredentialsProvider config issue, redirects to /login?error=Configuration | High |
| /articles 404 | Articles listing route not defined | Medium |
| localhost:3001 not browser accessible | Expected — API is Lambda handler not HTTP server | Low/Expected |
