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
-- ═══════════════════════════════════════════════════════════

-- tenants table — tenants can only see their own record
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- content
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON content;
CREATE POLICY tenant_isolation ON content
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- content_revisions — joined through content, so we add a policy based on content
ALTER TABLE content_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON content_revisions;
CREATE POLICY tenant_isolation ON content_revisions
  USING (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON categories;
CREATE POLICY tenant_isolation ON categories
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tags;
CREATE POLICY tenant_isolation ON tags
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- content_tags — joined through content
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON content_tags;
CREATE POLICY tenant_isolation ON content_tags
  USING (content_id IN (
    SELECT content_id FROM content
    WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
  ));

-- media_assets
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON media_assets;
CREATE POLICY tenant_isolation ON media_assets
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ai_jobs
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON ai_jobs;
CREATE POLICY tenant_isolation ON ai_jobs
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
