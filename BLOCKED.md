# ChiselGrid — Blocked Items

**Last Updated:** April 2026

## Currently Blocked

| Item | Blocked By | Who Can Unblock | Resumption Steps |
|------|-----------|----------------|-----------------|
| Teams Bot deployment | Azure Bot Service registration by IT team | IT / Azure AD Admin | All code complete. Add real Bot ID to apps/teams-app/.env as TEAMS_BOT_ID and deploy when available. |
| CloudFront /api/* on chiselgrid.com returns 403 | Cannot `cdk deploy` while EPIC-09 migration is live (same AWS account / overlapping stacks) | Anyone, after EPIC-09 import completes | **Root cause:** `scripts/chiselgrid-aws.sh deploy` builds a static S3 export and strips `apps/web/src/app/api/` before upload, so CloudFront distribution `EWLP3KOX3KKTV` has no origin that serves `/api/*`. **Fix already in code:** `infra/lib/stacks/web.stack.ts` defines an OpenNext Next.js Lambda + its own CloudFront distribution whose default behavior routes everything (including `/api/*`) to the Lambda — no additional CDK changes required. **To unblock:** `pnpm build --filter=@chiselgrid/web && (cd apps/web && npx open-next build) && cd infra && npx cdk deploy ChiselGrid-Dev-Api ChiselGrid-Dev-Web --profile PowerUserAccess-852973339602 --region ap-southeast-1 --require-approval never`. **Follow-up after deploy:** add `certificate` + `domainNames: ['www.chiselgrid.com', 'chiselgrid.com']` to the `new cloudfront.Distribution` call in `web.stack.ts`, then flip Route 53 ALIAS from `EWLP3KOX3KKTV` to the new distribution and retire the old static-S3 one. |
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
