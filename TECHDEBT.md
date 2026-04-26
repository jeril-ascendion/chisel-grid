# ChiselGrid Tech Debt and Action Items
# Updated: April 26, 2026
# Format: [STATUS] ITEM — Description

---

## CRITICAL — Fix Now (Bugs in Production)

[🔴 OPEN] BUG-01 — Studio 500 error on document creation
  File: apps/web/src/app/api/admin/studio/documents/route.ts
  Issue: studio_documents table missing, POST returns 500
  Fix: Create studio_documents migration and run against Aurora

[🔴 OPEN] BUG-02 — Knowledge Graph Open button navigates to 404
  File: apps/web/src/app/admin/knowledge-graph/KnowledgeGraphClient.tsx
  Issue: Navigates to /admin/content/{id} instead of /admin/content/{id}/edit
  Fix: Correct navigation for all node types

[🔴 OPEN] BUG-03 — Architecture diagram minimap blocking viewport
  Files: grid/architecture/page.tsx, grid/precise/page.tsx, grid/sketch/page.tsx
  Issue: React Flow MiniMap component rendering over diagram
  Fix: Remove <MiniMap /> from all three Grid pages

[🔴 OPEN] BUG-04 — Multi-tab auth not working
  Issue: New tab does not pick up existing auth session automatically
  Fix: Content Studio button routes to /admin, NextAuth handles cookie

[🔴 OPEN] BUG-05 — Session lost on Grid navigation
  Issue: Navigating Grid → Grid/Architecture creates new session
  Fix: Persist last session ID in localStorage, restore on navigation

---

## EPIC-P12 — Content Lifecycle and Organisation Rewrite

[⬜ OPEN] P12-01 — Merge All Content into Content Queue
  Combine /admin/content and /admin/queue into single Content Queue
  Role-based views:
    ADMIN: can review, approve, publish, reject
    CREATOR: can view own content status only
    READER: read-only view of published content
  Remove separate All Content route

[⬜ OPEN] P12-02 — Role-based access control (RBAC)
  Define four roles: OUTSIDE, READER, CREATOR, ADMIN
  Enforce at route level, API level, and component level
  Hide Users/Tenant Settings/Content Queue admin from READER
  READER content not published to portal or model

[⬜ OPEN] P12-03 — Content Publish Engine rewrite
  Full content flow: Draft → Submitted → In Review → Approved → Published
  Pre-built templates for article publication
  Diagrams, animations, narrations each follow their own engine
  Published content visible on tenant portal immediately

[⬜ OPEN] P12-04 — Content versioning
  Article versioning: <article_name>-v0.0.0
  Increment version on each modification post-publish
  Version history viewable in editor

[⬜ OPEN] P12-05 — Content taxonomy management
  Admin-only CRUD for categories and tags
  READER can view but not modify taxonomy

---

## EPIC-P13 — Studio Rename to Forge + Navigation Restructure

[✅ DONE] P13-01 — Rename Studio to Forge
  Update all UI labels: "Studio" → "Forge"
  Update all routes: /admin/studio/* → /admin/forge/*
  Update sidebar navigation
  Update all code references, API routes, database columns
  Update ROADMAP.md, GRID.md, PLATFORM-EPICS.md, CLAUDE.md
  Update LANGUAGE.md references

[⬜ OPEN] P13-02 — Update top-level navigation
  Content Studio sidebar should show:
    Dashboard
    Content Queue (merged)
    — STUDIO FEATURES —
    Chamber
    Grid
    Forge (was: Studio)
    Knowledge Graph
    — ADMIN ONLY —
    Users
    Categories
    Tenant Settings

[⬜ OPEN] P13-03 — Workspace and Project structure
  Users create a Workspace before starting sessions
  Workspace belongs to a Client/Project (auto-detected, not manual)
  All Chamber/Grid/Forge sessions belong to a Workspace
  Workspace switcher in sidebar

---

## EPIC-P14 — Workspace and Project Hierarchy

[⬜ OPEN] P14-01 — Workspace data model
  CREATE TABLE workspaces: id, tenant_id, name, description,
  client_name (auto), project_name (auto), created_by, created_at
  Workspace creation modal before first session

[⬜ OPEN] P14-02 — Session belongs to Workspace
  work_sessions.workspace_id FK to workspaces
  Session picker shows sessions within current workspace

[⬜ OPEN] P14-03 — Auto-detect Client and Project from content
  Background Bedrock agent extracts client/project names from
  session content and populates workspace metadata
  User never manually enters client or project

---

## EPIC-P15 — Estimator Feature

[⬜ OPEN] P15-01 — Estimator data model
  CREATE TABLE estimates: id, workspace_id, tenant_id,
  engagement_model, version, sections_json, status, created_at
  Engagement models: Staff Augmentation, Managed Capacity, Managed Services

[⬜ OPEN] P15-02 — Estimator agentic pipeline
  Agent roles: Discovery Agent, Development Agent, Testing Agent,
  Hyper-care Agent, Post-production Agent
  Each agent estimates its domain from Forge solution design
  Aggregation agent combines into total estimate

[⬜ OPEN] P15-03 — Estimator UI
  Route: /admin/estimator
  Shows estimate sections with agent reasoning
  Multiple versions for scenario comparison
  Change flow: modifying one section cascades to related sections

[⬜ OPEN] P15-04 — HR data feed integration
  API endpoint to receive talent, rates, bench capacity data
  Used by Estimator agents to ground estimates in real rates

---

## EPIC-P16 — Knowledge Graph Enhancement

[⬜ OPEN] P16-01 — Knowledge Graph as organisational brain
  Connect Knowledge Graph to Chamber RAG retrieval
  Agents query Knowledge Graph for relevant past decisions
  Most-referenced nodes surface as foundational knowledge

[⬜ OPEN] P16-02 — Knowledge Graph search
  Full-text search across Knowledge Graph nodes
  Filter by type, date, client, project, creator

[⬜ OPEN] P16-03 — Verified knowledge pipeline
  Only Admin-approved content enters Knowledge Graph as verified nodes
  Unverified drafts shown separately
  AI agents distinguish between verified and unverified knowledge

---

## EPIC-P17 — Multi-user Collaboration

[⬜ OPEN] P17-01 — Workspace sharing
  Owner can invite collaborators by email
  Share link with permission level: view/edit
  Collaborators see shared workspace in sidebar

[⬜ OPEN] P17-02 — Real-time collaboration (Google Docs style)
  WebSocket-based presence indicators
  Delta patches broadcast to all collaborators
  Conflict resolution: last-write-wins with version vector
  Named cursors per user in Grid canvas

[⬜ OPEN] P17-03 — Chat within Workspace
  In-workspace chat thread visible to all collaborators
  Chat messages linked to specific diagram nodes or document sections
  Notification when collaborator makes changes

---

## EPIC-P18 — Agent School

[⬜ OPEN] P18-01 — Pre-built agent library
  Curated set of role-specific agents available to all tenants
  Each agent has a SKILL.md, description, capability tags
  Agents: Architect, Adversary, Security, Compliance, Cost, Domain Expert

[⬜ OPEN] P18-02 — Custom agent creation
  Admin can create custom agents by authoring SKILL.md
  Custom agents stored in tenant_skills table
  Custom agents visible in agent picker in Chamber and Grid

[⬜ OPEN] P18-03 — Agent team builder
  User assembles a team of agents for a session
  Inspired by n8n workflow builder and OpenClaw agent roster
  Team configuration saved per Workspace

---

## EPIC-P19 — Integrations

[⬜ OPEN] P19-01 — Microsoft Teams integration
  Post diagram and document summaries to Teams channels
  Trigger Chamber sessions from Teams messages
  Teams AI Library integration (existing packages/teams-app)

[⬜ OPEN] P19-02 — SharePoint integration
  Publish Forge documents directly to SharePoint
  Import SharePoint documents into Chamber as context

[⬜ OPEN] P19-03 — Email notifications
  Notify readers/creators/admins of content status changes
  Weekly digest of new published content
  Notification when content is approved or rejected

[⬜ OPEN] P19-04 — Slack integration
  Post notifications to Slack channels
  Slash command to search Knowledge Graph from Slack

---

## EPIC-P20 — Tenant Release Management

[⬜ OPEN] P20-01 — ChiselGrid → Tenant deployment pipeline
  ChiselGrid is the platform. ascendion.engineering is the tenant.
  Define versioned release process: platform updates flow to tenant
  Tenant can accept or defer updates

[⬜ OPEN] P20-02 — Automated documentation from GitHub Actions
  On every merge to main: generate changelog
  Auto-update ROADMAP.md with completed items
  Post release notes to tenant admin

[⬜ OPEN] P20-03 — Feedback and change request flow
  Tenant users can submit feedback from within ChiselGrid
  Feedback logged as GitHub Issues automatically
  Admin can view and triage feedback in Tenant Settings

---

## EPIC-P21 — Session and Caching Optimisation

[⬜ OPEN] P21-01 — TOON-based session compression
  Store session state in TOON format for cheaper RAG retrieval
  Full session body stored in Aurora, TOON summary for quick access

[⬜ OPEN] P21-02 — ElastiCache Redis for hot sessions
  Cache active session state in Redis (EPIC-CACHE-03)
  Reduce Aurora reads for active users

[⬜ OPEN] P21-03 — Event streaming between Chamber, Grid, Forge
  Use cases:
    Chamber decision → automatically creates Grid session context
    Grid diagram approval → triggers Forge section update
    Forge section change → updates Knowledge Graph node
  Implementation: EventBridge or SNS/SQS fan-out

---

## EPIC-P22 — Cost and Space Quota Management

[⬜ OPEN] P22-01 — Per-user quota tracking
  Track token consumption and storage per user per period
  Configurable quota limits per role (Admin sets)

[⬜ OPEN] P22-02 — Quota notifications
  Warning at 80% usage
  Hard stop at 100% with request-for-increase flow
  User submits justification to Admin for increased quota

[⬜ OPEN] P22-03 — Usage dashboard
  Per-user cost breakdown
  Token consumption by feature (Chamber/Grid/Forge)
  Storage usage by content type

---

## EPIC-P23 — Usability and UX Polish

[⬜ OPEN] P23-01 — Hover descriptions on all features
  Short tooltip on every sidebar item and button
  First-time user onboarding hints

[⬜ OPEN] P23-02 — Simple/clean UI with progressive disclosure
  Complex options hidden in dropdowns
  Primary actions prominent, secondary actions in menus
  Follow DESIGN-SYSTEM.md Hick's Law principle

[⬜ OPEN] P23-03 — Grid Architecture ribbon toolbar
  MS Word-style grouped toolbar replacing scattered buttons
  Groups: Diagram | Export | Actions
  Score badge always visible

---

## PERMANENT TECHNICAL DEBT

[🟡 KNOWN] CDK-01 — CloudFront origin ID mismatch in storage.stack.ts
  The CDK desired state differs from live CLI-patched state.
  Risk: next ChiselGrid-Dev-Storage deploy may shuffle origin IDs.
  Fix: Pin originId to 'ApiGatewayOrigin' in storage.stack.ts.
  See BLOCKED.md for full details.

[🟡 KNOWN] DB-01 — tenant_id type inconsistency
  content.tenant_id is UUID. grid_diagrams.tenant_id is TEXT.
  content_relations.tenant_id is TEXT (cast at query time).
  Fix: Normalise all to UUID in M3 multi-tenancy epic.
  Cast workaround: sql`${table.tenantId}::text = ${tenantId}`

[🟡 KNOWN] AUTH-01 — Cognito user not linked to DB users table
  created_by in work_sessions stores Cognito sub UUID without FK.
  Fix: Add user provisioning to sync Cognito users to DB users table.
