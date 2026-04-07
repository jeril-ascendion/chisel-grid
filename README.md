# ChiselGrid

> AI-native Content Management System — built for engineering knowledge portals.

**Live platform:** https://www.chiselgrid.com
**AWS Region:** ap-southeast-1
**AWS Account:** PowerUserAccess-852973339602

---

## Quick Start

### Every time you start development

```bash
bash scripts/start-dev.sh
pnpm dev --filter=@chiselgrid/web --filter=@chiselgrid/api
```

Open http://localhost:3000

### Every time you stop development

```bash
bash scripts/stop-dev.sh
```

---

## AWS Resource Management

```bash
bash scripts/chiselgrid-aws.sh on      # Start Aurora
bash scripts/chiselgrid-aws.sh wait    # Wait for Aurora (3-5 min)
bash scripts/chiselgrid-aws.sh status  # Check status + cost estimate
bash scripts/chiselgrid-aws.sh off     # Stop Aurora (saves ~$50/month)
bash scripts/chiselgrid-aws.sh deploy  # Build and deploy to chiselgrid.com
```

### Cost Reference

| State | Monthly Cost | Notes |
|-------|-------------|-------|
| Always running | ~$65-80/month | Aurora running 24/7 |
| Dev hours only (8h/day) | ~$20-30/month | Stop when done |
| Stopped | ~$5-8/month | S3 + CloudFront only |

> Always run `bash scripts/stop-dev.sh` when you finish. Aurora is the dominant cost.

---

## Deploy to chiselgrid.com

```bash
bash scripts/chiselgrid-aws.sh on
bash scripts/chiselgrid-aws.sh wait
bash scripts/chiselgrid-aws.sh deploy
```

If Aurora is already running, just run `bash scripts/chiselgrid-aws.sh deploy`.
CloudFront propagation takes 2-3 minutes after deploy completes.

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- AWS CLI configured with profile `PowerUserAccess-852973339602`
- WSL2 on Windows

### Setup

```bash
git clone https://github.com/jeril-ascendion/chisel-grid.git
cd chisel-grid
pnpm install
```

### Environment Variables

Required in `apps/web/.env.local`:

```bash
AUTH_SECRET=<32+ char secret>
COGNITO_CLIENT_ID=<from AWS Cognito>
COGNITO_CLIENT_SECRET=<from AWS Cognito>
COGNITO_ISSUER_URL=https://cognito-idp.ap-southeast-1.amazonaws.com/<pool-id>
NEXTAUTH_URL=http://localhost:3000
TEAMS_APP_ID=225d1020-cae4-4b3d-8aae-6168774f69c9
TEAMS_BOT_ID=placeholder-pending-it-approval
```

### Run Dev Server

```bash
pnpm dev --filter=@chiselgrid/web --filter=@chiselgrid/api
```

### Build and Type Check

```bash
pnpm typecheck
pnpm build
NEXT_OUTPUT=export pnpm build --filter=@chiselgrid/web
```

---

## Project Structure

```
chisel-grid/
├── apps/
│   ├── web/              Next.js 16 frontend (chiselgrid.com)
│   ├── api/              Lambda API handlers
│   ├── mobile/           React Native Expo app
│   └── teams-app/        Microsoft Teams app
├── packages/
│   ├── ai/               AI agents (Writer, Research, Diagram, Review)
│   ├── db/               Drizzle ORM schema + migrations
│   ├── types/            Shared TypeScript types
│   ├── ui/               Shared component library
│   ├── email/            React Email templates
│   └── integrations/     Microsoft Graph, SCIM, MCP server
├── infra/                AWS CDK stacks
├── tools/
│   └── migration/        Content import tools
└── scripts/
    ├── chiselgrid-aws.sh  AWS resource management
    ├── start-dev.sh       Start dev environment
    └── stop-dev.sh        Stop dev environment
```

---

## Infrastructure

| Resource | ID / Name | Notes |
|----------|-----------|-------|
| CloudFront | EWLP3KOX3KKTV | chiselgrid.com |
| S3 Bucket | chiselgrid-frontend-dev-storage | Static frontend |
| Cognito Pool | ap-southeast-1_udIDE5cgD | Auth |
| Aurora Cluster | chiselgrid-dev-* | PostgreSQL 15 |
| AWS Region | ap-southeast-1 | Singapore |

### CDK Stacks

```bash
cd infra && pnpm cdk deploy --all
pnpm cdk deploy ChiselGrid-Dev-Api
```

Stack order: Network → Data → Storage → Auth → Api → Ai

---

## Admin Access

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Local dev |
| http://localhost:3000/admin | Admin dashboard |
| http://localhost:3000/login | Login page |
| https://www.chiselgrid.com | Production |
| https://www.chiselgrid.com/admin | Production admin |

**Admin credentials:**
Email: `jeril.panicker@ascendion.com`
Password: `ChiselGrid@2026!`

---

## Architecture

```
Creator/Admin
     │
     ▼
Next.js Web App ──── API Gateway ──── Lambda Handlers
     │                                      │
     │                               Aurora PostgreSQL
     │                               (Drizzle ORM)
     ▼
AI Workspace ──── Step Functions ──── AI Agents
                                      ├── Research Agent (Bedrock)
                                      ├── Writer Agent (Bedrock)
                                      ├── Diagram Agent (Mermaid)
                                      ├── Review Agent (Bedrock)
                                      └── Audio Agent (Polly)
```

---

## Two-Plan Architecture

### Interim Plan (Current)

`chiselgrid.com` IS the live platform serving all content.
All development targets `chiselgrid.com`.
Ascendion engineering content hosted here as primary tenant.

### Final Plan (After Domain Migration)

`chiselgrid.com` becomes the ChiselGrid product platform.
`ascendion.engineering` becomes Client #1 tenant (tenantId: ascendion).
Domain transfers from jeriltech AWS (815023191933) to Ascendion AWS (852973339602).

---

## Development Workflow

```bash
# 1. Start work session
bash scripts/start-dev.sh
pnpm dev --filter=@chiselgrid/web --filter=@chiselgrid/api

# 2. Create feature branch
git checkout -b feature/your-feature develop

# 3. Make changes and test locally at http://localhost:3000

# 4. Build check before commit
pnpm typecheck && pnpm build

# 5. Commit and push
git add -A
git commit -m "feat: your feature description"
git push origin feature/your-feature

# 6. Deploy to production
bash scripts/chiselgrid-aws.sh deploy

# 7. End work session — ALWAYS DO THIS
bash scripts/stop-dev.sh
```

---

## Branching Strategy

```
main        ← production releases
staging     ← pre-production testing
develop     ← integration branch (all EPICs merge here)
epic/*      ← feature branches per EPIC
```

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Claude Code context and architecture decisions |
| `MASTER-TODO.md` | All EPICs and task tracking |
| `MASTER-TODO-EPICS-16-30.md` | Voice, integrations, advanced AI EPICs |
| `RALPH-PHASES-5-8.md` | Ralph Loop prompts for Phase 5-8 |
| `project-status.md` | Current sprint status |
| `BLOCKED.md` | External dependencies blocking progress |

---

## External Dependencies

| Item | Status | Blocks |
|------|--------|--------|
| Azure Bot ID | Pending IT approval | Teams bot deployment |
| ascendion.engineering domain transfer | Pending IT | Final plan embedding |
| Apple Developer account | Not started | iOS App Store |
| Google Play Console | Not started | Android App Store |

---

## Progress Tracker

| Phase | EPICs | Tasks | Status |
|-------|-------|-------|--------|
| Phase 1 — Foundation | 1-3 | 16 | ✅ Complete |
| Phase 2A — AI Brain + Admin | 4-7 | 22 | ✅ Complete |
| Phase 2B — Reader + Audio | 8-11 | 28 | ✅ Complete |
| Phase 3 — Testing + Mobile | 12 | 20 | ✅ Complete |
| Phase 4 — Multi-tenancy | 13-15 | 16 | ✅ Complete |
| Phase 5 — Voice Pipeline | 16-19 | 32 | ✅ Complete |
| Phase 6 — Microsoft Stack | 20-23 | 37 | ✅ Complete |
| Phase 7 — Integrations | 24-28 | 40 | 🔄 Pending |
| Phase 8 — Advanced AI | 29-30 | 16 | 🔄 Pending |

**Total complete: 171 tasks across 23 EPICs**

---

*Built by Ascendion Digital Services Philippines*
*ChiselGrid v1.0 · April 2026*
