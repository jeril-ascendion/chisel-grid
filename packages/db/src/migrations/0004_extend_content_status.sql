-- @no-transaction
ALTER TYPE "public"."content_status" ADD VALUE IF NOT EXISTS 'archived';
