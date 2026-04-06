# ChiselGrid — AI-Native CMS Platform

## What is ChiselGrid

ChiselGrid is an AI-native content management system. It is not a traditional CMS with AI features bolted on as an afterthought. Every part of the platform — from content creation to review to publication — is designed around AI agents that do the heavy lifting while humans provide editorial judgment and governance.

The core thesis behind ChiselGrid is simple: **Content is a workflow. AI is the workforce. Humans are the editorial judgment layer.** When an engineer wants to share knowledge, they should not spend hours formatting, diagramming, and polishing. They should focus on the ideas, and let AI agents handle the production work. The human's role is to guide, review, and approve — never to be replaced, but always to be amplified.

The first deployment of ChiselGrid powers the Ascendion Engineering Portal at [ascendion.engineering](https://ascendion.engineering) and [chiselgrid.com](https://chiselgrid.com). This portal serves as a living knowledge base for Ascendion's engineering organization, where engineers contribute standards, best practices, architecture patterns, and technical deep-dives — all assisted by AI.

Looking ahead, ChiselGrid is being built as a white-label SaaS platform. Enterprise clients will be able to deploy their own branded instance for internal training portals, company announcements, knowledge sharing hubs, and engineering documentation — all powered by the same AI-native content pipeline that drives the Ascendion portal.

## The Ascendion Engineering Mentoring Program

The Ascendion Engineering Portal is the flagship deployment of ChiselGrid, built with a clear intent: create a dynamic, AI-driven knowledge portal that mentors Ascendion engineers at every level. Rather than static documentation that goes stale, the portal is a living system where knowledge is continuously created, reviewed, and refined.

Engineers learn by doing — by reading engineering standards, creating technical content, and contributing their expertise back to the organization. The portal encourages this cycle by making content creation frictionless. An engineer can start with a rough idea, a voice note, or an uploaded document, and AI agents will research, write, diagram, and narrate the content. The engineer focuses on knowledge sharing, not formatting.

The portal supports two content types that serve different purposes. **Standard Documentation** covers engineering standards, architecture guidelines, and best practices — these are created and maintained by Admin-level engineering leads and represent the organization's canonical technical guidance. **Blog Posts** are engineering insights, project learnings, and technical deep-dives submitted by any Ascendion engineer (Creators) and reviewed by Admins before publication.

Beyond individual skill development, the portal builds the Ascendion engineering brand externally, captures institutional knowledge that would otherwise live only in people's heads, and accelerates onboarding for new engineers who can immerse themselves in a rich library of standards and real-world technical content from day one.

## Platform Availability

- **Web:** [chiselgrid.com](https://chiselgrid.com) (primary platform) and [ascendion.engineering](https://ascendion.engineering) (engineering portal)
- **iOS App:** Available on the Apple App Store (link TBD)
- **Android App:** Available on Google Play Store (link TBD)
- **Mobile features:** Offline reading, native audio player with background playback, push notifications by category

## User Roles and Flows

### Readers (No Login Required)

Readers are the primary audience — any engineer or visitor who wants to learn from the content.

- Browse engineering articles, standards, and best practices on the homepage and category pages
- Search by topic, tag, or category with full-text search and result highlighting
- Listen to the AI-generated audio version of any article via the built-in audio player
- Share articles via direct link — every article has clean URLs and Open Graph metadata for rich social previews

### Creators (Ascendion Employees, Login Required)

Creators are Ascendion engineers who contribute content to the portal.

- Log in via Ascendion Azure AD SSO — no separate account needed
- Open the AI workspace: type a topic, upload a document, or record a voice note
- Watch AI agents research, write, design, and diagram the content in real time via WebSocket streaming
- Review and edit the AI-generated draft using the block-based content editor
- Submit the finished draft for Admin review with category, tags, and slug
- Track review status and receive feedback from Admins

### Admins (Engineering Leads, Login Required)

Admins govern the content lifecycle and manage the platform.

- All Creator capabilities — Admins can also create content via the AI workspace
- Create and manage Standard Documentation that represents canonical engineering guidance
- Review and approve or reject Creator blog submissions with detailed feedback
- Manage content hierarchy, categories, tags, and user accounts
- View AI usage analytics including token consumption, cost estimates, and per-creator usage
- Configure AI agent settings and content workflow parameters

## AI Brain — How It Works

When a Creator starts a new article, seven specialized AI agents collaborate to produce publication-ready content:

1. **Research Agent** — Searches the web and internal knowledge base to produce a structured research brief on the topic, gathering relevant sources and technical context.

2. **Writer Agent** — Takes the research brief and drafts a full structured article as `ContentBlock[]` JSON using Claude Sonnet via AWS Bedrock. The output includes headings, paragraphs, code blocks, callouts, and placeholders for diagrams.

3. **Diagram Agent** — Generates Mermaid architecture diagrams and flow charts from content descriptions. Complex diagrams can also be rendered in D2 format.

4. **Review Agent** — Scores the draft across five dimensions: accuracy, completeness, readability, SEO quality, and technical depth. Drafts that fall below the quality threshold are automatically sent back to the Writer Agent for revision, creating a self-improving loop.

5. **SEO Agent** — Generates meta titles, descriptions, Open Graph tags, JSON-LD structured data, keyword maps, and internal link suggestions to maximize discoverability.

6. **Audio Agent** — Converts the finished article to SSML with a 40+ term technical pronunciation dictionary, then generates natural-speech MP3 narration via Amazon Polly Neural TTS. Every published article is listenable.

7. **Illustration Agent** — Generates supporting graphics and illustrations for the article (planned for v2.0).

After the AI agents complete their work, a **human review gate** ensures that an Admin always has final approval before any content goes live. Admins receive email notifications for pending reviews and can approve, reject with feedback, or request revisions.

**The principle: AI produces, humans govern.**

## Content Types

- **Standard Documentation** — Engineering standards, architecture guidelines, coding best practices, and operational runbooks. Created by Admins with AI assistance. These represent the organization's canonical technical guidance.

- **Blog Posts** — Engineering insights, project learnings, technical deep-dives, and conference takeaways. Submitted by Creators (any Ascendion engineer), reviewed and approved by Admins before publication.

- **All content is multi-modal:** Every published article includes structured text, embedded Mermaid diagrams, syntax-highlighted code blocks, AI-generated audio narration, and (in v2.0) generated illustrations.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 App Router with ISR, TypeScript, Tailwind CSS, Radix UI |
| **Backend** | AWS Lambda, API Gateway, Aurora Serverless v2 PostgreSQL, Drizzle ORM |
| **AI** | AWS Bedrock Claude Sonnet, Amazon Polly Neural TTS, Step Functions orchestration |
| **Auth** | AWS Cognito, Azure AD SSO for Ascendion employees |
| **Infrastructure** | AWS CDK TypeScript, CloudFront, S3, SQS, EventBridge |
| **Mobile** | React Native Expo, shared API client with web |
| **Monorepo** | pnpm workspaces and Turborepo |

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
          Media and Audio                          |
                                         Amazon Polly Audio
```

## Branching and Deployment Flow

```
epic/* branches → develop → staging → main
```

- **epic/\*** — Feature work happens on epic branches, built by Claude Code and Ralph Loop
- **develop** — Integration branch where all features merge. CI runs typecheck and tests on every push
- **staging** — Pre-production environment. Auto-deploys to AWS staging. Playwright E2E tests run against this environment
- **main** — Production only. Deploys to chiselgrid.com and ascendion.engineering

## Local Development Setup

1. **Prerequisites:** Node.js 20 LTS, pnpm 9+, AWS CLI v2, Docker Desktop (with WSL2 on Windows)
2. **Clone:** `git clone git@github.com:jeril-ascendion/chisel-grid.git`
3. **Install:** `pnpm install`
4. **Environment:** `cp .env.example .env.local` and fill in the required values
5. **Database migrations:** `pnpm db:migrate`
6. **Start development:** `pnpm dev`
7. **Open:** [http://localhost:3000](http://localhost:3000) for web and [http://localhost:3001](http://localhost:3001) for API

## Key Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development |
| `pnpm typecheck` | TypeScript check all 9 packages |
| `pnpm test` | Run all unit and integration tests |
| `pnpm build` | Production build |
| `pnpm db:generate` | Generate Drizzle migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm cdk:diff` | Preview AWS infrastructure changes |
| `pnpm cdk:deploy` | Deploy to AWS dev environment |

## Product Roadmap

| Version | Milestone |
|---|---|
| **v1.0** (current) | Ascendion Engineering Portal — Admin CMS, AI content pipeline, Reader frontend, Audio generation, Content migration from static site |
| **v1.1** | White-label packaging — multi-tenancy, custom domains, Stripe billing, self-service onboarding, cloud-agnostic content export |
| **v2.0** | Full AI Brain — all 7 agents fully operational, image generation, RAG knowledge base, analytics dashboard |
| **v2.5** | Commercial SaaS — Starter, Professional, and Enterprise tiers, dedicated CSM, SLA guarantees |

## The Five Core Principles

1. **AI produces, humans govern** — Every piece of content flows through AI agents for generation and a human for approval.
2. **Multi-modal from day one** — Text, audio, diagrams, and graphics are generated as part of every published article.
3. **White-label is a first-class citizen** — Tenancy is in the data model, not retrofitted.
4. **Async by default** — AI workflows never block the user. Every job is queued, tracked, and streamed via WebSocket.
5. **AWS-native, not AWS-locked** — The AI layer can be swapped, the frontend can move to Vercel, the database can migrate to Neon.

## Contributing

**Internal Ascendion contributors:** Log in at [chiselgrid.com](https://chiselgrid.com) with your Ascendion Azure AD credentials and submit content via the Creator workspace. No git access is required for content contributions.

**Engineering contributions:** Create a feature branch from `develop`, follow the branching strategy above, and open a PR to `develop`.
