# CHISELGRID — BIG BANG RALPH LOOP PROMPT
# Complete build from EPIC-02 through EPIC-15
# Place this file at: ~/projects/chisel-grid/RALPH-BIGBANG.md
# Place MASTER-TODO.md at: ~/projects/chisel-grid/MASTER-TODO.md

---

## ═══════════════════════════════════════════════════
## OPTION A: SINGLE SESSION — SEQUENTIAL (Simplest)
## ═══════════════════════════════════════════════════
## Runs all EPICs in order, one Ralph session.
## Use this if you want to walk away and let it run overnight.
## Start from inside ~/projects/chisel-grid with:
##   claude --dangerously-skip-permissions
## Then paste the /ralph-loop command below.

/ralph-loop "You are building ChiselGrid, an AI-native CMS platform for ascendion.engineering. Your complete build instructions and task state are in MASTER-TODO.md at the project root. Read CLAUDE.md first for architecture context.

OPERATING RULES:
1. Read MASTER-TODO.md at the start of every iteration
2. Find the FIRST task marked [ ] that is not blocked by an incomplete GATE above it
3. Complete that task fully — write all code, run all commands, validate output
4. Mark it [x] with a one-line completion note inline
5. Update project-status.md: move item to Completed, set next item as In Progress
6. Run validation commands specified in the EPIC GATE before marking the GATE complete
7. HARD STOP items: use AskFollowupQuestion tool — do not proceed without human confirmation
8. If genuinely blocked by external dependency (AWS credential, missing env var, human decision): mark [!] with exact reason, skip to next task, document in BLOCKED.md
9. Never re-do a task marked [x] — always find the next [ ] item
10. Token budget awareness: if context is getting long, use /compact before continuing

TECHNICAL CONSTRAINTS (always follow):
- All AWS infra in infra/lib/stacks/ — never use AWS Console
- All DB access via Drizzle ORM in packages/db/src/repositories/ — no raw SQL
- All secrets in AWS Secrets Manager — never in .env files for deployed environments
- TypeScript strict mode — zero any types, zero ts-ignore
- Every Lambda handler validates input with Zod before processing
- All content queries scoped by tenantId
- pnpm is the package manager — never use npm or yarn

HARD STOP GATES (require human confirmation before proceeding):
- Before EPIC-02: Confirm AWS Cognito will be deployed to correct account
- Before EPIC-04 T-04.4: Confirm Step Functions Express Workflow pricing is acceptable
- Before EPIC-09: Confirm existing ascendion.engineering content migration is approved
- Before EPIC-12: Confirm Apple Developer and Google Play Console accounts are ready
- Before EPIC-13: Confirm multi-tenancy architecture has been reviewed
- Before EPIC-14: Confirm Stripe account and pricing tiers are approved

OUTPUT: <promise>CHISELGRID_COMPLETE</promise> when every task in MASTER-TODO.md is [x] or [~]" \
--max-iterations 300 \
--completion-promise "CHISELGRID_COMPLETE"


---

## ═══════════════════════════════════════════════════
## OPTION B: PARALLEL STREAMS — MAXIMUM SPEED
## ═══════════════════════════════════════════════════
## Runs Phase 2 streams in parallel using tmux.
## Phase 1 must be complete before starting.
## Saves 40-60% of total wall-clock time.

## STEP 1: Install tmux (if not already installed)
## Run in WSL2 terminal:
##   sudo apt-get install -y tmux

## STEP 2: Create stream-specific TODO files from MASTER-TODO.md
## Run this script after Phase 1 (EPIC-01, 02, 03) is complete:

## --- COPY THIS SCRIPT TO: scripts/split-streams.sh ---
#!/bin/bash
set -e

ROOT=~/projects/chisel-grid

# Stream A: AI Brain + Admin UI + Admin Dashboard
cat > $ROOT/TODO-STREAM-A.md << 'STREAM_A'
# STREAM A TODO — AI Brain, Admin Workspace, Admin Dashboard
# This stream: EPIC-04 → EPIC-05 → EPIC-07
# Prerequisite: EPIC-01, EPIC-02, EPIC-03 must be complete in MASTER-TODO.md

## EPIC-04: AI Brain — Core Agents
- [ ] T-04.1 Bedrock client and prompt library — typed wrapper, streaming support, token usage tracking, retry with backoff
- [ ] T-04.2 Writer Agent — ContentBlock[] JSON output, structured sections, code blocks, Zod schema validation
- [ ] T-04.3 Review Agent — 5-dimension scoring, ReviewReport schema, auto-revision threshold at score < 60
- [ ] T-04.4 Step Functions content pipeline — Writer → Review → revision loop → Human Gate → Publish DAG
- [ ] T-04.5 Diagram Agent — Mermaid code generation from architecture/process descriptions
- [ ] T-04.6 SEO Agent — meta title/description, OG tags, JSON-LD, keyword map
- [ ] T-04.7 Human review gate — SES email to admins, approve/reject endpoints, Step Functions callback resume
## GATE-04: Writer produces valid draft, Review scores it, pipeline runs end-to-end

## EPIC-05: Content Creation Workspace
- [ ] T-05.1 AI chat interface — split-pane workspace, chat input with file upload, agent timeline component
- [ ] T-05.2 WebSocket agent streaming — API Gateway WebSocket, Lambda pushes Step Functions events to clients
- [ ] T-05.3 Content block preview editor — all ContentBlock types render, inline editing, Zustand state
- [ ] T-05.4 Code block renderer — Shiki syntax highlighting, copy button, filename display
- [ ] T-05.5 Diagram block renderer — Mermaid.js client-side, responsive, zoom on click
- [ ] T-05.6 SEO panel — meta preview, read time, word count
- [ ] T-05.7 Submit flow — category/tag/slug form, validation, draft save, submit to review queue
- [ ] T-05.8 File upload — presigned URL, multipart to S3, progress bar, Textract trigger for PDFs
## GATE-05: Admin types topic → watches agents → sees preview → edits → submits

## EPIC-07: Admin Dashboard
- [ ] T-07.1 Dashboard shell — admin layout, sidebar nav, breadcrumbs, responsive 1280px+
- [ ] T-07.2 Content review queue — in_review table, AI scores, approve/reject with mandatory feedback
- [ ] T-07.3 Content status board — all statuses with counts, filter by category/author/date
- [ ] T-07.4 Content edit page — full block editor, version history, publish controls, deprecation workflow
- [ ] T-07.5 User management — role change, deactivate/reactivate, audit log
- [ ] T-07.6 Category management — create/edit/delete, drag-to-reorder, slug management
- [ ] T-07.7 AI usage panel — tokens/agent, cost estimate, per-creator usage, daily trend
## GATE-07: Admin manages full content lifecycle, users, sees AI cost metrics

OUTPUT: <promise>STREAM_A_COMPLETE</promise> when all items above are [x]
STREAM_A

# Stream B: Reader Frontend + SEO
cat > $ROOT/TODO-STREAM-B.md << 'STREAM_B'
# STREAM B TODO — Reader Frontend, SEO & Performance
# This stream: EPIC-06 → EPIC-11
# Prerequisite: EPIC-01, EPIC-02, EPIC-03 must be complete in MASTER-TODO.md

## EPIC-06: Reader-Facing Frontend
- [ ] T-06.1 ChiselGrid design system — CSS custom properties, Tailwind tokens, typography, dark/light mode
- [ ] T-06.2 Navigation — top nav with categories, mobile hamburger, search, dark mode toggle
- [ ] T-06.3 Article page — ISR revalidate:60, hero, author meta, sticky ToC, audio player, related articles
- [ ] T-06.4 Content block renderer reader — all types, responsive images, accessible code blocks
- [ ] T-06.5 Homepage — hero article, category grid, 6 recent articles, newsletter signup
- [ ] T-06.6 Category listing — paginated cards 12/page, tag filter, breadcrumb
- [ ] T-06.7 Search page — PostgreSQL tsvector full-text, debounced input, result highlighting
- [ ] T-06.8 Article card — hero image, title, excerpt, author avatar, date, read time, tags
- [ ] T-06.9 RSS feed — /feed.xml, valid RSS 2.0, all published articles, CloudFront cache headers
- [ ] T-06.10 Open Graph and JSON-LD — per-article OG, Article schema, BreadcrumbList, canonical URLs
## GATE-06: Reader browses homepage, navigates categories, reads articles, searches content

## EPIC-11: SEO & Performance Optimization
- [ ] T-11.1 Lighthouse baseline — run against staging, document scores, set targets Perf>90 Access>90 SEO>95
- [ ] T-11.2 Core Web Vitals — LCP < 2.5s, CLS < 0.1, next/image optimization, font preloading
- [ ] T-11.3 Sitemap — /sitemap.xml auto-generated from published content, Google Search Console submission
- [ ] T-11.4 Structured data — JSON-LD Article, BreadcrumbList, Organization, WebSite all pages
- [ ] T-11.5 CloudFront cache — long TTL static assets, stale-while-revalidate, Brotli compression
- [ ] T-11.6 Bundle analysis — next-bundle-analyzer, eliminate large deps, code splitting audit
## GATE-11: Lighthouse scores meet targets, sitemap submitted, structured data validates

OUTPUT: <promise>STREAM_B_COMPLETE</promise> when all items above are [x]
STREAM_B

# Stream C: Audio + Migration
cat > $ROOT/TODO-STREAM-C.md << 'STREAM_C'
# STREAM C TODO — Audio Pipeline, Content Migration
# This stream: EPIC-08 → EPIC-09
# Prerequisite: EPIC-01, EPIC-02, EPIC-03 must be complete in MASTER-TODO.md

## EPIC-08: Audio Generation Pipeline
- [ ] T-08.1 ContentToSSML converter — text blocks to SSML, heading emphasis, code skipped, tech term pronunciation
- [ ] T-08.2 Polly Neural TTS Lambda — async job, Neural voice Matthew, MP3 to S3, audioUrl to content record
- [ ] T-08.3 SQS audio queue — EventBridge content.published → SQS → Lambda, DLQ, retry policy
- [ ] T-08.4 Audio player component — custom UI play/pause/seek/speed, sticky bottom bar, accessible
- [ ] T-08.5 Batch audio generation — script triggers audio for all existing published articles
## GATE-08: Every published article has MP3 in S3, audio player works on article page

## EPIC-09: Content Migration
- [ ] T-09.1 Static site crawler — reads HTML/MD/MMD from knowledge-library repo, extracts structure
- [ ] T-09.2 Content converter — Bedrock converts HTML/MD to ContentBlock[] JSON, batched, rate-limited
- [ ] T-09.3 Mermaid importer — .mmd files as DiagramBlock with captions
- [ ] T-09.4 URL slug mapper — maps file paths to slugs, preserves existing URLs
- [ ] T-09.5 Bulk DB importer — Drizzle bulk insert ON CONFLICT DO NOTHING, category assignment
- [ ] T-09.6 CloudFront redirects — 301s for changed URLs, updated sitemap submitted
- [ ] T-09.7 Migration validation — crawl all migrated URLs, verify HTTP 200, content renders
## GATE-09: All existing content on new platform, zero 404s, audio generated for all

OUTPUT: <promise>STREAM_C_COMPLETE</promise> when all items above are [x]
STREAM_C

echo "Stream TODO files created:"
echo "  $ROOT/TODO-STREAM-A.md"
echo "  $ROOT/TODO-STREAM-B.md"
echo "  $ROOT/TODO-STREAM-C.md"
## --- END SCRIPT ---


## STEP 3: Launch parallel tmux sessions
## Run this after split-streams.sh completes:

## --- COPY THIS SCRIPT TO: scripts/launch-parallel.sh ---
#!/bin/bash
set -e

ROOT=~/projects/chisel-grid
cd $ROOT

# Create tmux session with 3 windows for parallel streams
tmux new-session -d -s chiselgrid -n "stream-a" \
  "cd $ROOT && claude --dangerously-skip-permissions"

tmux new-window -t chiselgrid -n "stream-b" \
  "cd $ROOT && claude --dangerously-skip-permissions"

tmux new-window -t chiselgrid -n "stream-c" \
  "cd $ROOT && claude --dangerously-skip-permissions"

echo ""
echo "3 Claude Code sessions launched in tmux."
echo ""
echo "Attach with: tmux attach -t chiselgrid"
echo "Switch windows: Ctrl+B then 0, 1, or 2"
echo "Detach (leave running): Ctrl+B then D"
echo ""
echo "In each window, paste the corresponding /ralph-loop command:"
echo "  Window 0 (stream-a): STREAM A prompt — AI Brain + Admin"
echo "  Window 1 (stream-b): STREAM B prompt — Reader Frontend + SEO"
echo "  Window 2 (stream-c): STREAM C prompt — Audio + Migration"
## --- END SCRIPT ---


## STREAM A RALPH COMMAND (paste into tmux window 0):
/ralph-loop "You are building ChiselGrid Stream A: AI Brain, Admin Workspace, and Admin Dashboard. Read CLAUDE.md for architecture context. Your task list is in TODO-STREAM-A.md. Find the first unchecked [ ] task. Complete it fully with working code and passing validation. Check it off [x]. Update project-status.md. Never redo completed [x] tasks. If blocked by external dependency, mark [!] and skip to next. Output <promise>STREAM_A_COMPLETE</promise> when all tasks are [x]. Technical rules: TypeScript strict, Drizzle ORM only, AWS Bedrock via packages/ai client, all secrets via Secrets Manager, pnpm package manager." --max-iterations 120 --completion-promise "STREAM_A_COMPLETE"


## STREAM B RALPH COMMAND (paste into tmux window 1):
/ralph-loop "You are building ChiselGrid Stream B: Reader-Facing Frontend and SEO Optimization. Read CLAUDE.md for architecture context. Your task list is in TODO-STREAM-B.md. Find the first unchecked [ ] task. Complete it fully with working code. Check it off [x]. Update project-status.md. Design direction: editorial clean aesthetic inspired by Ghost/Hashnode, typography-first, CSS custom properties for theming, dark/light mode, Tailwind CSS utility classes. Use Next.js App Router ISR for all reader pages. Output <promise>STREAM_B_COMPLETE</promise> when all tasks are [x]." --max-iterations 80 --completion-promise "STREAM_B_COMPLETE"


## STREAM C RALPH COMMAND (paste into tmux window 2):
/ralph-loop "You are building ChiselGrid Stream C: Audio Generation Pipeline and Content Migration. Read CLAUDE.md for architecture context. Your task list is in TODO-STREAM-C.md. Find the first unchecked [ ] task. Complete it fully. Check it off [x]. Update project-status.md. For audio: use Amazon Polly Neural voice Matthew, async job pattern via SQS. For migration: existing content is in ~/projects/knowledge-library — crawl that directory for HTML/MD/MMD files. Output <promise>STREAM_C_COMPLETE</promise> when all tasks are [x]." --max-iterations 60 --completion-promise "STREAM_C_COMPLETE"


---

## ═══════════════════════════════════════════════════
## OPTION C: PHASE-GATED (Recommended for Production)
## ═══════════════════════════════════════════════════
## Runs each phase with a human checkpoint between phases.
## Most controlled approach. Catches issues before they compound.

## PHASE 1 (run first, wait for completion):
/ralph-loop:ralph-loop "Complete Phase 1 of ChiselGrid: EPIC-02 Authentication and EPIC-03 Content Model. Read CLAUDE.md and MASTER-TODO.md. Work through every task in EPIC-02 and EPIC-03 in order. Mark each [x] as complete. Update project-status.md. Validate each EPIC GATE before moving to next EPIC. Output <promise>PHASE1_COMPLETE</promise> when both EPIC-02 and EPIC-03 gates are verified." --max-iterations 60 --completion-promise "PHASE1_COMPLETE"

## PHASE 2A (start after PHASE 1 verified by human):
/ralph-loop:ralph-loop "Complete Phase 2A of ChiselGrid: EPIC-04 AI Brain, EPIC-05 Content Workspace, EPIC-07 Admin Dashboard. Read CLAUDE.md and MASTER-TODO.md. Work through tasks in order: all of EPIC-04 first, then EPIC-05, then EPIC-07. Mark each [x]. Update project-status.md. Output <promise>PHASE2A_COMPLETE</promise> when all three EPIC gates are verified." --max-iterations 120 --completion-promise "PHASE2A_COMPLETE"

## PHASE 2B (run parallel to 2A if using tmux):
/ralph-loop "Complete Phase 2B of ChiselGrid: EPIC-06 Reader Frontend, EPIC-08 Audio Pipeline, EPIC-09 Content Migration, EPIC-11 SEO. Read CLAUDE.md and MASTER-TODO.md. Work through all tasks in these four EPICs. Mark each [x]. Output <promise>PHASE2B_COMPLETE</promise> when all four EPIC gates are verified." --max-iterations 100 --completion-promise "PHASE2B_COMPLETE"

## PHASE 3 (after human verifies Phase 2):
/ralph-loop:ralph-loop "Complete Phase 3 of ChiselGrid: EPIC-10 Testing Infrastructure, EPIC-12 Mobile App. Read CLAUDE.md and MASTER-TODO.md. EPIC-10 first (tests all existing code), then EPIC-12 (Expo mobile app). Output <promise>PHASE3_COMPLETE</promise> when both EPIC gates pass." --max-iterations 100 --completion-promise "PHASE3_COMPLETE"

## PHASE 4 — v1.1 White Label (separate engagement):
/ralph-loop "Complete Phase 4 of ChiselGrid v1.1: EPIC-13 Multi-Tenancy, EPIC-14 Billing, EPIC-15 Analytics. Read CLAUDE.md and MASTER-TODO.md. Sequential order only — EPIC-13 must complete before EPIC-14. Output <promise>PHASE4_COMPLETE</promise> when all three EPIC gates pass." --max-iterations 100 --completion-promise "PHASE4_COMPLETE"


---

## ═══════════════════════════════════════════════════
## SETUP COMMANDS — Run before any Ralph session
## ═══════════════════════════════════════════════════

## 1. Copy MASTER-TODO.md to project root
cp ~/path/to/MASTER-TODO.md ~/projects/chisel-grid/MASTER-TODO.md

## 2. Ensure .env.local exists with all required values
cat ~/projects/chisel-grid/.env.local | grep -v "^#" | grep "=" | cut -d= -f1
# Must show: DATABASE_URL, AWS_REGION, COGNITO_USER_POOL_ID, etc.

## 3. Verify AWS auth
aws sts get-caller-identity

## 4. Verify CDK bootstrap done
aws cloudformation describe-stacks --stack-name CDKToolkit --query "Stacks[0].StackStatus"
# Must show: "CREATE_COMPLETE" or "UPDATE_COMPLETE"

## 5. Start Claude with permissions bypassed
cd ~/projects/chisel-grid
claude --dangerously-skip-permissions


---

## ═══════════════════════════════════════════════════
## MONITORING — Watch progress while Ralph runs
## ═══════════════════════════════════════════════════

## In a separate terminal, watch MASTER-TODO.md progress:
watch -n 30 'grep -c "\[x\]" ~/projects/chisel-grid/MASTER-TODO.md && echo "tasks complete" && grep -c "\[ \]" ~/projects/chisel-grid/MASTER-TODO.md && echo "tasks remaining"'

## Watch project-status.md for current task:
watch -n 10 'cat ~/projects/chisel-grid/project-status.md | head -20'

## Watch AWS resources being created:
watch -n 60 'aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[?contains(StackName, '"'"'ChiselGrid'"'"')].StackName" --output table'

## Watch git commit history (Claude commits after each task):
watch -n 30 'git -C ~/projects/chisel-grid log --oneline -20'


---

## ═══════════════════════════════════════════════════
## TOKEN COST ESTIMATES
## ═══════════════════════════════════════════════════
## Based on Claude Sonnet 4 pricing, estimated ranges:
##
## EPIC-02 (Auth):          ~50K tokens    ~$0.15
## EPIC-03 (DB Schema):     ~80K tokens    ~$0.24
## EPIC-04 (AI Brain):      ~200K tokens   ~$0.60
## EPIC-05 (Admin UI):      ~250K tokens   ~$0.75
## EPIC-06 (Reader UI):     ~200K tokens   ~$0.60
## EPIC-07 (Admin Dash):    ~150K tokens   ~$0.45
## EPIC-08 (Audio):         ~60K tokens    ~$0.18
## EPIC-09 (Migration):     ~100K tokens   ~$0.30
## EPIC-10 (Testing):       ~120K tokens   ~$0.36
## EPIC-11 (SEO):           ~60K tokens    ~$0.18
## EPIC-12 (Mobile):        ~300K tokens   ~$0.90
## EPIC-13-15 (v1.1):       ~400K tokens   ~$1.20
##
## TOTAL ESTIMATE: ~1.97M tokens = ~$6-12 Claude Max
## (Claude Max has usage limits — may need multiple sessions)
##
## AWS INFRASTRUCTURE COSTS (monthly dev environment):
## Aurora Serverless v2 (0.5 ACU min): ~$50/mo
## CloudFront (10GB transfer):          ~$1/mo
## Bedrock during dev (test calls):     ~$10-20/mo
## S3 (50GB):                          ~$2/mo
## TOTAL AWS DEV: ~$65-75/month


---

## ═══════════════════════════════════════════════════
## RECOMMENDATION FOR YOUR SITUATION
## ═══════════════════════════════════════════════════
##
## Given that EPIC-01 is already running:
##
## 1. Let EPIC-01 finish completely
## 2. Use OPTION C (Phase-Gated) — most reliable
## 3. Run PHASE 1 overnight (EPIC-02 + EPIC-03)
## 4. Review output in the morning, verify DB schema and auth work
## 5. Run PHASE 2A and 2B in parallel tmux windows during a workday
## 6. PHASE 3 (Testing + Mobile) as a separate session
## 7. PHASE 4 (White Label) when you're ready for v1.1
##
## This gives you human checkpoints at natural architectural boundaries
## and prevents compounding errors across dependent EPICs.
