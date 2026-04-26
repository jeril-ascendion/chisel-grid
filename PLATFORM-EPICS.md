# ChiselGrid — Platform Evolution EPICs
# From: Analysis of OpenClaw, n8n, Obsidian, Notion, GStack
# Vision: "Your organisation's engineering brain"

## Vision Statement

ChiselGrid is not a CMS, not a diagram tool, not a chat interface.
It is the living knowledge graph of how your organisation thinks about,
designs, and builds technology — where architectural knowledge is captured
as it is created, connected as it accumulates, validated as it is proposed,
and delivered as it is needed.

---

## Milestone Placement

| EPIC | Name | Milestone | Sprint | Effort | Impact |
|------|------|-----------|--------|--------|--------|
| EPIC-P01 | Reasoning Trail | M2 | May S1 | 2 days | Very High |
| EPIC-P02 | Skill Files for Agents | M2 | May S1 | 3 days | High |
| EPIC-P03 | Share Link by Default | M2 | May S1 | 2 days | High |
| EPIC-P04 | Engineering Daily Log | M2 | May S2 | 3 days | High |
| EPIC-P05 | Three-Mode Grid | M2 | May S2 | 1 week | High |
| EPIC-P06 | Typed Views of Content | M3 | June S1 | 1 week | High |
| EPIC-P07 | Bidirectional Links | M3 | June S1 | 1 week | Very High |
| EPIC-P08 | Knowledge Graph View | M3 | June S2 | 1 week | High |
| EPIC-P09 | Template Marketplace | M4 | July | 2 weeks | Very High |
| EPIC-P10 | Visual Agent Workflow Builder | M4 | July | 3 weeks | High |
| EPIC-P11 | Skill Registry / Marketplace | M5+ | Sept+ | 1 month | Transformative |

---

## EPIC-P01 — Reasoning Trail
**Milestone:** M2 — May Sprint 1
**Insight:** n8n shows every agent reasoning step. Claude shows thinking.
**Goal:** User sees exactly what ChiselGrid is doing and why at every step.
**Effort:** 2 days
**Impact:** Very High — compliance audit evidence + architect trust

### TASK-P01-01 — ReasoningTrail component
**File:** apps/web/src/components/workspace/ReasoningTrail.tsx
- Subtask: Create TrailEntry type: id, timestamp, type, message, detail, durationMs
- Subtask: Entry types: thinking (blue) | skill (purple) | agent (amber) | validation (green) | success (green) | warning (amber) | error (red)
- Subtask: Auto-expands when isActive=true, collapses when done
- Subtask: Auto-scrolls to latest entry during active generation
- Subtask: Expandable detail (+ button) for compliance findings and skill lists
- Subtask: Duration displayed right-aligned for steps > 500ms
- Subtask: Animated pulse dot while active
- Acceptance: Component renders in isolation with mock entries. All 7 types display correct colour and icon. Auto-scroll works. Detail expand works.

### TASK-P01-02 — Wire trail into Grid Architecture page
**File:** apps/web/src/app/admin/grid/architecture/page.tsx
- Subtask: Add trailEntries state and addTrail helper
- Subtask: Clear trail at start of each generation
- Subtask: Emit entries at each stream event: meta, node, edge, done, error
- Subtask: Emit skill loading entry before Bedrock call
- Subtask: Emit compliance score entry with expandable findings on done
- Subtask: Place ReasoningTrail between chat history and input box
- Acceptance: Generate a diagram. Trail shows: thinking → skill load → agent → node placements → edge wiring → validation score. Duration visible on slow steps.

### TASK-P01-03 — Wire trail into Chamber page
**File:** apps/web/src/app/admin/chamber/page.tsx
- Subtask: Add trailEntries state and addTrail helper
- Subtask: Emit trail on: message submit, RAG retrieval, agent reasoning, response complete
- Subtask: Show article titles in expandable detail when RAG is used
- Subtask: Show token estimate on completion
- Acceptance: Chamber conversation shows reasoning trail. RAG article titles visible when expanded.

### TASK-P01-04 — Persist trail with session
- Subtask: Store trail entries in sessionStorage alongside messages
- Subtask: Restore trail on session navigation return
- Subtask: Trail for past messages shown collapsed with entry count
- Acceptance: Navigate away from Grid and return. Trail for last generation is visible collapsed.

---

## EPIC-P02 — Skill Files for Agents
**Milestone:** M2 — May Sprint 1
**Insight:** OpenClaw SKILL.md — composable, versioned, community-owned knowledge units.
**Goal:** Replace hardcoded system prompts with SKILL.md files. Each skill is composable, versioned, tenant-specific.
**Effort:** 3 days
**Impact:** High — enables skill marketplace, tenant isolation, community contribution

### TASK-P02-01 — Skill file schema
**File:** packages/grid-agents/src/skills/schema.ts
- Subtask: Define SkillFile interface: name, version, description, domain, rules[], examples[], constraints[]
- Subtask: Create loadSkill(skillPath: string): SkillFile function
- Subtask: Create assemblePrompt(basePrompt, skills: SkillFile[]): string
- Subtask: Skills stored as Markdown files with YAML frontmatter
- Acceptance: loadSkill parses a SKILL.md file correctly. assemblePrompt concatenates relevant sections.

### TASK-P02-02 — Convert Architecture Agent prompt to skill files
**Directory:** packages/grid-agents/src/skills/
- Subtask: Create base.skill.md — core Grid-IR rules, always loaded
- Subtask: Create aws-well-architected.skill.md — 6 pillars, AWS service rules
- Subtask: Create serverless.skill.md — Lambda patterns, no ALB/EC2 rules
- Subtask: Create payment-systems.skill.md — SQS DLQ, async processing, PCI rules
- Subtask: Create bsp-afasa.skill.md — Philippine banking, InstaPay, BSP requirements
- Subtask: Create pci-dss-v4.skill.md — cardholder data, zone rules, encryption
- Subtask: Create positions.skill.md — node position guidelines for readable layout
- Acceptance: All 7 skill files load and parse. Architecture Agent produces same quality output using skills as with hardcoded prompt.

### TASK-P02-03 — Dynamic skill loading based on intent
**File:** packages/grid-agents/src/skills/router.ts
- Subtask: selectSkills(prompt: string, diagramType: string): string[] — returns skill file names to load
- Subtask: Rules: always load base + positions; load payment if prompt contains payment/bank/fintech; load bsp-afasa if Philippine/BSP/Union Bank; load serverless if Lambda/serverless
- Subtask: Token saving: generic prompt loads 600 tokens. Payment + PH bank loads 1,400 tokens. Full prompt was always 1,800 tokens.
- Acceptance: Skill router selects correct skills for 10 test prompts. Token count per prompt is measurably lower for non-payment prompts.

### TASK-P02-04 — Tenant-specific skill overrides
- Subtask: Skills loadable from Aurora: tenant_skills table storing custom SKILL.md content per tenant
- Subtask: GET /api/admin/skills — list skills for tenant
- Subtask: POST /api/admin/skills — create or update a skill for tenant
- Subtask: Tenant skills merged with base skills; tenant rules take precedence
- Acceptance: Admin can create a custom skill in Content Studio. Next diagram generation uses the custom skill rules.

---

## EPIC-P03 — Share Link by Default
**Milestone:** M2 — May Sprint 1
**Insight:** Notion — every session shareable with a link, no invite flow.
**Goal:** Every session is shareable immediately. Share link opens multiplayer session.
**Effort:** 2 days
**Impact:** High — viral adoption vector, removes friction for team collaboration

### TASK-P03-01 — Share button in workspace toolbar
**Files:** Grid architecture page, Chamber page
- Subtask: Add Share button to toolbar (link icon)
- Subtask: Clicking copies current URL (with ?session=UUID) to clipboard
- Subtask: Show toast: "Link copied — anyone with this link can view this session"
- Subtask: Share button visible in Grid, Chamber, Studio toolbars
- Acceptance: Click Share. URL with session ID is in clipboard. Paste in new tab — session loads with correct state.

### TASK-P03-02 — Read-only view for shared sessions
- Subtask: Sessions have visibility: private | shared_view | shared_edit
- Subtask: Default: shared_view (anyone with link can view, not edit)
- Subtask: Session toolbar shows current visibility with toggle
- Subtask: Shared view: canvas interactive (zoom/pan) but no Generate button
- Subtask: Shared edit: full access (for team collaboration)
- Acceptance: Share link opens session for user without auth. They can view diagram and chat history. Generate button is hidden.

### TASK-P03-03 — Session visibility stored in Aurora
- Subtask: Add visibility column to work_sessions table
- Subtask: GET /api/sessions/[id]/shared — public endpoint, no auth required
- Subtask: Returns session if visibility is not private
- Acceptance: Public session URL accessible without login. Private session returns 401.

---

## EPIC-P04 — Engineering Daily Log
**Milestone:** M2 — May Sprint 2
**Insight:** Obsidian Daily Notes — capture fleeting thoughts, synthesise into knowledge.
**Goal:** Auto-created daily Chamber session per engineer. Weekly AI synthesis into knowledge articles.
**Effort:** 3 days
**Impact:** High — drives organic content growth, knowledge capture without deliberate documentation effort

### TASK-P04-01 — Daily session auto-creation
**File:** apps/web/src/app/api/admin/sessions/daily/route.ts
- Subtask: GET /api/admin/sessions/daily — returns or creates today's session for user
- Subtask: Session title format: "Daily Log — Apr 29, 2026 — jeril.panicker"
- Subtask: Session type: daily_log (new type in work_sessions table)
- Subtask: Chamber sidebar shows "Today's Log" shortcut at top
- Acceptance: Clicking Today's Log opens the daily session. Same session returned all day. New session created at midnight.

### TASK-P04-02 — Daily log quick capture
- Subtask: Daily log Chamber has a simplified Quick Capture input at top
- Subtask: Single-line input: "Capture a thought, decision, or question..."
- Subtask: Pressing Enter adds the note as a timestamped message
- Subtask: Notes tagged with: type (thought | decision | question | blocker | learning)
- Acceptance: Engineer can capture 10 notes in under 2 minutes. Each note timestamped and tagged.

### TASK-P04-03 — Weekly synthesis agent
**File:** apps/web/src/app/api/admin/sessions/synthesise/route.ts
- Subtask: POST /api/admin/sessions/synthesise — takes session IDs and generates article draft
- Subtask: Runs weekly via scheduled Lambda (EventBridge cron: every Monday 08:00)
- Subtask: Reads all daily logs for the user from past 7 days
- Subtask: Bedrock agent synthesises key decisions, learnings, open questions into article draft
- Subtask: Draft saved to content table with status=draft, created_by=system, source=daily_synthesis
- Subtask: User notified: "Your weekly synthesis is ready for review in Content Queue"
- Acceptance: Daily log entries synthesised into a readable article draft. Draft appears in Content Queue.

---

## EPIC-P05 — Three-Mode Grid
**Milestone:** M2 — May Sprint 2
**Insight:** Right tool for the right moment. Architecture for review. Sketch for whiteboard. Precise for delivery.
**Goal:** Three rendering modes sharing one Grid-IR pipeline.
**Effort:** 1 week
**Impact:** High — removes "Grid is overkill for quick sketches" objection

### TASK-P05-01 — Mode selector on Grid landing page
**File:** apps/web/src/app/admin/grid/page.tsx
- Subtask: Add three mode cards above existing feature cards
- Subtask: Architecture card: "Interactive, Validated, PCI/BSP aware" → /admin/grid/architecture
- Subtask: Sketch card: "Hand-drawn, Whiteboard, Quick draft" → /admin/grid/sketch
- Subtask: Precise card: "Enterprise, Export, Slides ready" → /admin/grid/precise
- Subtask: Architecture card: border-primary. Sketch: border-amber-400. Precise: border-blue-400.
- Acceptance: Three mode cards visible on Grid landing. Each links to correct route.

### TASK-P05-02 — Grid-IR to Excalidraw converter
**File:** packages/grid-ir/src/excalidraw.ts
- Subtask: gridIRToExcalidraw(ir: GridIR): ExcalidrawElement[]
- Subtask: Map nodes to Excalidraw rectangles with roughness=1 (hand-drawn)
- Subtask: Map edges to Excalidraw arrows
- Subtask: Zone colours: public=blue, private=green, compliance=red, external=purple
- Subtask: Export function: gridIRToExcalidrawFile(ir: GridIR): string (JSON)
- Acceptance: A 10-node Grid-IR converts to valid Excalidraw JSON. File importable in Excalidraw app.

### TASK-P05-03 — Grid-IR to Draw.io XML converter
**File:** packages/grid-ir/src/drawio.ts
- Subtask: gridIRToDrawio(ir: GridIR): string (XML)
- Subtask: Map node types to AWS Draw.io shape names (mxgraph.aws4.*)
- Subtask: Map edges to orthogonal mxCell edges
- Subtask: Valid .drawio XML that opens correctly in draw.io app
- Acceptance: A 10-node Grid-IR converts to valid Draw.io XML. File opens correctly in draw.io.

### TASK-P05-04 — Sketch mode page with Excalidraw
**File:** apps/web/src/app/admin/grid/sketch/page.tsx
- Subtask: Install @excalidraw/excalidraw: pnpm add @excalidraw/excalidraw
- Subtask: Same two-panel layout as Architecture mode
- Subtask: Canvas renders Excalidraw component (dynamic import ssr:false)
- Subtask: On generate: Architecture Agent → Grid-IR → gridIRToExcalidraw → Excalidraw render
- Subtask: Compliance score shown (architectural rules apply even in sketch)
- Subtask: Promote to Architecture Review button navigates to /admin/grid/architecture?session=id
- Subtask: No Approve button (sketches are informal, not for training corpus)
- Acceptance: Sketch mode generates hand-drawn diagram. Promote button navigates to Architecture mode with same session.

### TASK-P05-05 — Precise mode page with Draw.io export
**File:** apps/web/src/app/admin/grid/precise/page.tsx
- Subtask: Same layout as Architecture mode (React Flow canvas)
- Subtask: Additional toolbar buttons: Export Draw.io (downloads .drawio file), Open in Draw.io (opens draw.io.com)
- Subtask: Compliance score with stricter threshold: warning if score < 80 "Not recommended for client delivery"
- Subtask: Approve for Delivery button saves to grid_training_data with mode=precise
- Acceptance: Generate in Precise mode. Download .drawio produces valid file. Open in Draw.io opens drawio.com with diagram. Score < 80 shows delivery warning.

### TASK-P05-06 — Export buttons in Architecture mode
**File:** packages/grid-renderer/src/components/DiagramToolbar.tsx
- Subtask: Add Export Draw.io button next to Export PNG
- Subtask: Add Export Sketch (.excalidraw) button
- Acceptance: Architecture mode has three export options: PNG, Draw.io, Excalidraw.

### TASK-P05-07 — Fix streaming known issues
**Files:** packages/grid-agents/src/bedrock.ts, architecture/page.tsx
- Subtask: Issue 1 — Bedrock streaming: verify InvokeModelWithResponseStreamCommand is used in production
- Subtask: Issue 2 — Incremental JSON: test parser with 20+ node diagrams, fix edge cases
- Subtask: Issue 3 — dagre layout: use sequential positions during streaming, run dagre only on done event
- Acceptance: 20-node diagram streams node-by-node without layout jumping. Final dagre layout applies smoothly.

---

## EPIC-P06 — Typed Views of Content
**Milestone:** M3 — June Sprint 1
**Insight:** Notion — same data as table, board, timeline, gallery view.
**Goal:** Content Studio becomes a knowledge database with multiple lenses.
**Effort:** 1 week
**Impact:** High — transforms CMS into architecture knowledge platform

### TASK-P06-01 — Content type schema
**File:** apps/web/src/lib/db/content-types.ts
- Subtask: Define ContentType enum: article | adr | diagram | decision | runbook | template | post_mortem
- Subtask: Add content_type column to content table in Aurora
- Subtask: Update Content Queue to show type badge per article
- Acceptance: Content items have explicit types. Type visible in admin views.

### TASK-P06-02 — Table view (current, enhance)
- Subtask: Add column selector — show/hide: type, category, author, date, score, status
- Subtask: Sort by any column
- Subtask: Filter by type, status, category, date range
- Acceptance: All Content table is filterable and sortable by all columns.

### TASK-P06-03 — Board view (kanban)
**File:** apps/web/src/app/admin/content/board/page.tsx
- Subtask: Columns: Draft | In Review | Approved | Published | Archived
- Subtask: Cards draggable between columns (updates status in Aurora)
- Subtask: Card shows: title, type badge, category, author avatar, date
- Acceptance: Drag article from In Review to Approved. Status updates in Aurora. Board refreshes.

### TASK-P06-04 — Timeline view
**File:** apps/web/src/app/admin/content/timeline/page.tsx
- Subtask: Horizontal timeline showing articles published over time
- Subtask: Grouped by week or month (toggle)
- Subtask: Click article to open it
- Subtask: Shows architecture evolution — what was designed when
- Acceptance: Timeline shows all 155 articles in chronological order. Month grouping works.

### TASK-P06-05 — View switcher in All Content
- Subtask: Add [Table] [Board] [Timeline] toggle in All Content header
- Subtask: Preference saved in localStorage
- Acceptance: View toggle persists across browser sessions.

---

## EPIC-P07 — Bidirectional Links
**Milestone:** M3 — June Sprint 1
**Insight:** Obsidian — every piece of knowledge links to every related piece.
**Goal:** Articles link to diagrams. Diagrams link to sessions. Sessions link to decisions.
**Effort:** 1 week
**Impact:** Very High — creates the knowledge graph foundation

### TASK-P07-01 — content_relations table
**File:** tools/migration/src/relations-schema.ts
- Subtask: CREATE TABLE content_relations: id, source_id, source_type, target_id, target_type, relation_type, tenant_id, created_at
- Subtask: source_type / target_type: article | diagram | session | decision | template
- Subtask: relation_type: references | illustrates | created_from | documents | related_to | contradicts
- Subtask: Index on source_id, target_id, tenant_id
- Acceptance: Table created. FK constraints valid. Insert/query works.

### TASK-P07-02 — Auto-link diagrams to sessions
- Subtask: When diagram saved from a session, insert relation: session → created_from → diagram
- Subtask: When diagram approved and article exists, prompt: "Link this diagram to an article?"
- Acceptance: Generated diagram shows "Created in session: [title]" link.

### TASK-P07-03 — Article ↔ Diagram linking UI
- Subtask: Article detail page shows "Related Diagrams" section
- Subtask: Diagram workspace shows "Linked Articles" section
- Subtask: Admin can manually create links between any two content items
- Acceptance: Article shows related diagrams. Clicking navigates to diagram. Diagram shows linked articles.

### TASK-P07-04 — Backlink count and surface
- Subtask: Add times_referenced column to content table (computed from content_relations count)
- Subtask: Update on every new relation insert
- Subtask: Sort option: "Most Referenced" — surfaces foundational knowledge
- Subtask: Badge on content cards showing reference count
- Acceptance: "Most Referenced" sort shows articles with most backlinks first. Badge visible on cards.

---

## EPIC-P08 — Knowledge Graph View
**Milestone:** M3 — June Sprint 2
**Insight:** Obsidian graph view — visual web of all knowledge. Node size = importance.
**Goal:** Visual graph showing all articles, diagrams, and decisions and how they connect.
**Effort:** 1 week
**Impact:** High — unique differentiator, visualises the organisation's knowledge architecture

### TASK-P08-01 — Knowledge graph API
**File:** apps/web/src/app/api/admin/knowledge-graph/route.ts
- Subtask: GET /api/admin/knowledge-graph returns: nodes (id, title, type, references_count), edges (source, target, relation_type)
- Subtask: Nodes sized by references_count
- Subtask: Filter params: type, date_range, category
- Acceptance: API returns valid graph data for all 155 articles + diagrams + sessions.

### TASK-P08-02 — Knowledge graph page
**File:** apps/web/src/app/admin/knowledge-graph/page.tsx
- Subtask: Force-directed graph using D3.js (dynamic import)
- Subtask: Node size = references_count (min 8px, max 40px)
- Subtask: Node colour by type: article=blue, diagram=orange, session=purple, decision=green
- Subtask: Hover node: show title and reference count tooltip
- Subtask: Click node: open content item in side panel
- Subtask: Zoom, pan, filter controls
- Subtask: "Orphan nodes" toggle: highlight articles with zero references (knowledge gaps)
- Acceptance: Graph renders all content items. Most referenced nodes are visually largest. Click node opens content. Orphan toggle shows unlinked content.

### TASK-P08-03 — Graph in sidebar nav
- Subtask: Add Knowledge Graph link in admin sidebar under Analytics
- Subtask: Mini-graph widget on dashboard showing top 10 most-referenced nodes
- Acceptance: Dashboard shows mini knowledge graph. Full graph accessible from sidebar.

---

## EPIC-P09 — Template Marketplace
**Milestone:** M4 — July
**Insight:** Notion template gallery — templates drive adoption, demonstrate platform value.
**Goal:** 10+ Studio document templates. Each pre-populates from Chamber + Grid output.
**Effort:** 2 weeks
**Impact:** Very High — drives Studio adoption, creates client-ready deliverables

### TASK-P09-01 — Template data model
**File:** tools/migration/src/templates-schema.ts
- Subtask: CREATE TABLE studio_templates: id, tenant_id, name, description, category, sections_json, is_public, created_by, created_at
- Subtask: sections_json: array of {title, source: chamber|grid|manual, placeholder}
- Subtask: Categories: solutions_design | rfp_response | architecture_review | incident_report | migration_runbook | api_design
- Acceptance: Table created. Insert/query works.

### TASK-P09-02 — Built-in templates (10 required)
**File:** tools/migration/src/seed-templates.ts
Seed these templates:
- Subtask: Solutions Design Document (Ascendion standard: Executive Summary, Requirements, Architecture, Trade-offs, ADRs, Work Breakdown)
- Subtask: RFP Response (Cover Letter, Understanding, Proposed Solution, Architecture, Team, Commercials)
- Subtask: Architecture Review Board Submission (Current State, Proposed Change, Risk Assessment, Compliance, Approval)
- Subtask: Cloud Migration Runbook (Inventory, Dependencies, Migration Waves, Rollback Plan, Success Criteria)
- Subtask: API Design Review (Overview, Endpoints, Auth, Error Handling, Rate Limits, Versioning)
- Subtask: Incident Post-Mortem (Timeline, Root Cause, Impact, Resolution, Action Items)
- Subtask: Technical Feasibility Study (Executive Summary, Requirements, Options Analysis, Recommendation, Risks)
- Subtask: Security Architecture Review (Threat Model, STRIDE Analysis, Controls, Compliance Gaps, Remediation)
- Subtask: Data Architecture Document (Domain Model, Data Flow, Storage Decisions, Privacy, Governance)
- Subtask: Engineering Proposal (Problem Statement, Solution Options, Recommendation, Effort, Timeline)
- Acceptance: 10 templates seeded. Each has complete sections_json. Templates visible in Studio.

### TASK-P09-03 — Template selection UI in Studio
**File:** apps/web/src/app/admin/studio/page.tsx
- Subtask: "New Document" button shows template picker gallery
- Subtask: Templates shown as cards with name, category, section count
- Subtask: Selecting template creates new Studio document pre-populated with sections
- Subtask: Each section shows source: [From Chamber] [From Grid] [Write manually]
- Acceptance: Select Solutions Design template. Document opens with 6 pre-defined sections. Chamber and Grid sections show "Connect Session" prompts.

### TASK-P09-04 — Auto-populate sections from Chamber + Grid
- Subtask: [From Chamber] button: shows list of recent Chamber sessions to import from
- Subtask: [From Grid] button: shows list of recent Grid diagrams to embed
- Subtask: Chamber content extracted to relevant section (Bedrock extracts relevant portion)
- Subtask: Grid diagram embedded as image in section
- Acceptance: Open Chamber session. Click [From Chamber] in Architecture section. Relevant architectural decisions populate the section. Grid diagram embedded in document.

### TASK-P09-05 — Template export
- Subtask: Export document as Word .docx (existing docx skill)
- Subtask: Export as PDF (existing pdf skill)
- Subtask: Export as Markdown (for Confluence import)
- Acceptance: Solutions Design Document exports as valid .docx with correct sections and embedded diagrams.

---

## EPIC-P10 — Visual Agent Workflow Builder
**Milestone:** M4 — July
**Insight:** n8n visual workflow — non-technical users build agent pipelines without code.
**Goal:** Drag agents onto canvas, connect them, run custom review pipelines.
**Effort:** 3 weeks
**Impact:** High — democratises architecture review, enables client-specific workflows

### TASK-P10-01 — Agent workflow data model
**File:** tools/migration/src/agent-workflows-schema.ts
- Subtask: CREATE TABLE agent_workflows: id, tenant_id, name, workflow_json, created_by, created_at
- Subtask: workflow_json: {nodes: AgentNode[], edges: AgentEdge[]}
- Subtask: AgentNode: id, type (architect|adversary|security|compliance|cost|domain_expert|quality_gate), config, position
- Subtask: AgentEdge: from, to, condition (always|on_findings|on_score_below)
- Acceptance: Table created. Can store and retrieve workflow definitions.

### TASK-P10-02 — Workflow builder UI
**File:** apps/web/src/app/admin/chamber/workflow-builder/page.tsx
- Subtask: React Flow canvas for building agent workflows (separate from diagram canvas)
- Subtask: Agent node palette on left: drag agents onto canvas
- Subtask: Connect agents with edges
- Subtask: Agent config panel: click agent to set model (haiku/sonnet), skills, temperature
- Subtask: Conditional edges: always | only if findings > 0 | only if score < threshold
- Subtask: Save workflow with name
- Subtask: Pre-built workflow templates: Quick Review (1 agent), Standard Review (3 agents), Full Review (5 agents)
- Acceptance: Non-developer can build a 3-agent pipeline in under 5 minutes by dragging and connecting.

### TASK-P10-03 — Workflow execution engine
**File:** packages/grid-agents/src/pipeline/workflowEngine.ts
- Subtask: executeWorkflow(workflowDef, gridIR, prompt): AsyncGenerator<WorkflowEvent>
- Subtask: Executes agents in topological order based on workflow edges
- Subtask: Respects conditional edges (skip agent if condition not met)
- Subtask: Streams events: agent_started, agent_complete, finding_added, score_updated
- Subtask: Max 3 iterations on any cycle to prevent infinite loops
- Acceptance: 3-agent workflow executes correctly. Conditional edges skip agents when conditions not met.

---

## EPIC-P11 — Skill Registry and Marketplace
**Milestone:** M5+ — September onwards
**Insight:** OpenClaw ClawHub — NPM for skills. 13,000+ community skills. Network effects compound.
**Goal:** Public and private skill files for industries and clients. Revenue from premium skills.
**Effort:** 1 month
**Impact:** Transformative — new revenue stream, community flywheel, defensible moat

### TASK-P11-01 — Skill registry infrastructure
- Subtask: CREATE TABLE skill_registry: id, name, slug, version, description, category, skill_content, is_public, tenant_id, price_usd, downloads, created_by, created_at
- Subtask: Skill categories: cloud | compliance | industry | integration | client_specific | methodology
- Subtask: Version management: semver, multiple versions coexist
- Acceptance: Skills can be published, versioned, and retrieved.

### TASK-P11-02 — Skill marketplace UI
**File:** apps/web/src/app/admin/skills/page.tsx
- Subtask: Browse skills by category
- Subtask: Search skills by name and description
- Subtask: Install skill to tenant (copies to tenant_skills table)
- Subtask: Public skills: free. Premium skills: subscription via Stripe
- Subtask: Usage count and rating per skill
- Acceptance: Skills marketplace browsable. Install button adds skill to tenant. Installed skills appear in agent skill router.

### TASK-P11-03 — Skill publishing workflow
- Subtask: Any admin can publish a tenant skill to the public registry
- Subtask: Review queue: skills reviewed before becoming public
- Subtask: Version bump workflow: publish new version, old version still usable
- Acceptance: Publish a custom skill. It appears in marketplace after review.

### TASK-P11-04 — Revenue model integration
- Subtask: Stripe integration for premium skill subscriptions
- Subtask: Skill revenue split: 70% to publisher, 30% to ChiselGrid platform
- Subtask: Usage tracking: which tenants use which skills, per-API-call billing for premium
- Acceptance: Premium skill requires active subscription. Revenue split recorded.

### TASK-P11-05 — Ascendion seed skills (initial catalogue)
Publish these skills to bootstrap the marketplace:
- Subtask: ascendion-engineering-standards.skill.md
- Subtask: philippine-banking-bsp.skill.md (premium)
- Subtask: aws-ascendion-patterns.skill.md (premium)
- Subtask: mulesoft-api-led.skill.md (premium)
- Subtask: kafka-enterprise-patterns.skill.md (premium)
- Acceptance: 5 Ascendion skills published. Philippine banking skill drives early premium revenue.

---

## Implementation Cadence for Claude Code + Ralph Loop + GStack

### How to run these with Ralph Loop

Each EPIC can be given to Ralph Loop as a batch.
Ralph Loop runs multiple iterations autonomously until acceptance criteria pass.

Example invocation for EPIC-P01:
  cd ~/projects/chisel-grid && claude --dangerously-skip-permissions
  [paste EPIC-P01 tasks as a single prompt with all subtasks and acceptance criteria]
  Ralph Loop iterates until all acceptance criteria pass.

### Parallel execution rules

CAN run in parallel (no shared file dependencies):
  EPIC-P01 (ReasoningTrail) + EPIC-P03 (Share Link) — different files
  EPIC-P02 (Skills) + EPIC-P04 (Daily Log) — different packages
  EPIC-P06 (Typed Views) + EPIC-P07 (Bidirectional Links) — different files

MUST run sequentially (dependency order):
  EPIC-P07 (Bidirectional Links) → before → EPIC-P08 (Knowledge Graph)
  EPIC-P02 (Skill Files) → before → EPIC-P11 (Skill Registry)
  EPIC-P09 (Templates) → before → EPIC-P10 (Workflow Builder uses templates)

### GStack integration points

Before starting each EPIC:
  /plan — Eng Manager locks architecture, identifies risks

After each deploy:
  /qa — QA opens browser, verifies acceptance criteria

Before each sprint ends:
  /design-review https://www.chiselgrid.com/admin — visual audit

Before major milestone:
  /review — Pre-ship production bug check

Weekly:
  /retro — shipping velocity, what to improve

---

## Progress Tracking

Update Status as work proceeds: Not Started | In Progress | Complete | Blocked

| EPIC | Name | Milestone | Status |
|------|------|-----------|--------|
| EPIC-P01 | Reasoning Trail | M2 May S1 | In Progress |
| EPIC-P02 | Skill Files | M2 May S1 | Not Started |
| EPIC-P03 | Share Link | M2 May S1 | Not Started |
| EPIC-P04 | Daily Log | M2 May S2 | Not Started |
| EPIC-P05 | Three-Mode Grid | M2 May S2 | In Progress |
| EPIC-P06 | Typed Views | M3 Jun S1 | Not Started |
| EPIC-P07 | Bidirectional Links | M3 Jun S1 | Not Started |
| EPIC-P08 | Knowledge Graph | M3 Jun S2 | Not Started |
| EPIC-P09 | Template Marketplace | M4 Jul | Not Started |
| EPIC-P10 | Visual Agent Builder | M4 Jul | Not Started |
| EPIC-P11 | Skill Registry | M5+ Sep | Not Started |

---

*Last updated: April 2026*
*Owner: Jeril Panicker, Solutions Architect, Ascendion Digital Services Philippines*
*Insights sourced from: OpenClaw, n8n, Obsidian, Notion, GStack analysis*
*See ROADMAP.md for M1-M7 milestone context.*
