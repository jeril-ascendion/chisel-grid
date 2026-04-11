import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  jsonb,
  text,
  boolean,
  index,
  unique,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ─── studio_workspaces ─────────────────────────────────────────
export const studioWorkspaces = pgTable(
  'studio_workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    ownerId: uuid('owner_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    domain: varchar('domain', { length: 255 }),
    jurisdictionTags: jsonb('jurisdiction_tags').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_studio_workspaces_tenant').on(table.tenantId),
  }),
);

// ─── studio_workspace_collaborators ────────────────────────────
export const studioWorkspaceCollaborators = pgTable(
  'studio_workspace_collaborators',
  {
    workspaceId: uuid('workspace_id').notNull().references(() => studioWorkspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: varchar('role', { length: 20 }).notNull().$type<'viewer' | 'editor'>(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workspaceId, table.userId] }),
  }),
);

// ─── studio_grids ──────────────────────────────────────────────
export const studioGrids = pgTable(
  'studio_grids',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull().references(() => studioWorkspaces.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    clientName: varchar('client_name', { length: 255 }),
    clientIndustry: varchar('client_industry', { length: 255 }),
    projectType: varchar('project_type', { length: 50 }),
    description: text('description'),
    contextTags: jsonb('context_tags').$type<{ compliance: string[]; jurisdiction: string[]; cloud: string[] }>(),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_studio_grids_tenant').on(table.tenantId),
    workspaceIdx: index('idx_studio_grids_workspace').on(table.workspaceId),
    statusIdx: index('idx_studio_grids_status').on(table.status),
  }),
);

// ─── studio_sessions ───────────────────────────────────────────
export const studioSessions = pgTable(
  'studio_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gridId: uuid('grid_id').notNull().references(() => studioGrids.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    kbVersion: varchar('kb_version', { length: 50 }),
    schemaVersion: varchar('schema_version', { length: 20 }),
    turnCount: integer('turn_count').notNull().default(0),
    criticalityTier: integer('criticality_tier').notNull().default(4),
    intentType: varchar('intent_type', { length: 50 }),
    domain: varchar('domain', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('active')
      .$type<'active' | 'generating' | 'awaiting_human_gate' | 'completed' | 'archived'>(),
    blackboard: jsonb('blackboard').notNull(),
    blackboardToon: text('blackboard_toon'),
    blackboardHash: varchar('blackboard_hash', { length: 64 }),
    hasPendingHumanGates: boolean('has_pending_human_gates').notNull().default(false),
    generationBlocked: boolean('generation_blocked').notNull().default(false),
    lastAgentRunAt: timestamp('last_agent_run_at', { withTimezone: true }),
    lastUserActionAt: timestamp('last_user_action_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('idx_studio_sessions_tenant').on(table.tenantId),
    gridIdx: index('idx_studio_sessions_grid').on(table.gridId),
    statusIdx: index('idx_studio_sessions_status').on(table.status),
    criticalityIdx: index('idx_studio_sessions_criticality').on(table.criticalityTier),
  }),
);

// ─── studio_session_turns ──────────────────────────────────────
export const studioSessionTurns = pgTable(
  'studio_session_turns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => studioSessions.id, { onDelete: 'cascade' }),
    turnNumber: integer('turn_number').notNull(),
    role: varchar('role', { length: 20 }).notNull().$type<'user' | 'assistant' | 'agent'>(),
    agentId: varchar('agent_id', { length: 50 }),
    content: text('content').notNull(),
    changedSections: jsonb('changed_sections').$type<string[]>(),
    bedrockTokensUsed: integer('bedrock_tokens_used'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('idx_studio_turns_session').on(table.sessionId),
    uniqueTurn: unique('uq_studio_turns_session_number').on(table.sessionId, table.turnNumber),
  }),
);

// ─── studio_blackboard_snapshots ───────────────────────────────
export const studioBlackboardSnapshots = pgTable(
  'studio_blackboard_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => studioSessions.id, { onDelete: 'cascade' }),
    turnNumber: integer('turn_number').notNull(),
    triggeringAgent: varchar('triggering_agent', { length: 50 }),
    blackboardSnapshot: jsonb('blackboard_snapshot').notNull(),
    readinessScore: integer('readiness_score'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('idx_studio_snapshots_session').on(table.sessionId),
  }),
);

// ─── studio_amendments ─────────────────────────────────────────
export const studioAmendments = pgTable(
  'studio_amendments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => studioSessions.id, { onDelete: 'cascade' }),
    turnNumber: integer('turn_number').notNull(),
    agentId: varchar('agent_id', { length: 50 }),
    userId: uuid('user_id'),
    sectionPath: varchar('section_path', { length: 255 }).notNull(),
    operation: varchar('operation', { length: 50 }).notNull(),
    beforeSummary: text('before_summary'),
    afterSummary: text('after_summary'),
    rationale: text('rationale'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('idx_studio_amendments_session').on(table.sessionId),
  }),
);

// ─── studio_audit_trail ────────────────────────────────────────
export const studioAuditTrail = pgTable(
  'studio_audit_trail',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => studioSessions.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    turnNumber: integer('turn_number').notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    actorType: varchar('actor_type', { length: 20 }).notNull().$type<'user' | 'agent' | 'system'>(),
    actorId: varchar('actor_id', { length: 255 }).notNull(),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('idx_studio_audit_session').on(table.sessionId),
    tenantIdx: index('idx_studio_audit_tenant').on(table.tenantId),
  }),
);

// ─── studio_adrs ───────────────────────────────────────────────
export const studioAdrs = pgTable(
  'studio_adrs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => studioSessions.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    adrNumber: integer('adr_number').notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().$type<'proposed' | 'accepted' | 'superseded' | 'deprecated'>(),
    domain: varchar('domain', { length: 255 }),
    contentMd: text('content_md'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('idx_studio_adrs_session').on(table.sessionId),
    tenantIdx: index('idx_studio_adrs_tenant').on(table.tenantId),
  }),
);

// ─── studio_artifacts ──────────────────────────────────────────
export const studioArtifacts = pgTable(
  'studio_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => studioSessions.id, { onDelete: 'cascade' }),
    gridId: uuid('grid_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    artifactType: varchar('artifact_type', { length: 100 }).notNull(),
    version: integer('version').notNull(),
    s3Bucket: varchar('s3_bucket', { length: 255 }),
    s3Key: varchar('s3_key', { length: 1024 }),
    fileSizeBytes: integer('file_size_bytes'),
    exportConfig: jsonb('export_config'),
    exportedBy: uuid('exported_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index('idx_studio_artifacts_session').on(table.sessionId),
    tenantIdx: index('idx_studio_artifacts_tenant').on(table.tenantId),
  }),
);

// ─── studio_knowledge_nodes ────────────────────────────────────
export const studioKnowledgeNodes = pgTable(
  'studio_knowledge_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    nodeType: varchar('node_type', { length: 100 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    contentMd: text('content_md'),
    aiSummary: text('ai_summary'),
    domain: varchar('domain', { length: 255 }),
    criticalityTier: integer('criticality_tier'),
    complianceTags: jsonb('compliance_tags').$type<string[]>().default([]),
    cloudPlatforms: jsonb('cloud_platforms').$type<string[]>().default([]),
    referenceCount: integer('reference_count').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_studio_knowledge_nodes_tenant').on(table.tenantId),
  }),
);

// ─── studio_knowledge_edges ────────────────────────────────────
export const studioKnowledgeEdges = pgTable(
  'studio_knowledge_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    fromNodeId: uuid('from_node_id').notNull().references(() => studioKnowledgeNodes.id, { onDelete: 'cascade' }),
    toNodeId: uuid('to_node_id').notNull().references(() => studioKnowledgeNodes.id, { onDelete: 'cascade' }),
    relationship: varchar('relationship', { length: 100 }).notNull(),
    weight: integer('weight').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_studio_knowledge_edges_tenant').on(table.tenantId),
  }),
);

// ─── studio_knowledge_gap_log ──────────────────────────────────
export const studioKnowledgeGapLog = pgTable(
  'studio_knowledge_gap_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    sessionId: uuid('session_id'),
    searchQuery: text('search_query'),
    domain: varchar('domain', { length: 255 }),
    maxSimilarityFound: integer('max_similarity_found'),
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_studio_knowledge_gap_log_tenant').on(table.tenantId),
  }),
);

// ─── studio_human_gates ────────────────────────────────────────
export const studioHumanGates = pgTable(
  'studio_human_gates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => studioSessions.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    triggeredByAgent: varchar('triggered_by_agent', { length: 50 }).notNull(),
    description: text('description').notNull(),
    contextJson: jsonb('context_json'),
    status: varchar('status', { length: 20 }).notNull().default('pending')
      .$type<'pending' | 'approved' | 'rejected'>(),
    reviewedBy: uuid('reviewed_by'),
    reviewNotes: text('review_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    sessionIdx: index('idx_studio_human_gates_session').on(table.sessionId),
    tenantIdx: index('idx_studio_human_gates_tenant').on(table.tenantId),
    statusIdx: index('idx_studio_human_gates_status').on(table.status),
  }),
);
