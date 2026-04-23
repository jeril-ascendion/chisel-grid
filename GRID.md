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

*Last updated: April 2026*
*Owner: Jeril Panicker, Solutions Architect, Ascendion Digital Services Philippines*
