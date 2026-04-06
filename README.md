# ChiselGrid — AI-Native CMS Platform

## What is ChiselGrid

ChiselGrid is an AI-native content management system. It is not a traditional CMS with AI features bolted on as an afterthought. Every layer of the platform — from content creation to review to publishing to audio narration — is designed around AI agents that do the heavy lifting while humans provide editorial judgment and governance.

The core thesis is simple: **Content is a workflow. AI is the workforce. Humans are the editorial judgment layer.** When a creator starts a new article, they describe what they want. AI agents research, write, diagram, review, and narrate the content. The human creator reviews and refines the output. An admin approves it for publication. The result is high-quality, multi-modal technical content produced at a fraction of the time and cost of traditional authoring.

ChiselGrid's initial deployment is the **Ascendion Engineering Portal** at [ascendion.engineering](https://ascendion.engineering) and [chiselgrid.com](https://chiselgrid.com). This portal serves as the knowledge hub for Ascendion's 7,000+ software engineers — publishing engineering standards, architecture best practices, technical deep-dives, and mentoring content.

The long-term vision is a **white-label SaaS platform** sold to enterprise clients. Any organization that needs an internal knowledge portal — for engineering training, compliance documentation, onboarding programs, or corporate communications — can deploy their own branded ChiselGrid instance with custom domains, branding, and billing. Multi-tenancy is built into the data model from day one, not retrofitted.

## The Ascendion Engineering Mentoring Program

ChiselGrid was born from a specific need: Ascendion wanted to build a dynamic, AI-driven knowledge portal that actively mentors its engineers. The idea is that engineers learn not only by reading but by creating. When an engineer writes about an architecture pattern, they internalize it. When they submit a blog post about a project learning, the organization captures institutional knowledge that would otherwise walk out the door.

The portal publishes two types of content. **Standard Documentation** covers engineering standards, architecture guidelines, and best practices — these are authoritative reference materials created and maintained by engineering leads and admins. **Blog Posts** are submitted by any Ascendion engineer (Creator role) and go through an AI-assisted writing workflow followed by admin review before publication. This two-track approach means the portal is both a curated reference library and a living, contributor-driven knowledge base.

AI agents dramatically lower the barrier to contribution. An engineer does not need to be a skilled technical writer. They describe what they want to share — a project learning, a tool evaluation, an architecture decision — and the AI agents handle research, structuring, diagram generation, code formatting, SEO optimization, and audio narration. The engineer reviews the output, makes corrections, and submits. The admin reviews for accuracy and approves. The result is a polished, multi-modal article in a fraction of the time it would take to write from scratch.

The portal serves three strategic goals for Ascendion: it builds the Ascendion engineering brand externally, it captures and distributes institutional knowledge internally, and it accelerates onboarding for new engineers who can read, listen to, and search a comprehensive knowledge base from day one.

## Platform Availability

- **Web:** [chiselgrid.com](https://chiselgrid.com) (primary platform) and [ascendion.engineering](https://ascendion.engineering) (engineering portal)
- **iOS App:** Available on the Apple App Store (link TBD)
- **Android App:** Available on the Google Play Store (link TBD)
- **Mobile Features:** Offline reading with SQLite caching, native audio player with background playback and speed controls, push notifications by category, debounced search with recent search history

## User Roles and Flows

### Readers (No Login Required)

Readers are the primary consumers of ChiselGrid content. No account is needed to read.

- Browse engineering articles, standards, and best practices on the homepage and category pages
- Search by topic, tag, or category using full-text PostgreSQL search with result highlighting
- Listen to the AI-generated audio narration of any published article via the built-in audio player
- Share articles via direct URL — every article has Open Graph tags optimized for LinkedIn and Twitter
- Subscribe to the RSS feed at `/feed.xml` for new article notifications
- Toggle dark/light mode for comfortable reading
- Read offline on mobile by saving articles for later

### Creators (Ascendion Employees, Login Required)

Creators are Ascendion engineers who contribute content to the portal.

- Log in via Ascendion Azure AD SSO — no separate password needed
- Open the AI Workspace: type a topic, upload a reference document, or provide voice notes
- Watch AI agents research, write, design diagrams, and structure the content in real time via WebSocket streaming
- Review and edit the AI-generated draft using the block editor — modify text, code, callouts, and diagrams inline
- Preview the article exactly as readers will see it, including SEO metadata and estimated read time
- Submit the finished draft for admin review with category, tags, and slug assignment
- Track the review status of submitted articles and respond to admin feedback

### Admins (Engineering Leads, Login Required)

Admins govern the content lifecycle and manage the platform.

- All Creator capabilities — admins can also create and submit content
- Create and manage Standard Documentation — authoritative engineering standards that bypass the creator submission flow
- Review the content queue: see AI quality scores, read the full draft, and approve or reject with feedback
- Manage the content lifecycle: view all content by status (draft, in review, approved, published, deprecated, rejected)
- Edit any published content with the full block editor, with version history tracking
- Manage users: view all accounts, change roles (admin/creator/reader), enable or disable accounts
- Manage categories: create, edit, reorder, and delete the category hierarchy with slug management
- View AI usage analytics: tokens consumed per agent, estimated costs, per-creator usage, and daily trend charts
- Configure content workflow settings and review thresholds

## AI Brain — How It Works

When a Creator starts a new article in the AI Workspace, a coordinated pipeline of AI agents collaborates to produce a complete, multi-modal article. The pipeline is orchestrated by AWS Step Functions and runs asynchronously — the creator watches progress in real time via WebSocket but is never blocked waiting for a synchronous response.

**Research Agent** — Searches the web and internal knowledge base to produce a structured research brief on the topic, gathering relevant sources and technical context. (Planned for v2.0 — currently the Writer Agent works directly from the creator's topic description.)

**Writer Agent** — Receives the topic and context and generates a full structured article as an array of ContentBlock objects (headings, paragraphs, code blocks, callouts, diagrams). Uses Claude Sonnet via AWS Bedrock. Targets 1,500-3,000 words of professional technical prose aimed at senior software engineers.

**Design Agent** — Plans the visual structure and layout of the article, determining where diagrams, code examples, and callouts should appear for maximum clarity. (Planned for v2.0.)

**Diagram Agent** — Generates Mermaid diagram code from architecture and process descriptions embedded in the article. Supports flowcharts, sequence diagrams, class diagrams, state diagrams, and entity-relationship diagrams. Output is valid Mermaid.js v10+ syntax.

**Illustration Agent** — Generates supporting graphics and hero images for articles. (Planned for v2.0.)

**Review Agent** — Scores the draft across five dimensions: accuracy (0-100), completeness (0-100), readability (0-100), SEO quality (0-100), and technical depth (0-100). If the overall score falls below the revision threshold (default 60), the article automatically enters a revision loop — the Writer Agent receives the Review Agent's specific feedback and revision instructions and produces an improved draft. This loop runs up to 3 times before escalating to human review regardless of score.

**SEO Agent** — Generates meta titles (50-60 characters), meta descriptions (150-160 characters), 5-8 keywords, Open Graph tags, and JSON-LD Article structured data. Also suggests internal link opportunities to other articles in the portal.

**Audio Agent** — Converts the finished article to SSML (Speech Synthesis Markup Language) with a pronunciation dictionary for 60+ technical terms (AWS, API, K8s, PostgreSQL, CI/CD, gRPC, etc.), then synthesizes natural-speech MP3 narration via Amazon Polly Neural TTS with the Matthew voice. Code blocks are skipped with a "code example omitted in audio version" notice. Every published article is listenable.

**Human Review Gate** — After the AI pipeline completes, the article enters a human review queue. An admin receives an SES email notification, reviews the article with full AI quality scores visible, and approves or rejects with feedback. This gate ensures that no AI-generated content goes live without human approval.

**The principle: AI produces, humans govern.** The AI agents handle the labor-intensive parts of content creation — research, writing, formatting, diagramming, narration. Humans provide the judgment — topic selection, accuracy verification, editorial approval. This division of labor produces better content faster.

## Content Types

- **Standard Documentation** — Engineering standards, architecture guidelines, coding best practices, and operational runbooks. Created by Admins with AI assistance. These represent the organization's canonical technical guidance.
- **Blog Posts** — Engineering insights, project learnings, technical deep-dives, tool evaluations, and conference takeaways. Submitted by Creators (any Ascendion engineer), reviewed and approved by Admins before publication.
- **All content is multi-modal:** Every published article includes structured text with headings, embedded Mermaid diagrams for architecture and flow visualization, syntax-highlighted code blocks with filenames, callout blocks for warnings and key takeaways, and AI-generated MP3 audio narration.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js App Router with ISR, TypeScript, Tailwind CSS |
| **Backend** | AWS Lambda, API Gateway (REST + WebSocket), Aurora Serverless v2 PostgreSQL |
| **ORM** | Drizzle ORM with typed repositories, cursor pagination, full-text search |
| **AI** | AWS Bedrock (Claude Sonnet), Amazon Polly Neural TTS, Step Functions orchestration |
| **Auth** | AWS Cognito User Pools, Azure AD SSO federation, JWT Lambda authorizer |
| **Infrastructure** | AWS CDK (TypeScript), CloudFront, S3, SQS, EventBridge, SES |
| **Mobile** | React Native with Expo SDK 52, Expo Router, expo-av, expo-sqlite, expo-secure-store |
| **Monorepo** | pnpm workspaces, Turborepo, 9 packages |
| **Testing** | Vitest (146 unit/integration tests), Playwright E2E, GitHub Actions CI |

## Architecture Overview

```
Reader (Web/Mobile)        Creator (Web/Mobile)        Admin (Web)
       |                          |                         |
       +──────────────────────────+─────────────────────────+
                                  |
                           CloudFront CDN
                                  |
                  +───────────────+────────────────+
                  |                                |
           Next.js Frontend            API Gateway + Lambda
                  |                                |
           Aurora PostgreSQL             AWS Bedrock AI Brain
                  |                                |
                 S3                   Step Functions Workflow
           Media and Audio                         |
                                          Amazon Polly Audio
```

**Monorepo structure:**

```
chisel-grid/
  apps/
    web/          — Next.js App Router frontend (@chiselgrid/web)
    api/          — Lambda API handlers (@chiselgrid/api)
    mobile/       — React Native Expo app (@chiselgrid/mobile)
  packages/
    ai/           — AI agents, Bedrock client, SSML converter (@chiselgrid/ai)
    db/           — Drizzle ORM schema and repositories (@chiselgrid/db)
    types/        — Shared Zod schemas and TypeScript types (@chiselgrid/types)
    api-client/   — Shared REST API client with Zod validation (@chiselgrid/api-client)
    ui/           — Shared React component library (@chiselgrid/ui)
    config/       — Shared ESLint, TypeScript, Prettier configs (@chiselgrid/config)
  infra/          — AWS CDK infrastructure (7 stacks)
  e2e/            — Playwright end-to-end tests
```

## Branching and Deployment Flow

```
epic/* branches → develop → staging → main
```

- **epic/*** — Feature work happens on epic branches, built by Claude Code and Ralph Loop. Each EPIC gets its own branch (e.g., `epic/10-testing`, `epic/12-mobile`).
- **develop** — Integration branch. All completed EPICs merge here. CI runs typecheck and unit/integration tests on every push.
- **staging** — Pre-production environment. Auto-deploys to AWS staging via CDK when develop merges. Playwright E2E tests run against the staging URL.
- **main** — Production only. Deploys to [chiselgrid.com](https://chiselgrid.com) and [ascendion.engineering](https://ascendion.engineering). Protected branch requiring PR approval.

## Local Development Setup

1. **Prerequisites:** Node.js 20 LTS, pnpm 9+, AWS CLI v2, Docker Desktop (with WSL2 on Windows)
2. **Clone:** `git clone git@github.com:jeril-ascendion/chisel-grid.git`
3. **Install:** `pnpm install`
4. **Environment:** `cp .env.example .env.local` and fill in AWS credentials, Cognito pool IDs, and database connection string
5. **Database migrations:** `pnpm db:migrate`
6. **Seed data:** `pnpm db:seed`
7. **Start development:** `pnpm dev`
8. **Open:** [http://localhost:3000](http://localhost:3000) for web, [http://localhost:3001](http://localhost:3001) for API

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development |
| `pnpm typecheck` | TypeScript check all 9 packages |
| `pnpm test` | Run all unit and integration tests (146 tests across 4 packages) |
| `pnpm test:e2e` | Run Playwright E2E tests against local dev server |
| `pnpm build` | Production build |
| `pnpm db:generate` | Generate Drizzle migrations from schema changes |
| `pnpm db:migrate` | Apply pending database migrations |
| `pnpm db:seed` | Seed database with default tenant and category tree |
| `pnpm cdk:diff` | Preview AWS infrastructure changes |
| `pnpm cdk:deploy` | Deploy to AWS environment |
| `pnpm cdk:synth` | Synthesize CloudFormation templates |

## Product Roadmap

| Version | Focus | Status |
|---------|-------|--------|
| **v1.0** (current) | Ascendion Engineering Portal — Admin CMS, AI content pipeline, Reader frontend, Audio generation, Testing infrastructure, Mobile app | In Development |
| **v1.1** | White-label packaging — Multi-tenancy, custom domains, Stripe billing, self-service onboarding, cloud-agnostic content export | Planned |
| **v2.0** | Full AI Brain — All 7 agents including Research, Design, and Illustration, RAG knowledge base, Analytics dashboard | Planned |
| **v2.5** | Commercial SaaS — Starter/Professional/Enterprise tiers, dedicated CSM, SLA guarantees | Planned |

## The Five Core Principles

1. **AI produces, humans govern** — Every piece of content flows through AI agents for generation and a human admin for approval. No content goes live without human judgment.

2. **Multi-modal from day one** — Text, audio, diagrams, and code blocks are generated as part of every published article. Content is not text-only with media added later.

3. **White-label is a first-class citizen** — Tenancy is in the data model from the beginning, not retrofitted. Every database query is scoped by tenantId. Row-level security is enforced at the PostgreSQL layer.

4. **Async by default** — AI workflows never block the user. Every AI job is queued, tracked in the database, and streamed to the client via WebSocket. The user watches progress in real time but can navigate away and return.

5. **AWS-native, not AWS-locked** — The platform is built on AWS services (Bedrock, Polly, Aurora, CDK) but the architecture allows swapping: the AI layer can move to a different LLM provider, the frontend can deploy to Vercel, the database can migrate to Neon or any PostgreSQL host.

## Contributing

**Internal Ascendion contributors:** Log in at [chiselgrid.com](https://chiselgrid.com) with your Ascendion Azure AD credentials and submit content via the Creator workspace. No git access is required for content contributions.

**Engineering contributions:** Create a feature branch from `develop`, follow the branching strategy described above, and open a pull request to `develop`. CI will run typecheck and tests automatically. See `CLAUDE.md` for codebase conventions and architecture decisions.
