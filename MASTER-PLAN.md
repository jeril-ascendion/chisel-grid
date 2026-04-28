# ChiselGrid Master Plan
# Version: 1.0 — April 26, 2026
# Author: Jeril Panicker, Ascendion Digital Services Philippines
# Status: Living document — update before every sprint
#
# RULE: Every Claude Code session reads this file first.
# RULE: No new features until current sprint stabilisation is complete.
# RULE: When this file changes, update TECHDEBT.md with action items.

---

## Vision

ChiselGrid is an Enterprise AI Knowledge and Content Platform for
Engineering Organizations.

It sits at the intersection of:
  - AI-driven knowledge management: capturing, retrieving, reasoning
    over, and improving enterprise knowledge
  - Enterprise content management: authoring, versioning, publishing,
    governance, and lifecycle management
  - AI orchestration / agentic workflow: multi-agent research,
    estimation, review, approval, and simulation

In simple terms: ChiselGrid is the system where engineering
organizations create, govern, reuse, and improve knowledge assets
across pre-sales, delivery, and publishing.

The long-term goal is for ChiselGrid to mature into an
organizational engineering brain — a system that can
remember, reason, specialize, and improve.

---

## Strategic Positioning

"To become the system where engineering organizations create, govern,
reuse, and improve knowledge assets across pre-sales, delivery, and
publishing — building an organizational brain using engineering
content: designs, diagrams, estimations, whitepapers, case studies,
and internal reusable patterns."

### Market Category
  AI Engineering Knowledge Platform
  OR: Enterprise Engineering Intelligence Platform
  OR: AI-Driven Engineering Content and Knowledge Management Platform

### Total Addressable Market (2026 estimates)
  Enterprise Content Management:        ~$33.1B
  AI-driven Knowledge Management:       ~$11.24B
  AI Orchestration / Workflow:          ~$13.56-13.99B
  ChiselGrid's realistic segment:       Overlap of all three —
  enterprises that need governed engineering knowledge creation,
  reusable design intelligence, and AI-assisted delivery.

### Differentiators
  1. Engineering-domain focus (not general-purpose productivity)
  2. Organizational brain design (memory, reasoning, specialization, learning)
  3. Knowledge graph-first architecture for factual grounding and reuse
  4. Agent Foundry for reusable and custom agents bound to enterprise knowledge
  5. Estimator for project delivery and staffing estimation (services moat)
  6. Dual portal model: external thought leadership + internal tenant IP

### Business Model
  - Subscription model for tenants
  - White-label software option
  - First tenant: Ascendion (ascendion.engineering)

---

## Platform Architecture Vision

### Cognitive Stack (long-term target)
  Shared memory for facts, decisions, projects, people, and patterns
  Reasoning layer for inference, planning, decomposition, tradeoff analysis
  Skill modules for coding, writing, finance, legal review, support, ops
  Knowledge-consolidation pipeline: repeated experience → reusable playbooks
  Offline simulation engine: stress-tests decisions, generates alternatives
  Self-model: knows capabilities, confidence, constraints, open gaps

### Data Architecture Layers
  Data layer:       documents, emails, chats, tickets, code, meetings,
                    CRM, ERP, knowledge graphs
  Memory layer:     episodic, semantic, procedural, relationship memory
  Agent layer:      research, planning, execution, critique, domain specialists
  Reasoning layer:  policy engine, planner, verifier, uncertainty manager
  Learning layer:   feedback ingestion, evaluation, distillation, playbook generation
  Governance layer: access control, auditability, retention, safety

### LLM Wiki model
  Humans and agents search and retrieve information from the same
  structured knowledge store. AWS Aurora + pgvector + Knowledge Graph
  is the current implementation foundation.

---

## Portals

### Landing Portal (Outside Portal)
  Public-facing. No login required.
  Content: engineering news, articles, whitepapers, case studies,
  animated designs, audio podcasts, tenant-approved thought leadership.
  Content created by CREATOR/ADMIN + AI agents, approved by ADMIN
  before publishing. Uses content templates for layout.

### Tenant Portal (Inside Portal)
  Authenticated. Tenant domain email/credentials required.
  Not visible to outside world — tenant-proprietary content and IP.
  Content: tenant-specific news, projects, case studies, whitepapers.
  Same approval flow as Landing Portal but restricted to tenant users.
  Minimum role: READER.

### ChiselGrid Studio
  Authenticated workspace for engineering design work.
  Features: Chamber, Grid, Forge, Knowledge Graph, Estimator, Agent Foundry.
  Input is multimodal: text, audio, documents.
  Available on web, mobile, and desktop.

---

## User Roles

### OUTSIDE
  Anyone who visits the Landing Portal without logging in.
  Access: Landing Portal content only.

### READER (most tenant users)
  Authenticated tenant user with read access.
  Access:
    + All Landing Portal content
    + All Tenant Portal content
    + All Studio features: Chamber, Grid, Forge, Knowledge Graph
    + Download outputs from Studio
    + View Knowledge Graph searches and linked content
  No access: Users, Tenant Settings, Content Queue admin functions
  Cannot: add/update/delete content taxonomy
  Note: Content created by READER is NOT published to portal or model

### CREATOR
  Everything READER can do, plus:
  + Create and submit content for Admin review
  + View own content's review and approval status
  Submitted content waits for ADMIN approval before publishing.

### ADMIN
  Everything CREATOR can do, plus:
  + Add/update/delete users
  + Add/update/delete content taxonomy
  + Review, comment on, approve, and publish content
  + Manage ChiselGrid releases and upgrades for the tenant
  + Full super-admin privileges

---

## Features

### Chamber [existing — partially done]
  Research, Analysis (trade-off, feasibility, gap analysis),
  Brainstorming, Human + AI agentic collaborative work.
  Chamber sessions inform and feed into Grid and Forge.
  Inputs: text, voice, documents.

### Grid [existing — partially done]
  Visual design and representation workspace.
  Creates: component architecture diagrams, system architecture,
  process flows, swim lanes, sequence diagrams, C4 models,
  data visualisations, animations, tables from raw data.
  Three modes: Architecture (interactive), Sketch (hand-drawn),
  Precise (enterprise export).
  Outputs feed into Forge documents and Knowledge Graph.

### Forge [existing — partially done, was: Studio]
  Convergence point where Solution Designs are assembled.
  Combines: Chamber research + Grid visuals + Knowledge Graph.
  Produces: Solutions Design Documents, RFP Responses,
  Architecture Reviews, technical proposals, client deliverables.
  Versioned and exportable to Word, PDF, Markdown.

### Knowledge Graph [existing — partially done]
  Verified, truthful organisational knowledge plotted as a graph.
  Nodes: Articles, Diagrams, Decisions, Sessions.
  Edges: references, illustrates, created_from, documents.
  Node size reflects importance (times_referenced).
  Used for: identifying patterns, internal search, feeding AI agents.

### Estimator [planned — not yet built]
  Agentic work and cost estimation based on completed solution designs.
  Inputs:
    - Solution design from Forge
    - HR data feed (talent, rates, bench capacity)
    - Engagement model configuration
  Engagement Models: Staff Augmentation, Managed Capacity,
  Managed Services, etc.
  Agentic roles: each agent estimates a different aspect
  (discovery, development, testing, hyper-care, post-production).
  Supports multiple versions for scenario comparison.
  Outputs: effort estimates, cost projections, timeline breakdowns,
  resource plans.

### Agent Foundry [planned — not yet built]
  Module where users discover, configure, build, test, govern,
  and publish AI agents that operate over the organisation's
  knowledge graph, tools, and workflows.
  Includes:
    - Prebuilt agent catalog
    - Template-based custom agent builder
    - Prompt, tool, and policy configuration
    - Knowledge source binding
    - Memory and context selection
    - Workflow orchestration and subagent composition
    - Evaluation, testing, and simulation
    - Approval, publishing, and versioning
    - Usage analytics and feedback capture

---

## Content Publish Engine

### Pathways
  PATH 1 — Human-created:
    CREATOR does research (Chamber) → visualizes (Grid) →
    formulates content (Forge) → submits for approval →
    ADMIN reviews/approves → published to Landing or Tenant Portal

  PATH 2 — AI-assisted:
    AI agents search web, engineering portals, research organizations,
    government websites → collate articles → ADMIN reviews/verifies
    for correctness/compliance/organizational standards → ADMIN approves
    → published to Landing or Tenant Portal

  PATH 3 — READER contribution:
    READER works on solution designs → provides feedback and review
    on project highlights and learnings →
    Content NOT published to portal (READER content is internal only)

### Content Lifecycle
  Draft → Submitted → In Review → Approved → Published → Archived
  Transitions enforced by role:
    CREATOR: Draft → Submitted
    ADMIN: Submitted → In Review → Approved → Published → Archived
    ADMIN: In Review → Rejected → (CREATOR revises) → Draft → Submitted

### Content Templates
  Pre-built templates define layout for articles and documents.
  Templates used by both Landing Portal and Tenant Portal.
  Stored in studio_templates table.

---

## Organisational Hierarchy (auto-detected, not user-entered)

  Tenant → Client → Project → Workspace → Session

  Tenant:    ChiselGrid customer (e.g. Ascendion)
  Client:    Organisation a tenant user works for (e.g. Union Digital Bank)
  Project:   Specific engagement (e.g. UDB Core Banking Migration 2026)
  Workspace: User-created container for a scope of work
  Session:   Individual working thread within a workspace

  Client and Project are detected automatically from content
  by background AI agents. Users never enter them manually.

---

## Design System

  Reference: apps/web/DESIGN-SYSTEM.md
  Inspired by IBM Carbon design principles:
    - Clear visual hierarchy
    - Purposeful use of space
    - Consistent component patterns
    - Accessible by default (WCAG 2.1 AA)
    - Dark and light modes
    - IBM Plex Sans (UI) + IBM Plex Mono (code)
    - Accent: #C96330 (Ascendion terracotta)
    - Base dark: #0F0F0F

  RULE: All UI work reads DESIGN-SYSTEM.md before writing any component.
  RULE: No hardcoded hex values — use CSS custom properties only.

---

## Multi-modal and Omni-channel

  Input: text, voice, documents
  Platforms: web, mobile, desktop
  Integrations (planned): Tenant email, SharePoint, Teams, Slack

---

## Current State (April 26, 2026)

### Live on chiselgrid.com (commit 84d2488)
  Chamber, Grid, Forge (basic), Knowledge Graph (basic)
  Session persistence (Aurora work_sessions)
  Share links (/share/[sessionId])
  Typed content views (Table/Board/Timeline)
  Bidirectional links + backlink count
  10 built-in Forge templates
  Skill files (7 domain skills as TS constants)
  Reasoning trail in Grid and Chamber
  Design System tokens in globals.css
  Multi-tab auth sync (BroadcastChannel)
  LANGUAGE.md and TECHDEBT.md in repo

### Known Issues (see TECHDEBT.md for full list)
  BUG-01: Forge 500 on document creation (studio_documents table missing)
  BUG-02: Knowledge Graph Open button routing (partially fixed)
  P12: Content publish flow not enforced end-to-end
  P13: Studio → Forge rename not fully verified
  RBAC: Role-based UI not yet implemented

---

## Sprint Plan

### NOW: Stabilisation Sprint (April-May 2026)
  RULE: No new features until all items below are checked.

  [ ]  BUG-01  Fix Forge 500 on document creation
  [ ]  BUG-02  Verify Knowledge Graph Open routes correctly
  [✅] P13-01  Verify Studio → Forge rename complete in all UI
  [✅] P12-02  Implement RBAC role-based action visibility
  [✅] P12-03  Content publish flow end-to-end verified
  [✅] P12-04  Content versioning (v0.0.0 format)
  [✅] P12-05  Submit-for-review UI + admin review workflow
  [✅] P14-01  Workspace data model
  [✅] P14-02  Session belongs to Workspace
  [✅] P14-03  Workspace CRUD API
  [✅] P14-04  Workspace switcher in sidebar
  [ ]  CLEAN   Zero TypeScript errors across monorepo
  [ ]  CLEAN   All pages load without console errors
  [ ]  CLEAN   /admin returns 307 consistently
  [ ]  CLEAN   MASTER-PLAN.md in repo and up to date

### MAY 2026: Foundation Sprint
  [ ] P14     Workspace hierarchy (Workspace → Session structure)
  [ ] P14     Auto-detect Client and Project from content
  [ ] P21     Session optimisation (TOON compression + Redis caching)
  [ ] P12-04  Content versioning

### JUNE 2026: Intelligence Sprint
  [ ] P15     Estimator feature (agentic estimation pipeline)
  [ ] P16     Knowledge Graph as organisational brain
              (verified knowledge pipeline, RAG integration)
  [ ] P15     HR data feed integration for Estimator

### JULY 2026: Collaboration Sprint
  [ ] P17     Multi-user collaboration (shared Workspaces)
  [ ] P17     Real-time co-editing (WebSocket delta patches)
  [ ] P18     Agent Foundry — prebuilt agent catalog
  [ ] P18     Agent Foundry — custom agent builder

### AUGUST 2026: Integration Sprint
  [ ] P19     Microsoft Teams integration
  [ ] P19     SharePoint integration
  [ ] P19     Email notifications (readers, creators, admins)
  [ ] P19     Slack integration

### SEPTEMBER 2026: Platform Sprint
  [ ] P20     Tenant deployment and release management
  [ ] P20     GitHub Actions automated documentation
  [ ] P22     Cost and space quota management
  [ ] P23     UX polish (hover descriptions, progressive disclosure)
  [ ] P19     Feedback loop from tenant users to ChiselGrid

---

## How to Work on ChiselGrid

### Every session starts with:
  cd ~/projects/chisel-grid && claude --dangerously-skip-permissions
  /plan
  Read: MASTER-PLAN.md, CLAUDE.md, LANGUAGE.md, DESIGN-SYSTEM.md

### Every deploy ends with:
  /qa — verify live site
  curl /admin must return 307

### Weekly:
  /retro — what shipped, what broke, what to improve
  /design-review — visual audit of chiselgrid.com

### Never:
  Two agents in same working tree simultaneously
  Commit without running typecheck
  Deploy without verifying /admin returns 307
  Run git reset --hard in an agent session
  Build new features while TECHDEBT.md has open critical bugs
  Write hardcoded hex values in UI components

---

## Key Files in Repo

  MASTER-PLAN.md      This file — overall vision and sprint plan
  CLAUDE.md           Critical rules, anti-patterns, permanent decisions
  LANGUAGE.md         Ubiquitous language for humans and AI agents
  TECHDEBT.md         All known bugs and action items with status
  DESIGN-SYSTEM.md    UI tokens, component patterns, accessibility
  PLATFORM-EPICS.md   All EPICs P01-P23 with tasks and acceptance criteria
  ROADMAP.md          M1-M7 milestone plan
  GRID.md             Grid architecture, Grid-IR schema, agent roster
  INFRASTRUCTURE.md   AWS resources and safe deployment patterns
  BLOCKED.md          Known blockers and deferred work

