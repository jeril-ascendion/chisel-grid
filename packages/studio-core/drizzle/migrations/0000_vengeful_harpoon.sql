CREATE TABLE IF NOT EXISTS "studio_adrs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adr_number" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"status" varchar(20) NOT NULL,
	"domain" varchar(255),
	"content_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"turn_number" integer NOT NULL,
	"agent_id" varchar(50),
	"user_id" uuid,
	"section_path" varchar(255) NOT NULL,
	"operation" varchar(50) NOT NULL,
	"before_summary" text,
	"after_summary" text,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"grid_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"artifact_type" varchar(100) NOT NULL,
	"version" integer NOT NULL,
	"s3_bucket" varchar(255),
	"s3_key" varchar(1024),
	"file_size_bytes" integer,
	"export_config" jsonb,
	"exported_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_audit_trail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"turn_number" integer NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_blackboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"turn_number" integer NOT NULL,
	"triggering_agent" varchar(50),
	"blackboard_snapshot" jsonb NOT NULL,
	"readiness_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_grids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"client_name" varchar(255),
	"client_industry" varchar(255),
	"project_type" varchar(50),
	"description" text,
	"context_tags" jsonb,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_human_gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"triggered_by_agent" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"context_json" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_knowledge_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_node_id" uuid NOT NULL,
	"to_node_id" uuid NOT NULL,
	"relationship" varchar(100) NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_knowledge_gap_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid,
	"search_query" text,
	"domain" varchar(255),
	"max_similarity_found" integer,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_knowledge_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"node_type" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"content_md" text,
	"ai_summary" text,
	"domain" varchar(255),
	"criticality_tier" integer,
	"compliance_tags" jsonb DEFAULT '[]'::jsonb,
	"cloud_platforms" jsonb DEFAULT '[]'::jsonb,
	"reference_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_session_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"turn_number" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"agent_id" varchar(50),
	"content" text NOT NULL,
	"changed_sections" jsonb,
	"bedrock_tokens_used" integer,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_studio_turns_session_number" UNIQUE("session_id","turn_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grid_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"kb_version" varchar(50),
	"schema_version" varchar(20),
	"turn_count" integer DEFAULT 0 NOT NULL,
	"criticality_tier" integer DEFAULT 4 NOT NULL,
	"intent_type" varchar(50),
	"domain" varchar(255),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"blackboard" jsonb NOT NULL,
	"blackboard_toon" text,
	"blackboard_hash" varchar(64),
	"has_pending_human_gates" boolean DEFAULT false NOT NULL,
	"generation_blocked" boolean DEFAULT false NOT NULL,
	"last_agent_run_at" timestamp with time zone,
	"last_user_action_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_workspace_collaborators" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_workspace_collaborators_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"domain" varchar(255),
	"jurisdiction_tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_adrs" ADD CONSTRAINT "studio_adrs_session_id_studio_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_amendments" ADD CONSTRAINT "studio_amendments_session_id_studio_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_artifacts" ADD CONSTRAINT "studio_artifacts_session_id_studio_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_audit_trail" ADD CONSTRAINT "studio_audit_trail_session_id_studio_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_blackboard_snapshots" ADD CONSTRAINT "studio_blackboard_snapshots_session_id_studio_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_grids" ADD CONSTRAINT "studio_grids_workspace_id_studio_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."studio_workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_human_gates" ADD CONSTRAINT "studio_human_gates_session_id_studio_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_knowledge_edges" ADD CONSTRAINT "studio_knowledge_edges_from_node_id_studio_knowledge_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."studio_knowledge_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_knowledge_edges" ADD CONSTRAINT "studio_knowledge_edges_to_node_id_studio_knowledge_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."studio_knowledge_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_session_turns" ADD CONSTRAINT "studio_session_turns_session_id_studio_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_sessions" ADD CONSTRAINT "studio_sessions_grid_id_studio_grids_id_fk" FOREIGN KEY ("grid_id") REFERENCES "public"."studio_grids"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_workspace_collaborators" ADD CONSTRAINT "studio_workspace_collaborators_workspace_id_studio_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."studio_workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_adrs_session" ON "studio_adrs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_adrs_tenant" ON "studio_adrs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_amendments_session" ON "studio_amendments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_artifacts_session" ON "studio_artifacts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_artifacts_tenant" ON "studio_artifacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_audit_session" ON "studio_audit_trail" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_audit_tenant" ON "studio_audit_trail" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_snapshots_session" ON "studio_blackboard_snapshots" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_grids_tenant" ON "studio_grids" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_grids_workspace" ON "studio_grids" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_grids_status" ON "studio_grids" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_human_gates_session" ON "studio_human_gates" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_human_gates_tenant" ON "studio_human_gates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_human_gates_status" ON "studio_human_gates" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_knowledge_edges_tenant" ON "studio_knowledge_edges" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_knowledge_gap_log_tenant" ON "studio_knowledge_gap_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_knowledge_nodes_tenant" ON "studio_knowledge_nodes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_turns_session" ON "studio_session_turns" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_sessions_tenant" ON "studio_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_sessions_grid" ON "studio_sessions" USING btree ("grid_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_sessions_status" ON "studio_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_sessions_criticality" ON "studio_sessions" USING btree ("criticality_tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_studio_workspaces_tenant" ON "studio_workspaces" USING btree ("tenant_id");