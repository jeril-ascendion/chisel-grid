DO $$ BEGIN
 CREATE TYPE "public"."subscriber_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscriber_status" AS ENUM('active', 'paused', 'unsubscribed', 'bounced');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."session_kind" AS ENUM('grid', 'chamber', 'studio');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."session_visibility" AS ENUM('private', 'shared_view', 'shared_edit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscribers" (
	"subscriber_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"tenant_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"categories" jsonb DEFAULT '[]' NOT NULL,
	"frequency" "subscriber_frequency" DEFAULT 'weekly' NOT NULL,
	"status" "subscriber_status" DEFAULT 'active' NOT NULL,
	"ses_suppression_reason" varchar(255),
	"confirmed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"kind" "session_kind" NOT NULL,
	"visibility" "session_visibility" DEFAULT 'shared_view' NOT NULL,
	"title" varchar(500),
	"state" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscribers_tenant" ON "subscribers" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscribers_email_tenant" ON "subscribers" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscribers_status" ON "subscribers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscribers_user" ON "subscribers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_sessions_tenant_updated" ON "work_sessions" USING btree ("tenant_id","created_by","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_sessions_visibility" ON "work_sessions" USING btree ("visibility");