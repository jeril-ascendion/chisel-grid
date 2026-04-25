-- @no-transaction
ALTER TYPE "public"."content_type" ADD VALUE IF NOT EXISTS 'adr';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE IF NOT EXISTS 'diagram';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE IF NOT EXISTS 'decision';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE IF NOT EXISTS 'runbook';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE IF NOT EXISTS 'template';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE IF NOT EXISTS 'post_mortem';--> statement-breakpoint
ALTER TYPE "public"."content_type" RENAME VALUE 'standard_doc' TO 'article';--> statement-breakpoint
ALTER TABLE "content" ALTER COLUMN "content_type" SET DEFAULT 'article';
