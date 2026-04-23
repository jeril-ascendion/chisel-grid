# Grid — Implementation EPICs and Tasks

All Grid EPICs belong to Milestone 2 and beyond in ROADMAP.md.
See GRID.md for architecture, design decisions, and package structure.

---

## EPIC-GRID-01 — Grid Foundation (Sprint 1, April 29 MVP)

**Goal:** Text prompt → Grid-IR → React Flow interactive diagram → PNG export

**Package scope:** grid-ir, grid-agents (Architecture Agent only), grid-renderer (basic), apps/web

---

### TASK-GRID-01-01 — Create grid-ir package

**File:** packages/grid-ir/

- Subtask: Create packages/grid-ir/package.json with name @chiselgrid/grid-ir
- Subtask: Create src/schema.ts — Zod schema for Grid-IR JSON validation
- Subtask: Create src/types.ts — TypeScript types exported from schema
- Subtask: Create src/transforms.ts — Grid-IR to Mermaid text (text export only)
- Subtask: Create src/validate.ts — validateGridIR(json) returns true/false + errors
- Subtask: Create src/templates.ts — starter Grid-IR for each diagram type
- Subtask: Write unit tests for validation and transforms
- Acceptance: @chiselgrid/grid-ir imports correctly in other packages. validateGridIR rejects invalid IR. All 10 diagram type templates pass validation.

---

### TASK-GRID-01-02 — Create grid-agents package

**File:** packages/grid-agents/

- Subtask: Create packages/grid-agents/package.json with name @chiselgrid/grid-agents
- Subtask: Create src/agents/architectureAgent.ts
  - Input: { prompt: string, diagramType: string, context?: GridIR }
  - Calls Bedrock claude-sonnet-4-5 with architecture system prompt
  - Returns valid Grid-IR JSON
  - System prompt in src/prompts/architecture.prompt.ts
- Subtask: Create src/prompts/architecture.prompt.ts
  - Full system prompt for architecture agent
  - Instructs Claude to output ONLY valid Grid-IR JSON
  - Includes all node types, edge types, zone types in prompt
- Subtask: Create src/bedrock.ts — shared Bedrock client wrapper
- Subtask: Mock mode: if GRID_MOCK=true return fixture Grid-IR for local dev without Bedrock
- Acceptance: architectureAgent("AWS serverless API with Aurora") returns valid Grid-IR. validateGridIR(result) returns true.

---

### TASK-GRID-01-03 — Create grid-renderer package

**File:** packages/grid-renderer/

- Subtask: Create packages/grid-renderer/package.json with name @chiselgrid/grid-renderer
- Subtask: Install: react-flow-renderer (or @xyflow/react), d3
- Subtask: Create src/components/DiagramCanvas.tsx
  - Props: { gridIR: GridIR, onNodeClick?: (nodeId) => void }
  - Renders Grid-IR as React Flow diagram
  - Node types mapped from Grid-IR type to React Flow node component
  - Edge animations enabled when edge.animated === true
- Subtask: Create src/components/nodes/ directory with node components:
  - AWSNodeComponent.tsx — AWS service node with service icon
  - DefaultNodeComponent.tsx — generic rounded rectangle
  - ZoneGroupComponent.tsx — dashed border group for zones
- Subtask: Create src/components/DiagramToolbar.tsx
  - Zoom in, zoom out, fit to screen, export PNG buttons
  - Diagram type selector tabs
- Subtask: Create src/utils/gridIRToReactFlow.ts
  - Converts Grid-IR nodes array to React Flow nodes array
  - Converts Grid-IR edges array to React Flow edges array
  - Maps zones to React Flow node groups
- Acceptance: DiagramCanvas renders a valid Grid-IR document as an interactive React Flow diagram. Nodes draggable. Edges visible. Export PNG produces a file.

---

### TASK-GRID-01-04 — Create Grid API route

**File:** apps/web/src/app/api/admin/grid/generate/route.ts

- Subtask: POST handler accepts { prompt, diagramType, currentDiagramIR? }
- Subtask: Auth check: return 401 if no session
- Subtask: Import architectureAgent from @chiselgrid/grid-agents
- Subtask: Call architectureAgent with request body
- Subtask: Validate result with validateGridIR from @chiselgrid/grid-ir
- Subtask: If validation fails: return 422 with validation errors
- Subtask: Save Grid-IR to Aurora grid_diagrams table
- Subtask: Return { gridIR, diagramId }
- Subtask: Create Aurora migration for grid_diagrams and grid_embeddings tables
- Acceptance: POST with valid prompt returns 200 with valid Grid-IR. POST with no auth returns 401. Saved diagram retrievable by ID from Aurora.

---

### TASK-GRID-01-05 — Build Architecture Diagram workspace page

**File:** apps/web/src/app/admin/grid/architecture/page.tsx

- Subtask: Page layout: left panel (diagram canvas, 60%), right panel (prompt panel, 40%)
- Subtask: Prompt panel has:
  - Chat history (scrollable, shows user prompts and AI responses)
  - Multi-modal input box at bottom (textarea, attachment button, generate button)
  - Diagram type selector tabs above canvas: AWS Architecture, C4 Context, Sequence, Flow
- Subtask: On Generate click: POST to /api/admin/grid/generate, show loading spinner in canvas
- Subtask: On response: render Grid-IR in DiagramCanvas component
- Subtask: Import DiagramCanvas from @chiselgrid/grid-renderer using dynamic import ssr:false
- Subtask: Import DiagramToolbar from @chiselgrid/grid-renderer
- Subtask: Iterative refinement: subsequent prompts include currentDiagramIR in request
- Subtask: Save button saves current diagram title and Grid-IR to Aurora
- Subtask: New button resets canvas and chat history
- Acceptance: User can type a prompt, click Generate, and see a rendered diagram within 10 seconds. User can refine the diagram with follow-up prompts. User can export the diagram as PNG.

---

### TASK-GRID-01-06 — Update Grid landing page

**File:** apps/web/src/app/admin/grid/page.tsx

- Subtask: Architecture Diagrams card links to /admin/grid/architecture
- Subtask: Remove Coming Soon badge from Architecture Diagrams card only
- Subtask: Add Launch button to Architecture Diagrams card
- Subtask: Keep Coming Soon on all other 5 cards
- Acceptance: Clicking Architecture Diagrams card navigates to /admin/grid/architecture.

---

### TASK-GRID-01-07 — Aurora migration for grid tables

**File:** tools/migration/src/grid-schema.ts

- Subtask: Create SQL for grid_diagrams table (see GRID.md schema section)
- Subtask: Create SQL for grid_embeddings table
- Subtask: Run migration against Aurora via RDS Data API
- Subtask: Verify tables created with correct columns
- Acceptance: grid_diagrams and grid_embeddings tables exist in Aurora. INSERT and SELECT work correctly.

---

## EPIC-GRID-02 — Animation and Multi-modal Input (Sprint 2, May)

**Goal:** Data flow animations, voice input, image/document input, 5 diagram types

---

### TASK-GRID-02-01 — Data flow animation

**File:** packages/grid-renderer/src/components/AnimatedEdge.tsx

- Subtask: Animated dot component that moves along React Flow edge path
- Subtask: Speed derived from edge.latency_ms (lower latency = faster dot)
- Subtask: Color derived from edge.protocol (HTTPS=blue, gRPC=green, async=orange)
- Subtask: Toggle animation on/off per diagram via DiagramToolbar button
- Acceptance: Edges with animated:true show moving dots. Toggle button works. Animation does not cause performance issues with 30+ edges.

---

### TASK-GRID-02-02 — Progressive disclosure (expand/collapse nodes)

**File:** packages/grid-renderer/src/components/ExpandableNode.tsx

- Subtask: Nodes with abstraction_levels_available > 1 show expand icon on hover
- Subtask: On click: POST to /api/admin/grid/expand with { nodeId, targetLevel }
- Subtask: API calls architectureAgent to generate Level N detail for the clicked node
- Subtask: Canvas updates with expanded node children using Framer Motion animation
- Subtask: Breadcrumb shows current path: "System > Payment Service > Lambda Functions"
- Acceptance: Clicking an expandable node smoothly expands it to show child components. Back button collapses it.

---

### TASK-GRID-02-03 — Voice input

**File:** apps/web/src/app/admin/grid/architecture/page.tsx

- Subtask: Microphone button in prompt panel input area
- Subtask: onClick: start Web Speech API SpeechRecognition
- Subtask: Show pulsing red dot recording indicator while active
- Subtask: On result: populate textarea with transcribed text
- Subtask: On end: automatically trigger Generate if text is present
- Subtask: Show browser support warning if SpeechRecognition not available
- Acceptance: Clicking microphone and speaking a diagram description populates the textarea and triggers diagram generation.

---

### TASK-GRID-02-04 — Image and document input

**File:** apps/web/src/app/admin/grid/architecture/page.tsx

- Subtask: Clip/attachment icon button in prompt panel
- Subtask: File input accepts: .png, .jpg, .pdf, .txt, .md
- Subtask: For images: convert to base64, include in Bedrock request as image content block
- Subtask: For text files: read content, include as text context in prompt
- Subtask: Show thumbnail or filename preview below textarea
- Subtask: Ctrl+V paste detection for clipboard images
- Subtask: Bedrock Architecture Agent updated to handle image input in message content
- Acceptance: User can paste a screenshot of an existing architecture. Grid generates a Grid-IR representation of what it sees in the image.

---

### TASK-GRID-02-05 — Sequence diagram support

**File:** packages/grid-agents/src/agents/sequenceAgent.ts

- Subtask: Sequence-specific system prompt in src/prompts/sequence.prompt.ts
- Subtask: Grid-IR extended with sequence-specific edge types: request, response, async, event
- Subtask: Sequence renderer in grid-renderer: vertical swimlanes, horizontal arrows
- Acceptance: Prompt "Show the flow of a login request through Cognito and NextAuth" produces a readable sequence diagram.

---

## EPIC-GRID-03 — Full Agent Pipeline (Sprint 3, June)

**Goal:** All 5 agents active, Polly presentation mode, failure simulation

---

### TASK-GRID-03-01 — Intent Agent

**File:** packages/grid-agents/src/agents/intentAgent.ts

- Subtask: Determines diagram type, audience, abstraction level from free-text input
- Subtask: Returns { diagramType, audience, abstractionLevel, missingInfo[] }
- Subtask: If missingInfo is non-empty: prompt panel shows clarifying questions before generating
- Acceptance: "Design a payment system" correctly infers aws_architecture at level 2 for architect audience.

---

### TASK-GRID-03-02 — Research Agent with RAG

**File:** packages/grid-agents/src/agents/researchAgent.ts

- Subtask: Query Aurora grid_embeddings for similar past diagrams
- Subtask: Query Aurora content table for relevant articles (ADRs, patterns)
- Subtask: Return top 3 similar Grid-IR documents as few-shot examples
- Subtask: Generate embedding for new prompt using Bedrock Titan
- Acceptance: "Design a banking API" retrieves past banking architecture diagrams as context.

---

### TASK-GRID-03-03 — Compliance Agent

**File:** packages/grid-agents/src/agents/complianceAgent.ts

- Subtask: Checks Grid-IR against compliance rules: PCI-DSS, BSP, GDPR
- Subtask: Adds compliance annotations to Grid-IR nodes and zones
- Subtask: Flags potential violations as warnings in the prompt panel
- Subtask: Compliance rules defined in src/compliance/rules.ts as data, not hardcoded
- Acceptance: Grid-IR for a payment system automatically gets PCI-DSS zone annotations.

---

### TASK-GRID-03-04 — Presentation Mode with Polly

**File:** packages/grid-renderer/src/components/PresentationMode.tsx

- Subtask: Presentation Mode button in DiagramToolbar
- Subtask: On activate: Bedrock generates narration script from Grid-IR
- Subtask: Narration posted to /api/audio/generate (existing Polly integration)
- Subtask: Audio plays while D3 highlights nodes in sequence
- Subtask: Node highlight sequence derived from topological sort of Grid-IR edges
- Acceptance: Clicking Present plays audio narration while diagram components highlight in logical order.

---

### TASK-GRID-03-05 — Failure mode simulation

**File:** packages/grid-renderer/src/components/FailureSimulator.tsx

- Subtask: Right-click any node → context menu with "Simulate Failure" option
- Subtask: On click: run graph traversal to find all downstream-dependent nodes
- Subtask: Mark failed node red, dependent edges red, downstream nodes yellow
- Subtask: Show blast radius count: "3 services affected"
- Subtask: Panel shows affected services list with their dependencies
- Subtask: Reset button restores normal diagram state
- Acceptance: Right-clicking a database node and selecting Simulate Failure shows all services that depend on it highlighted in red/yellow.

---

## EPIC-GRID-04 — Advanced Visualisation (Sprint 4, July-August)

**Goal:** Manim videos, Graphviz layout, 3D view

---

### TASK-GRID-04-01 — Manim animated explainer videos

**File:** packages/grid-agents/src/agents/manimAgent.ts + AWS Batch job

- Subtask: Manim agent converts Grid-IR to Python Manim script
- Subtask: Script submitted to AWS Batch as a Docker job
- Subtask: Docker image: python:3.11 + manim + chiselgrid-manim-lib
- Subtask: Output MP4 stored in S3 at /grid/videos/{tenantId}/{diagramId}.mp4
- Subtask: Progress polling via status endpoint
- Subtask: Video embedded in DiagramCanvas when available
- Acceptance: Generating an explainer for a Kubernetes deployment architecture produces a 30-60 second narrated Manim video within 3 minutes.

---

### TASK-GRID-04-02 — Graphviz WASM layout engine

**File:** packages/grid-renderer/src/layout/graphvizLayout.ts

- Subtask: Install @hpcc-js/wasm
- Subtask: graphvizLayout(gridIR) returns Grid-IR with optimal node positions
- Subtask: Run in Web Worker to avoid blocking main thread
- Subtask: Fall back to React Flow auto-layout if WASM fails to load
- Acceptance: 100-node diagram auto-lays out with minimal edge crossings in under 2 seconds.

---

## EPIC-GRID-05 — Fine-tuning and Collaboration (Sprint 5, September+)

**Goal:** Fine-tuned model, pattern library, real-time multi-user editing

---

### TASK-GRID-05-01 — Training data collection

- Subtask: Admin tool to mark any diagram as "training approved"
- Subtask: Approved diagrams stored in grid_training_data table
- Subtask: Export tool: dumps (prompt, gridIR) pairs as JSONL for fine-tuning
- Subtask: Target: 1000 approved pairs before initiating fine-tuning

---

### TASK-GRID-05-02 — SageMaker fine-tuning pipeline

- Subtask: SageMaker training job definition for Mistral 7B on grid task
- Subtask: Training data pipeline from Aurora to S3 in JSONL format
- Subtask: Model evaluation: compare fine-tuned vs base Claude on 50 test prompts
- Subtask: Deploy fine-tuned model as SageMaker endpoint in ap-southeast-1

---

### TASK-GRID-05-03 — Real-time collaborative editing

- Subtask: WebSocket endpoint via API Gateway for diagram collaboration
- Subtask: Operational transform or CRDT for concurrent Grid-IR edits
- Subtask: Presence indicators: show other users' cursors on canvas
- Subtask: Change history: every edit creates a diff stored in Aurora

---

## Acceptance Criteria Summary by Sprint

| Sprint | Key Deliverable | Done When |
|--------|----------------|-----------|
| S1 | Text → diagram | Prompt produces renderable React Flow diagram |
| S2 | Animated + multi-modal | Moving dots on edges, voice input works |
| S3 | Full pipeline | All 5 agents active, Polly presentation mode |
| S4 | Advanced viz | Manim videos, Graphviz layout, 3D view |
| S5 | Fine-tuned | Org-specific model, real-time collaboration |

---

*Last updated: April 2026*
*See GRID.md for architecture overview and design decisions.*
