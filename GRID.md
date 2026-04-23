# Grid — Architecture Diagram Intelligence Engine

## What Grid Is

Grid is ChiselGrid's semantic compression engine. It converts architectural
knowledge into interactive, animated visual representations that are:

- Computationally cheaper than text for conveying structure (18-23x token reduction)
- Interactively explorable at multiple abstraction levels
- Directly connected to the architectural decisions that produced them
- Trainable on organisation-specific patterns over time

Grid is not a diagram tool. It is a knowledge compression engine that produces
diagrams as its primary output format.

---

## Grid-IR — The Canonical Intermediate Representation

Every diagram in Grid is produced from and stored as Grid-IR (Grid Intermediate
Representation). This is the most important design decision in Grid.

Grid-IR is a JSON graph of nodes, edges, and annotations.

```json
{
  "version": "1.0",
  "diagram_type": "aws_architecture",
  "abstraction_level": 2,
  "title": "Payment Processing System",
  "nodes": [
    {
      "id": "api-gateway",
      "type": "aws.api_gateway",
      "label": "Payment API",
      "zone": "public",
      "properties": { "protocol": "REST", "auth": "Cognito" },
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "lambda-processor",
      "type": "aws.lambda",
      "label": "Payment Processor",
      "zone": "private",
      "properties": { "runtime": "nodejs20", "timeout": 29 }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "api-gateway",
      "to": "lambda-processor",
      "label": "invoke",
      "data_flow": "payment_request",
      "protocol": "HTTPS",
      "animated": true,
      "latency_ms": 50
    }
  ],
  "zones": [
    { "id": "public", "label": "Public Zone", "color": "#EFF6FF" },
    { "id": "private", "label": "Private Zone", "color": "#F0FDF4" }
  ],
  "annotations": [
    {
      "node": "lambda-processor",
      "type": "compliance",
      "text": "PCI-DSS Zone 1"
    }
  ],
  "metadata": {
    "tenant_id": "ascendion",
    "created_by": "jeril.panicker@ascendion.com",
    "created_at": "2026-04-29T00:00:00Z",
    "tags": ["payment", "serverless", "aws"],
    "abstraction_levels_available": [1, 2, 3]
  }
}
```

### Grid-IR Rules

1. ALL diagram generation produces Grid-IR first. No renderer is called directly.
2. ALL diagram rendering consumes Grid-IR. No renderer accepts raw text.
3. Grid-IR is stored in Aurora table `grid_diagrams` alongside articles.
4. Grid-IR is the TOON representation for architecture in ChiselGrid.
5. Each Grid-IR document is versioned. Edits create new versions, not overwrites.

---

## Token Economy — Why Grid-IR Matters

```
Traditional architecture doc (15,000 words):
  - 45 minutes to read for a human
  - 15,000 tokens for an LLM to process
  - Cost per LLM query: ~$0.045

Grid-IR for the same system (800 tokens):
  - 90 seconds to understand the diagram
  - 800 tokens for an LLM to process
  - Cost per LLM query: ~$0.002
  - Compression ratio: 18.75x cheaper

Grid-IR IS the TOON (Token Optimised Ontological Notation)
representation for architecture in ChiselGrid.
```

---

## System Architecture

```
USER INPUT
(text / voice / image / document)
        |
        v
┌───────────────────┐
│  INTENT AGENT     │  Bedrock Claude Sonnet 4.5
│  Determines:      │  Identifies diagram type,
│  - Diagram type   │  audience, abstraction level,
│  - Audience       │  and missing information
│  - Detail level   │
└────────┬──────────┘
         |
         v
┌───────────────────┐
│  RESEARCH AGENT   │  Bedrock + RAG on ChiselGrid
│  Retrieves:       │  knowledge base. Finds similar
│  - Past diagrams  │  past Grid-IR documents and
│  - Relevant ADRs  │  relevant architectural patterns.
│  - Org patterns   │
└────────┬──────────┘
         |
         v
┌───────────────────┐
│  ARCHITECTURE     │  Bedrock Claude Sonnet 4.5
│  AGENT            │  Core reasoning agent. Produces
│  Produces:        │  Grid-IR JSON from requirements
│  - Grid-IR JSON   │  and research context.
│  - Component list │
│  - Edge list      │
└────────┬──────────┘
         |
         v
┌───────────────────┐
│  COMPLIANCE       │  Bedrock Claude Sonnet 4.5
│  AGENT            │  Validates against regulatory
│  Checks:          │  constraints. Adds compliance
│  - PCI-DSS zones  │  annotations to Grid-IR.
│  - Data residency │  Optional — skipped for
│  - Security bounds│  non-compliance diagrams.
└────────┬──────────┘
         |
         v
┌───────────────────┐
│  LAYOUT AGENT     │  Graphviz WASM (browser-side)
│  Computes:        │  Optimal node positioning.
│  - Node positions │  Minimises edge crossings.
│  - Edge routing   │  Updates Grid-IR x/y coords.
│  - Zone grouping  │
└────────┬──────────┘
         |
         v
┌───────────────────┐
│  REACT FLOW       │  Browser rendering
│  RENDERER         │  Interactive, animated diagram
│  Outputs:         │  from Grid-IR. All animations
│  - Live diagram   │  computed client-side from
│  - Animations     │  Grid-IR edge properties.
│  - Interactions   │
└───────────────────┘
```

---

## Rendering Stack

| Format | Best For | Tool | When Used |
|--------|----------|------|-----------|
| React Flow | Interactive architecture diagrams | react-flow | Primary renderer |
| D3.js | Data flow animations, force layout | d3 | Animation layer |
| Graphviz WASM | Complex graph auto-layout | @hpcc-js/wasm | Layout computation |
| Mermaid.js | Simple quick diagrams, text export | mermaid | Text export only |
| Manim (Python) | Tutorial video generation | AWS Batch + manim | Animated explainers |
| Three.js | 3D spatial architecture views | three | Future: Sprint 4 |
| SVG | Static export, presentations | browser native | Export to PNG/SVG |

---

## Animation Types

### Type 1 — Data Flow Animation (Sprint 2)
Animated dots moving along edges to show data movement.
Direction, speed, and colour encode protocol, latency, and data type.
Implemented with D3.js path animation. Zero API calls at animation time.

### Type 2 — Progressive Disclosure (Sprint 2)
Click any node to expand it to the next abstraction level.
C4 Level 1 → Level 2 → Level 3 on click.
Framer Motion layout animations for smooth expand/collapse.

### Type 3 — Failure Mode Simulation (Sprint 3)
Mark a node as failed. Watch traffic re-route.
Red paths for failed components. Green paths for failover routes.
Pure graph traversal algorithm. No AI needed at simulation time.

### Type 4 — Time-lapse Architecture (Sprint 4)
Scrub a timeline to see how the architecture evolved.
Each Grid-IR version is a snapshot. Interpolation shows change.

### Type 5 — Presentation Mode (Sprint 3)
Diagram self-narrates. Components highlight in sequence.
Amazon Polly reads narration while D3 highlights components.
Uses existing Polly integration in ChiselGrid.

---

## AI Training Stages

### Stage 1 — Prompt Engineering (Current, Zero Cost)
Intelligence lives in the system prompt. No fine-tuning required.
Claude Sonnet 4.5 produces excellent Grid-IR with the right prompts.
See packages/grid-agents/src/prompts/ for all system prompts.

### Stage 2 — RAG on Organisation Patterns (Month 2-3)
Store every approved Grid-IR in Aurora with pgvector embeddings.
Retrieve similar past diagrams as few-shot examples in prompts.
Grid learns Ascendion-specific patterns without training data.

### Stage 3 — Fine-Tuning (Month 6+, After 1000+ Diagrams)
Fine-tune after collecting 1000+ human-approved (diagram, Grid-IR) pairs.
Options: Bedrock fine-tuning, SageMaker + Mistral 7B, or distillation.
Delivers 3x faster generation and org-specific pattern recognition.
Target cost: ~$400 one-time for Bedrock, ~$200 for SageMaker approach.

---

## Modular Package Structure

Grid is implemented as three separate packages in the ChiselGrid monorepo.
This enforces separation and prevents coupling to other platform features.

```
packages/
  grid-ir/          Pure TypeScript. Grid-IR schema, validation, transforms.
                    No React. No AWS. No Next.js. Zero dependencies except zod.

  grid-agents/      AWS Bedrock agent implementations.
                    No React. No Next.js. Depends on grid-ir only.
                    All AI logic lives here and only here.

  grid-renderer/    React components for rendering Grid-IR.
                    Depends on grid-ir only. No direct Bedrock calls.
                    All visual logic lives here and only here.

apps/web/
  src/app/admin/grid/           Next.js pages only. Thin layer.
  src/app/api/admin/grid/       API routes only. Thin layer.
                                Calls grid-agents, returns results.
                                No AI logic in API routes.
```

### Package Dependency Rules
```
grid-ir       → no internal dependencies
grid-agents   → grid-ir only
grid-renderer → grid-ir only
apps/web      → all three packages via workspace imports

FORBIDDEN:
grid-renderer must never import grid-agents (renderer has no AI logic)
grid-agents must never import grid-renderer (agents have no UI logic)
apps/web API routes must never contain AI logic (delegate to grid-agents)
```

---

## Database Schema

```sql
-- Grid diagrams table
CREATE TABLE grid_diagrams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  title         TEXT NOT NULL,
  diagram_type  TEXT NOT NULL,
  grid_ir       JSONB NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  parent_id     UUID REFERENCES grid_diagrams(id),
  created_by    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tags          TEXT[],
  is_template   BOOLEAN NOT NULL DEFAULT FALSE,
  article_id    UUID REFERENCES content(id)
);

-- Grid diagram embeddings for RAG
CREATE TABLE grid_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id    UUID NOT NULL REFERENCES grid_diagrams(id),
  tenant_id     TEXT NOT NULL,
  embedding     vector(1536),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX grid_diagrams_tenant_idx ON grid_diagrams(tenant_id);
CREATE INDEX grid_diagrams_article_idx ON grid_diagrams(article_id);
CREATE INDEX grid_embeddings_vector_idx ON grid_embeddings
  USING ivfflat (embedding vector_cosine_ops);
```

---

## Diagram Types Supported

| Type | Grid-IR Type Key | Description | Sprint |
|------|-----------------|-------------|--------|
| AWS Architecture | aws_architecture | AWS service topology | S1 |
| C4 Context | c4_context | System context (Level 1) | S1 |
| C4 Container | c4_container | Container diagram (Level 2) | S1 |
| Sequence | sequence | Message sequence flows | S2 |
| Flow | flowchart | Process and decision flows | S2 |
| ER Diagram | er_diagram | Data model relationships | S2 |
| C4 Component | c4_component | Component diagram (Level 3) | S3 |
| Network | network_topology | Physical network layout | S3 |
| Timeline | timeline | Roadmap and migration plans | S4 |
| 3D Spatial | spatial_3d | Three.js spatial view | S4 |

---

## Sprint Implementation Plan

### Sprint 1 — Foundation (April 29 MVP)
See ROADMAP.md EPIC-GRID-01 for detailed tasks and acceptance criteria.
Deliverable: Text prompt → Grid-IR → React Flow render → PNG export

### Sprint 2 — Animation and Multi-modal Input (May)
See ROADMAP.md EPIC-GRID-02.
Deliverable: Data flow animations, voice input, image input, 5 diagram types

### Sprint 3 — Agent Pipeline and Presentation Mode (June)
See ROADMAP.md EPIC-GRID-03.
Deliverable: Full 5-agent pipeline, Polly narration, failure simulation

### Sprint 4 — Advanced Visualisation (July-August)
See ROADMAP.md EPIC-GRID-04.
Deliverable: Manim explainer videos, Graphviz WASM, 3D view

### Sprint 5 — Fine-tuning and Collaboration (September+)
See ROADMAP.md EPIC-GRID-05.
Deliverable: Fine-tuned model, pattern library, real-time collaboration

---

## Critical Rules for Grid Development

1. ALL diagram generation produces Grid-IR first. Never render directly from text.
2. grid-renderer must NEVER contain Bedrock calls. All AI is in grid-agents.
3. grid-agents must NEVER contain React components. All UI is in grid-renderer.
4. API routes in apps/web are thin wrappers. No business logic.
5. Every Grid-IR document stored in Aurora is versioned. Edits create new versions.
6. Animation runs client-side from Grid-IR. No API calls at animation time.
7. Admin layout auth guard must be preserved when adding new Grid pages.
8. New Grid pages added to apps/web/src/app/admin/grid/ only.

---

## Diagram Format Library

Grid supports 25+ diagram formats. Every format produces and is stored as
Grid-IR. The `diagram_type` key in Grid-IR determines which renderer path
and which system prompt the Architecture Agent uses.

Formats are grouped by the reasoning purpose they serve. Choosing the right
format is itself an architectural decision — the Intent Agent selects the
format(s) based on user input and audience.

### Structural — What is in the system

Describe the static shape of a system: components, boundaries, deployment.

| Format | Grid-IR Type Key | Describes |
|--------|-----------------|-----------|
| C4 Context | c4_context | System in its environment (L1) |
| C4 Container | c4_container | Deployable units inside the system (L2) |
| C4 Component | c4_component | Internal structure of a container (L3) |
| C4 Code | c4_code | Class/function level (L4, rare) |
| AWS Architecture | aws_architecture | AWS service topology with zones |
| Network Topology | network_topology | Physical or virtual network layout |
| Deployment Diagram | deployment | Artefacts mapped to infrastructure |
| 3D Spatial View | spatial_3d | Three.js spatial arrangement |

### Behavioural — How the system acts over time

Describe runtime dynamics: sequences, state transitions, interactions.

| Format | Grid-IR Type Key | Describes |
|--------|-----------------|-----------|
| Sequence Diagram | sequence | Message exchange across actors |
| State Machine | state_machine | Discrete states and transitions |
| Activity Diagram | activity | Parallel and conditional workflows |
| Use Case Diagram | use_case | Actor-goal relationships |
| User Journey | user_journey | End-to-end experience path |

### Decision — Why the system is shaped this way

Describe reasoning, tradeoffs, and alternatives rejected.

| Format | Grid-IR Type Key | Describes |
|--------|-----------------|-----------|
| Flowchart | flowchart | Process and decision flow |
| Decision Tree | decision_tree | Branching logic with outcomes |
| ADR Graph | adr_graph | Architecture Decision Records as a graph |
| Tradeoff Matrix | tradeoff_matrix | Options scored against criteria |
| Fishbone | fishbone | Root cause decomposition |

### Data — How information is shaped and moves

Describe schemas, data flow, and information topology.

| Format | Grid-IR Type Key | Describes |
|--------|-----------------|-----------|
| ER Diagram | er_diagram | Entities and relationships |
| Data Flow Diagram | data_flow | Data movement between processes |
| Schema Graph | schema_graph | Nested/polymorphic data shapes |
| Event Storming | event_storming | Domain events across bounded contexts |
| Lineage Diagram | lineage | Source-to-sink data lineage |

### Strategic — Where the system is going

Describe plans, rollouts, and organisational alignment.

| Format | Grid-IR Type Key | Describes |
|--------|-----------------|-----------|
| Timeline | timeline | Roadmap and migration plan |
| Wardley Map | wardley_map | Component evolution vs visibility |
| Capability Map | capability_map | Business capabilities with maturity |
| Org Chart | org_chart | Team and reporting structure |
| Value Stream | value_stream | Flow of value through the org |

### Format Selection Rules

1. The Intent Agent picks the format(s). Never hard-code in upstream code.
2. One user intent may require multiple formats rendered as tabs (e.g.
   "design the payment system" → C4 Container + Sequence + ER).
3. When in doubt between two Structural formats, prefer the lower-detail
   one and let Progressive Disclosure reveal more.
4. Strategic formats require a `time_axis` in Grid-IR metadata.
5. Decision formats must link to ADR IDs when available.

---

## Agent Roster

Grid runs 15 specialised agents. Every agent consumes and produces Grid-IR.
Agents are grouped by the concern they own. The pipeline in System
Architecture (Intent → Research → Architecture → Compliance → Layout) is
the default path; specialised agents are invoked conditionally based on
diagram type, tags, or user request.

Each agent entry below documents:

- **Role** — the one responsibility this agent owns
- **Knows** — the domain knowledge in its system prompt and RAG scope
- **Produces** — what it writes into Grid-IR (nodes, edges, annotations, scores)
- **Red lines** — the things it must never do

### Architecture Agents

Core pipeline. Always run for every diagram.

#### 1. Intent Agent
- **Role:** Classify user input into diagram type, audience, and abstraction level.
- **Knows:** The Diagram Format Library. Audience archetypes (exec, architect,
  engineer, auditor). Abstraction levels (C4 L1-L4, AWS L1-L3).
- **Produces:** Grid-IR stub with `diagram_type`, `abstraction_level`,
  `metadata.audience`, and a list of `missing_information` prompts for the user.
- **Red lines:** Never generates nodes or edges. Never calls other agents
  directly. Never assumes; asks the user when input is ambiguous.

#### 2. Research Agent
- **Role:** Retrieve relevant prior Grid-IR, ADRs, and org patterns as context.
- **Knows:** pgvector search over `grid_embeddings`. Tenant's tag taxonomy.
  Ascendion's approved pattern library.
- **Produces:** A `research_context` block attached to Grid-IR metadata
  containing up to 5 similar diagrams and 10 relevant ADR excerpts.
- **Red lines:** Never modifies nodes/edges. Never leaks cross-tenant data.
  Never retrieves more than the token budget allows.

#### 3. Architecture Agent
- **Role:** Produce the core graph — nodes, edges, zones — from intent + research.
- **Knows:** All diagram type schemas. Common component libraries for each type.
  Ascendion reference architectures retrieved by Research Agent.
- **Produces:** Full Grid-IR nodes, edges, zones. Sets `animated: true` on
  edges where data flow is meaningful.
- **Red lines:** Never applies layout (no x/y coords). Never validates
  compliance. Never invents compliance claims — flags unknowns for
  Compliance Agent.

#### 4. Layout Agent
- **Role:** Compute optimal node positions and edge routing.
- **Knows:** Graphviz WASM engines (dot, neato, fdp, sfdp). Zone-aware
  layout heuristics. Grid's preferred node spacing constants.
- **Produces:** `position.x`, `position.y` on every node. `waypoints` on
  edges that need routing hints.
- **Red lines:** Never adds or removes nodes/edges. Never runs in the
  Lambda — always browser-side WASM for latency.

### Pillar Agents

Invoked based on Well-Architected-style pillars when diagram tags include
`review` or the user asks "is this well designed?".

#### 5. Reliability Agent
- **Role:** Identify single points of failure, missing redundancy, blast radius.
- **Knows:** AWS Well-Architected Reliability pillar. Common failure modes
  per AWS service. RTO/RPO patterns.
- **Produces:** `annotations` of type `reliability_gap` on at-risk nodes.
  A `reliability_score` (0-100) in Grid-IR metadata with sub-scores for
  redundancy, failover, and recovery.
- **Red lines:** Never rewrites architecture. Never ships a score without
  evidence pointing to specific node IDs.

#### 6. Performance Agent
- **Role:** Flag latency bottlenecks, N+1 patterns, cold starts, chatty edges.
- **Knows:** Typical latency envelopes per AWS service. Async vs sync tradeoffs.
  Caching topology patterns.
- **Produces:** Edge annotations with `estimated_latency_ms` and
  `bottleneck: true` flags. Performance score in metadata.
- **Red lines:** Never adds hypothetical services ("add Redis here"); only
  flags existing nodes/edges. Recommendations go into annotations, not nodes.

#### 7. Cost Agent
- **Role:** Attach cost estimates and flag expensive patterns.
- **Knows:** AWS pricing for common services in ap-southeast-1. NAT Gateway
  traps. Cross-AZ data transfer costs. Idle-resource smells.
- **Produces:** `annotations` of type `cost` on nodes with
  `estimated_monthly_usd`. A `cost_score` with "cheap / fair / expensive"
  band plus a dollar estimate.
- **Red lines:** Never claims exact figures — always ranges with assumptions
  listed. Never recommends tier downgrades that break reliability.

#### 8. Operational Excellence Agent
- **Role:** Check observability, deployability, and incident readiness.
- **Knows:** CloudWatch, OpenTelemetry, runbooks, CI/CD patterns.
  Ascendion's logging and tracing conventions.
- **Produces:** Annotations for missing logs/metrics/alarms. An
  `ops_readiness_score`.
- **Red lines:** Never assumes a component is unobservable without
  evidence from the input. Stays silent on non-production diagrams.

#### 9. Sustainability Agent
- **Role:** Flag carbon-heavy patterns and suggest Graviton/region choices.
- **Knows:** AWS Customer Carbon Footprint patterns. Graviton coverage.
  Idle-resource carbon cost.
- **Produces:** Annotations of type `sustainability` with `co2_kg_per_month`
  estimates on compute nodes.
- **Red lines:** Never dominates the review — opt-in via tag
  `sustainability_review` or diagram_type `aws_architecture`.

### Compliance Agents

Invoked when tenant profile or user intent includes a regulatory context.

#### 10. Compliance Agent
- **Role:** Validate architecture against applicable regulatory frameworks.
- **Knows:** PCI-DSS zones, HIPAA PHI handling, GDPR data residency,
  SOC 2 controls. Tenant's compliance profile from metadata.
- **Produces:** `annotations` of type `compliance` on every in-scope node
  and edge. A `compliance_score` per applicable framework.
- **Red lines:** Never asserts "compliant" — only "no findings against
  these rules". Always lists which rules were checked.

#### 11. Security Agent
- **Role:** Identify trust boundary violations, exposed secrets paths,
  IAM over-permissions, and missing encryption.
- **Knows:** STRIDE threat modelling. AWS IAM least-privilege patterns.
  Common attack paths per architecture shape.
- **Produces:** Annotations of type `security_finding` with severity
  (critical/high/medium/low) and STRIDE category. A `security_score`.
- **Red lines:** Never produces exploit instructions. Findings describe
  the weakness and the fix class, not a payload.

#### 12. Data Governance Agent
- **Role:** Classify data flowing on each edge and flag residency/retention issues.
- **Knows:** PII, PHI, PCI data classes. Tenant's residency requirements
  (e.g. "no customer data leaves ap-southeast-1").
- **Produces:** `data_class` on every edge carrying user data. Annotations
  for cross-border edges that violate residency rules.
- **Red lines:** Never labels data class without evidence from node
  properties or the user's description.

### Technology-specific Agents

Invoked by `diagram_type` or tags.

#### 13. AWS Specialist Agent
- **Role:** Validate AWS-specific correctness — service limits, integrations,
  supported combinations.
- **Knows:** AWS service quotas, known anti-patterns (e.g. Lambda →
  synchronous Lambda chains), VPC integration gotchas.
- **Produces:** Annotations of type `aws_correctness` and corrections to
  node `properties` where Architecture Agent got a service config wrong.
- **Red lines:** Never fabricates services or limits — if unsure, emits
  a `needs_verification` annotation instead.

#### 14. Data Platform Agent
- **Role:** Validate data-centric diagrams (ER, lineage, event storming,
  schema graphs) for integrity and normalisation.
- **Knows:** Normal forms, CDC patterns, eventual consistency implications,
  pgvector/OpenSearch tradeoffs.
- **Produces:** Annotations for denormalisation smells, missing indexes,
  unbounded growth tables.
- **Red lines:** Only runs for Data-category diagrams. Never edits
  Structural diagram nodes.

#### 15. Presentation Agent
- **Role:** Generate narration script for Presentation Mode (Sprint 3)
  and assemble tab layout when multiple diagrams serve one intent.
- **Knows:** Amazon Polly voice profiles. Audience archetype → tone mapping.
  Story structure (setup → conflict → resolution).
- **Produces:** A `narration` block per node with `order`, `text`, and
  `highlight_edges`. Tab metadata when intent spans multiple diagrams.
- **Red lines:** Never modifies Grid-IR structure. Purely additive.
  Never invents facts not supported by nodes/annotations.

### Agent Invocation Rules

1. The four Architecture Agents always run in sequence.
2. Pillar, Compliance, and Technology agents run in parallel after
   Architecture Agent, before Layout Agent.
3. Every agent writes to Grid-IR annotations or metadata only — never
   modifies nodes/edges owned by Architecture Agent except AWS Specialist.
4. Agent output includes a `confidence` score (0-1). Annotations below
   0.5 are hidden behind a "low confidence" toggle in the renderer.
5. The full agent trace (which agents ran, their costs, their latencies)
   is stored in Grid-IR metadata for observability.

---

## Annotation Layer System

Agents communicate findings to humans through annotations on Grid-IR.
The renderer turns annotations into visual overlays the user can toggle
on and off — a **layer system** that keeps the base diagram clean while
exposing agent reasoning on demand.

### Annotation Types

Every annotation in Grid-IR has a `type`, a target (node, edge, zone, or
diagram-level), a `severity`, a short `text`, and an optional `evidence`
link back to the prompt, ADR, or rule that produced it.

```json
{
  "id": "ann-042",
  "type": "reliability_gap",
  "target_kind": "node",
  "target_id": "lambda-processor",
  "severity": "high",
  "text": "Single Lambda with no reserved concurrency. Cold start penalty on bursts.",
  "agent": "reliability",
  "confidence": 0.82,
  "evidence": { "adr_id": "ADR-017", "rule": "WA-REL-02" }
}
```

#### Node Annotations
Attached to a single node. Render as a coloured badge on the node's corner
(pill with severity colour). Click to expand the full text and evidence.
Used by Reliability, Security, Compliance, Cost, and Sustainability agents.

#### Edge Annotations
Attached to a single edge. Render as a labelled tag on the edge midpoint
(stroke colour shifts to severity colour). Used by Performance (latency),
Data Governance (data class), and Security (unencrypted channels).

#### Zone Annotations
Attached to a `zone` (e.g. "public", "pci-scope", "ap-southeast-1"). Render
as a watermark across the zone's background rectangle. Used for residency,
compliance scope, and blast-radius overlays.

#### Gap Annotations
Attached to a *position* rather than an existing element — "there should
be a cache between these two nodes". Render as a dashed ghost node or edge
with a `+` icon. Clicking offers "add to diagram" which the Architecture
Agent fulfils in a new Grid-IR version.

#### Score Annotations
Diagram-level. Never attached to a specific node. Stored in Grid-IR
`metadata.scores`. Render in the Score Card (see below), not on the canvas.

### Severity Colour System

| Severity | Colour | Hex | Visual |
|----------|--------|-----|--------|
| critical | red | #DC2626 | solid fill, pulse animation |
| high | orange | #EA580C | solid fill |
| medium | amber | #D97706 | solid fill |
| low | blue | #2563EB | outline only |
| info | grey | #6B7280 | outline only |
| positive | green | #16A34A | solid fill (e.g. "redundancy present") |

Severity colours override the default node/edge colours only while the
relevant layer is active. Turning the layer off returns the element to its
base style.

### Layer Toggle UX

The renderer exposes a **Layers panel** (left sidebar, collapsible). Each
layer corresponds to an agent or annotation type. Users toggle layers to
see different facets without recomputing anything.

```
┌─ LAYERS ──────────────────────┐
│ Base                       ON │
│ ─────────────────────────────  │
│ Reliability          3    ON  │
│ Security             1    OFF │
│ Performance          2    ON  │
│ Cost                 —    OFF │
│ Compliance (PCI-DSS) 4    ON  │
│ Sustainability       —    OFF │
│ Data governance      2    OFF │
│ ─────────────────────────────  │
│ Gaps (suggested)     2    OFF │
│ Low confidence       —    OFF │
└───────────────────────────────┘
```

- Number next to each layer = count of annotations in that layer.
- "—" means the agent ran and found nothing (explicit null, not "didn't run").
- Blank means the agent didn't run for this diagram.
- Default layer visibility is set by `diagram_type`: AWS diagrams show
  Reliability, Security, Compliance by default; C4 Context shows none.
- Users can save a layer preset per tenant ("review mode", "exec mode").

### Score Card

Diagram-level scores render in a **Score Card** above the canvas —
never as annotations on nodes. This keeps per-node annotation real estate
for node-specific findings.

```
┌─ SCORE CARD ──────────────────────────────────┐
│ Reliability       72 / 100   ▓▓▓▓▓▓▓░░░       │
│ Performance       85 / 100   ▓▓▓▓▓▓▓▓▓░       │
│ Cost              $240/mo    (fair)           │
│ Security          3 findings (1 high)         │
│ Compliance        PCI-DSS ✓ 4 findings         │
│ Ops Readiness     60 / 100   ▓▓▓▓▓▓░░░░       │
│ Sustainability    18 kg CO₂/mo                │
│                                               │
│ Overall          B+                           │
└───────────────────────────────────────────────┘
```

Score Card rules:

1. One row per agent that ran. No row if the agent didn't run.
2. Overall grade is computed from weighted sub-scores; weights come from
   tenant profile (e.g. healthcare tenants weight Compliance 2x).
3. Clicking a row filters the canvas to that agent's annotations — same
   as toggling every other layer off.
4. Scores are timestamped. Re-running agents produces a new Grid-IR
   version (per versioning rule) with a fresh Score Card.
5. "Trust but verify" footer always present: "Scores are agent estimates.
   Review evidence before acting."

### Rendering Rules for Annotations

1. Annotations are additive. Toggling layers never mutates Grid-IR.
2. The base diagram must remain readable with every layer on —
   if it doesn't, the renderer downgrades annotation visuals (smaller
   badges, muted colours) rather than hiding content.
3. Low-confidence annotations (<0.5) are hidden behind a "Low confidence"
   master toggle to keep the default view trustworthy.
4. Every annotation visual has a keyboard focus state and screen-reader
   label. Accessibility is a rendering rule, not a stretch goal.
5. Exporting to PNG/SVG captures whatever layers are currently on.
   Exporting to Grid-IR JSON always captures everything regardless of UI state.

---

*Last updated: April 2026*
*Owner: Jeril Panicker, Solutions Architect, Ascendion Digital Services Philippines*
