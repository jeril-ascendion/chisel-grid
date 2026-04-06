-- Row-Level Security (RLS) policies for ChiselGrid
-- Enforces tenant isolation on all tenant-scoped tables.
--
-- Usage: Set the current tenant context before queries:
--   SET app.current_tenant_id = '<tenant-uuid>';
--
-- Application code should call this at the start of each request/Lambda invocation.
-- The chiselgrid_admin user (used by Drizzle) bypasses RLS via BYPASSRLS role attribute.

-- Create application role if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chiselgrid_app') THEN
    CREATE ROLE chiselgrid_app NOLOGIN;
  END IF;
END $$;

-- Grant necessary permissions to app role
GRANT USAGE ON SCHEMA public TO chiselgrid_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO chiselgrid_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO chiselgrid_app;

-- ═══════════════════════════════════════════════════════════
-- Enable RLS on all tenant-scoped tables
-- Each table has:
--   1. SELECT policy (USING) — only see own tenant rows
--   2. INSERT policy (WITH CHECK) — can only insert rows for own tenant
--   3. UPDATE policy (USING + WITH CHECK) — can only update own tenant rows
--   4. DELETE policy (USING) — can only delete own tenant rows
-- ═══════════════════════════════════════════════════════════

-- ─── tenants ─────────────────────────────────────────────
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON tenants;
CREATE POLICY tenant_select ON tenants FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_insert ON tenants;
CREATE POLICY tenant_insert ON tenants FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_update ON tenants;
CREATE POLICY tenant_update ON tenants FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_delete ON tenants;
CREATE POLICY tenant_delete ON tenants FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Drop old unified policy if exists
DROP POLICY IF EXISTS tenant_isolation ON tenants;

-- ─── users ───────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON users;
CREATE POLICY tenant_select ON users FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_insert ON users;
CREATE POLICY tenant_insert ON users FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_update ON users;
CREATE POLICY tenant_update ON users FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_delete ON users;
CREATE POLICY tenant_delete ON users FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON users;

-- ─── content ─────────────────────────────────────────────
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON content;
CREATE POLICY tenant_select ON content FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_insert ON content;
CREATE POLICY tenant_insert ON content FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_update ON content;
CREATE POLICY tenant_update ON content FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_delete ON content;
CREATE POLICY tenant_delete ON content FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON content;

-- ─── content_revisions (joined through content) ─────────
ALTER TABLE content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_revisions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON content_revisions;
CREATE POLICY tenant_select ON content_revisions FOR SELECT
  USING (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

DROP POLICY IF EXISTS tenant_insert ON content_revisions;
CREATE POLICY tenant_insert ON content_revisions FOR INSERT
  WITH CHECK (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

DROP POLICY IF EXISTS tenant_update ON content_revisions;
CREATE POLICY tenant_update ON content_revisions FOR UPDATE
  USING (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ))
  WITH CHECK (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

DROP POLICY IF EXISTS tenant_delete ON content_revisions;
CREATE POLICY tenant_delete ON content_revisions FOR DELETE
  USING (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

DROP POLICY IF EXISTS tenant_isolation ON content_revisions;

-- ─── categories ──────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON categories;
CREATE POLICY tenant_select ON categories FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_insert ON categories;
CREATE POLICY tenant_insert ON categories FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_update ON categories;
CREATE POLICY tenant_update ON categories FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_delete ON categories;
CREATE POLICY tenant_delete ON categories FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON categories;

-- ─── tags ────────────────────────────────────────────────
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON tags;
CREATE POLICY tenant_select ON tags FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_insert ON tags;
CREATE POLICY tenant_insert ON tags FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_update ON tags;
CREATE POLICY tenant_update ON tags FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_delete ON tags;
CREATE POLICY tenant_delete ON tags FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON tags;

-- ─── content_tags (joined through content) ───────────────
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON content_tags;
CREATE POLICY tenant_select ON content_tags FOR SELECT
  USING (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

DROP POLICY IF EXISTS tenant_insert ON content_tags;
CREATE POLICY tenant_insert ON content_tags FOR INSERT
  WITH CHECK (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

DROP POLICY IF EXISTS tenant_update ON content_tags;
CREATE POLICY tenant_update ON content_tags FOR UPDATE
  USING (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ))
  WITH CHECK (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

DROP POLICY IF EXISTS tenant_delete ON content_tags;
CREATE POLICY tenant_delete ON content_tags FOR DELETE
  USING (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

DROP POLICY IF EXISTS tenant_isolation ON content_tags;

-- ─── media_assets ────────────────────────────────────────
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON media_assets;
CREATE POLICY tenant_select ON media_assets FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_insert ON media_assets;
CREATE POLICY tenant_insert ON media_assets FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_update ON media_assets;
CREATE POLICY tenant_update ON media_assets FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_delete ON media_assets;
CREATE POLICY tenant_delete ON media_assets FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON media_assets;

-- ─── ai_jobs ─────────────────────────────────────────────
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON ai_jobs;
CREATE POLICY tenant_select ON ai_jobs FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_insert ON ai_jobs;
CREATE POLICY tenant_insert ON ai_jobs FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_update ON ai_jobs;
CREATE POLICY tenant_update ON ai_jobs FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_delete ON ai_jobs;
CREATE POLICY tenant_delete ON ai_jobs FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON ai_jobs;

-- ─── audit_log ───────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select ON audit_log;
CREATE POLICY tenant_select ON audit_log FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_insert ON audit_log;
CREATE POLICY tenant_insert ON audit_log FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_update ON audit_log;
CREATE POLICY tenant_update ON audit_log FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_delete ON audit_log;
CREATE POLICY tenant_delete ON audit_log FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

DROP POLICY IF EXISTS tenant_isolation ON audit_log;
