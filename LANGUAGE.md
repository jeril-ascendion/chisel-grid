# ChiselGrid Ubiquitous Language
# Version: 1.0 — April 26, 2026
# Purpose: Shared vocabulary for humans and AI agents working in ChiselGrid.
# Rule: When this file is updated, related changes must be captured in TECHDEBT.md.

---

## Platform Identity

**ChiselGrid**
The AI-native Engineering Knowledge Platform. A tenant organisational brain where
architectural knowledge is captured as it is created, connected as it accumulates,
validated as it is proposed, and delivered as it is needed.

**Tenant**
An organisation that deploys ChiselGrid as their engineering knowledge platform.
Example: Ascendion deploys ChiselGrid; ascendion.engineering is the tenant portal.

**Outside Portal**
The public-facing landing page accessible without login. Contains engineering news,
articles, whitepapers, case studies, animated designs, audio podcasts, and
tenant-approved content visible to the outside world.

**Inside Portal (Tenant Portal)**
The authenticated workspace accessible only to users with a valid tenant account.
Minimum role: READER. Contains all tenant-proprietary content and Studio features.

---

## Roles

**OUTSIDE**
An unauthenticated visitor. Can read the Outside Portal only.
Cannot access Inside Portal, Studio, or tenant-specific content.

**READER**
An authenticated tenant user with read-only access.
- Can access Inside Portal and all tenant content
- Can use all Studio features: Chamber, Grid, Forge, Knowledge Graph
- Can download outputs from Studio features
- Cannot publish, approve, or manage content
- Cannot access Users, Tenant Settings, or Content Queue admin functions
- Cannot add, update, or delete content taxonomy
- Content created by a Reader is NOT published to the tenant portal or model

**CREATOR**
Everything a READER can do, plus:
- Can create and submit content for review
- Submitted content waits for ADMIN approval before publishing
- Can view their own content's review and approval status

**ADMIN**
Everything CREATOR can do, plus:
- Can add, update, delete users
- Can add, update, delete content taxonomy
- Can review, add review comments, approve, and publish content
- Can manage ChiselGrid releases and upgrades for the tenant
- Has full super-admin privileges across all platform features

---

## Organisational Hierarchy

**Client**
A client that a tenant user is working for.
Example: Union Digital Bank is a Client for Ascendion.
- NOT entered manually by the user in the UI
- Captured automatically from content and logged in the background
- Used for better organisation and knowledge graph segmentation
- A Client can have multiple Projects

**Project**
A specific engagement or initiative for a Client.
Example: "UDB Core Banking Migration 2026"
- NOT entered manually by the user in the UI
- Captured automatically from content and logged in the background
- A Project can have multiple Workspaces, Sessions, Documents, Decisions, Diagrams

**Workspace**
A user-created container that organises all work for a specific scope.
Created by the user BEFORE starting Chamber, Grid, or Forge sessions.
A Workspace belongs to a Project and can contain multiple Sessions.
Provides structure and assists AI agents in maintaining context.

**Session**
A single working conversation or design thread within a Workspace.
Multiple Sessions exist within one Workspace for different trails, tasks,
research threads, and linking trails. Sessions are versioned and persistent.

---

## Studio Features

**Studio (ChiselGrid Studio)**
The full set of features for engineering design work.
Chamber, Grid, Forge, Knowledge Graph, and Estimator work in tandem
with role-specific AI agents to research, review, and design comprehensive
client/project-specific solution designs.
Input is multimodal: text, audio, documents.

**Chamber**
The research, analysis, and collaborative thinking space.
Used for: trade-off analysis, feasibility studies, gap analysis, brainstorming,
human + AI agentic collaboration, content curation.
Chamber sessions inform and feed into Grid and Forge.

**Grid**
The visual design and representation workspace.
Used for: component architecture diagrams, system architecture, process flows,
swim lanes, sequence diagrams, C4 models, data visualisations, animations,
converting raw data into tables and graphs.
Grid outputs feed into Forge documents.

**Forge** (previously: Studio)
The convergence point where Solution Designs are assembled.
Combines outputs from Chamber (research), Grid (visuals), and Knowledge Graph
(verified knowledge) into polished deliverables.
Used for: Solutions Design Documents, RFP Responses, Architecture Review
submissions, technical proposals, client deliverables.
Forge documents are versioned and exportable to Word, PDF, Markdown.

**Knowledge Graph**
Verified, truthful organisational knowledge plotted as a connected graph.
Used for: identifying related data, patterns, internal research and search,
surfacing foundational knowledge, feeding AI agents with organisational context.
Nodes: Articles, Diagrams, Decisions, Sessions.
Edges: Relations between nodes (references, illustrates, created_from, documents).
Node size reflects importance (times_referenced).

**Estimator** (new feature — planned)
Agentic work estimation based on completed solution designs.
Inputs: solution design from Forge, HR data feed (talent, rates, bench capacity),
engagement model configuration.
Outputs: effort estimates, cost projections, timeline breakdowns, resource plans.
Engagement Models: Staff Augmentation, Managed Capacity, Managed Services, etc.
Agentic roles: each agent estimates a different aspect (discovery, development,
testing, hyper-care, post-production support).
Supports multiple versions for scenario comparison and what-if analysis.

---

## Content

**Article**
A published piece of knowledge created when a user is ready to share work.
Articles are versioned: format is <article_name>-v0.0.0.
Subsequent modifications increment the version number.
Articles go through the full content lifecycle before publishing.

**Diagram**
Any visual representation created in Grid.
Types include: component architecture, system architecture, process flows,
swim lanes, sequence diagrams, C4 models, data visualisations.
Diagrams are stored as Grid-IR (structured JSON) and can be exported.

**Decision**
A recorded choice of strategy, tool, approach, or architectural direction.
Created when a significant choice is made during Chamber or Forge sessions.
Decisions are linked to the diagrams and articles they inform.
Decisions are first-class nodes in the Knowledge Graph.

---

## Content Lifecycle

**Draft**
Initial state. Content created but not yet submitted for review.
Visible to the Creator and Admin only.

**Submitted**
Creator has submitted content for Admin review.
Visible to Creator (read-only) and Admin.

**In Review**
Admin is actively reviewing the content.

**Approved**
Admin has approved the content. Ready for publishing.

**Published**
Content is live on the tenant portal. Visible to all roles per their access level.

**Archived**
Content that was published but is no longer current.
Includes deprecated and rejected content for historical reference.

---

## AI Agents

**Role-Specific AI Agent**
An AI agent configured with a specific skill file (SKILL.md) and system prompt
that gives it expertise in a particular domain or function.
Examples: Architect Agent, Adversarial Agent, Domain Expert Agent, Cost Agent.

**Skill File**
A SKILL.md file containing the domain knowledge, rules, and constraints for an
AI agent. Skills are composable and can be combined per request.
Stored in packages/grid-agents/src/skills/.

**Reasoning Trail**
The visible log of an AI agent's decision-making process.
Shown in the right panel of Chamber and Grid workspaces.
Each entry shows: what the agent was thinking, which skills were applied,
timing, and compliance findings.

---

## Technical Terms

**Grid-IR (Grid Intermediate Representation)**
The canonical JSON format for all diagrams in ChiselGrid.
Diagrams are always stored as Grid-IR and rendered from it.
Grid-IR can be exported to React Flow, Excalidraw, Draw.io, Mermaid, PNG.

**TOON (Token Optimised Ontological Notation)**
A compact, lossless representation of knowledge for AI agent communication.
Used to reduce token cost between agents while preserving semantic fidelity.
Example: RequirementsArtefact is TOON for user intent extracted from Chamber.

**Session Persistence**
Sessions are stored server-side in Aurora (work_sessions table) as the
source of truth, with sessionStorage as a fast local cache.
Sessions survive logout, browser refresh, and multi-tab navigation.

**Tenant Brain**
The organisational knowledge graph built from all approved content, diagrams,
decisions, and sessions for a tenant. The accumulated intelligence of the
organisation, searchable and queryable by humans and AI agents.
