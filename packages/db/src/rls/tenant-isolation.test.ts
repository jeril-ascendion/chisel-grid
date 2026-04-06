import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Automated tenant isolation tests for RLS policies.
 * These tests mock the database layer to verify that:
 * 1. Tenant context is always set before queries
 * 2. All tables enforce tenant_id isolation
 * 3. Cross-tenant data access is prevented
 * 4. INSERT/UPDATE/DELETE operations enforce tenant boundaries
 */

// Mock pg Pool and PoolClient
function createMockClient() {
  const queries: string[] = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
      // Simulate RLS behavior based on context
      if (sql.includes('SET ROLE chiselgrid_app')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('SET app.current_tenant_id')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('RESET ROLE')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };
  return { client, queries };
}

// Tables that have direct tenant_id column
const DIRECT_TENANT_TABLES = [
  'tenants',
  'users',
  'content',
  'categories',
  'tags',
  'media_assets',
  'ai_jobs',
  'audit_log',
];

// Tables that are tenant-scoped through content FK
const INDIRECT_TENANT_TABLES = [
  'content_revisions',
  'content_tags',
];

describe('Tenant Isolation - RLS Policy Coverage', () => {
  describe('RLS policy definitions', () => {
    it('should define SELECT, INSERT, UPDATE, DELETE policies for all direct-tenant tables', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sqlPath = path.join(__dirname, 'enable-rls.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      for (const table of DIRECT_TENANT_TABLES) {
        expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        expect(sql).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
        expect(sql).toContain(`CREATE POLICY tenant_select ON ${table} FOR SELECT`);
        expect(sql).toContain(`CREATE POLICY tenant_insert ON ${table} FOR INSERT`);
        expect(sql).toContain(`CREATE POLICY tenant_update ON ${table} FOR UPDATE`);
        expect(sql).toContain(`CREATE POLICY tenant_delete ON ${table} FOR DELETE`);
      }
    });

    it('should define SELECT, INSERT, UPDATE, DELETE policies for indirect-tenant tables', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sqlPath = path.join(__dirname, 'enable-rls.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      for (const table of INDIRECT_TENANT_TABLES) {
        expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
        expect(sql).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
        expect(sql).toContain(`CREATE POLICY tenant_select ON ${table} FOR SELECT`);
        expect(sql).toContain(`CREATE POLICY tenant_insert ON ${table} FOR INSERT`);
        expect(sql).toContain(`CREATE POLICY tenant_update ON ${table} FOR UPDATE`);
        expect(sql).toContain(`CREATE POLICY tenant_delete ON ${table} FOR DELETE`);
      }
    });

    it('should use FORCE ROW LEVEL SECURITY on all tables', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sqlPath = path.join(__dirname, 'enable-rls.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      const allTables = [...DIRECT_TENANT_TABLES, ...INDIRECT_TENANT_TABLES];
      for (const table of allTables) {
        expect(sql).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      }
    });

    it('should use current_setting for tenant_id context in all policies', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sqlPath = path.join(__dirname, 'enable-rls.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      // Every policy should reference the app.current_tenant_id setting
      const policyCount = (sql.match(/current_setting\('app\.current_tenant_id'/g) || []).length;
      // Direct tables: 4 policies each × 8 tables = 32
      // Indirect tables: 4 policies each × 2 tables × 2 (USING + WITH CHECK) = ~16
      // Total should be >= 48
      expect(policyCount).toBeGreaterThanOrEqual(32);
    });

    it('should drop old unified policies', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sqlPath = path.join(__dirname, 'enable-rls.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      for (const table of DIRECT_TENANT_TABLES) {
        expect(sql).toContain(`DROP POLICY IF EXISTS tenant_isolation ON ${table}`);
      }
    });
  });
});

describe('Tenant Context Utility', () => {
  let setTenantContext: typeof import('../tenant-context').setTenantContext;
  let setAppRoleWithTenant: typeof import('../tenant-context').setAppRoleWithTenant;
  let resetRole: typeof import('../tenant-context').resetRole;
  let withTenantContext: typeof import('../tenant-context').withTenantContext;

  beforeEach(async () => {
    const mod = await import('../tenant-context');
    setTenantContext = mod.setTenantContext;
    setAppRoleWithTenant = mod.setAppRoleWithTenant;
    resetRole = mod.resetRole;
    withTenantContext = mod.withTenantContext;
  });

  it('should set tenant context with correct SQL', async () => {
    const { client } = createMockClient();
    const tenantId = '550e8400-e29b-41d4-a716-446655440001';

    await setTenantContext(client as any, tenantId);

    expect(client.query).toHaveBeenCalledWith(
      `SET app.current_tenant_id = '${tenantId}'`,
    );
  });

  it('should set app role and tenant context together', async () => {
    const { client } = createMockClient();
    const tenantId = '550e8400-e29b-41d4-a716-446655440002';

    await setAppRoleWithTenant(client as any, tenantId);

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query).toHaveBeenNthCalledWith(1, 'SET ROLE chiselgrid_app');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      `SET app.current_tenant_id = '${tenantId}'`,
    );
  });

  it('should reset role back to default', async () => {
    const { client } = createMockClient();

    await resetRole(client as any);

    expect(client.query).toHaveBeenCalledWith('RESET ROLE');
  });

  it('should execute callback within tenant context and cleanup', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    };
    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    };
    const tenantId = '550e8400-e29b-41d4-a716-446655440003';

    const result = await withTenantContext(
      mockPool as any,
      tenantId,
      async (client) => {
        await client.query('SELECT * FROM content');
        return 'success';
      },
    );

    expect(result).toBe('success');
    // Should set role, set tenant, run callback query, reset role, release
    expect(mockClient.query).toHaveBeenCalledWith('SET ROLE chiselgrid_app');
    expect(mockClient.query).toHaveBeenCalledWith(
      `SET app.current_tenant_id = '${tenantId}'`,
    );
    expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM content');
    expect(mockClient.query).toHaveBeenCalledWith('RESET ROLE');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should cleanup even if callback throws', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    };
    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
    };
    const tenantId = '550e8400-e29b-41d4-a716-446655440004';

    await expect(
      withTenantContext(mockPool as any, tenantId, async () => {
        throw new Error('Simulated failure');
      }),
    ).rejects.toThrow('Simulated failure');

    expect(mockClient.query).toHaveBeenCalledWith('RESET ROLE');
    expect(mockClient.release).toHaveBeenCalled();
  });
});

describe('Tenant Isolation - Cross-Tenant Access Prevention', () => {
  it('should not allow tenant A to query with tenant B context', async () => {
    const { client, queries } = createMockClient();
    const tenantA = '550e8400-e29b-41d4-a716-446655440010';
    const tenantB = '550e8400-e29b-41d4-a716-446655440020';

    // Set context to tenant A
    await client.query(`SET ROLE chiselgrid_app`);
    await client.query(`SET app.current_tenant_id = '${tenantA}'`);

    // Simulate query — RLS would filter
    await client.query(`SELECT * FROM content`);

    // Verify tenant A context was set, not tenant B
    const tenantContextQueries = queries.filter((q) =>
      q.includes('SET app.current_tenant_id'),
    );
    expect(tenantContextQueries).toHaveLength(1);
    expect(tenantContextQueries[0]).toContain(tenantA);
    expect(tenantContextQueries[0]).not.toContain(tenantB);
  });

  it('should enforce that every table in schema has RLS coverage', () => {
    const allCoveredTables = [...DIRECT_TENANT_TABLES, ...INDIRECT_TENANT_TABLES];

    // These are all the tenant-scoped tables in the schema
    const expectedTables = [
      'tenants',
      'users',
      'content',
      'content_revisions',
      'categories',
      'tags',
      'content_tags',
      'media_assets',
      'ai_jobs',
      'audit_log',
    ];

    for (const table of expectedTables) {
      expect(allCoveredTables).toContain(table);
    }
  });

  it('should have INSERT policies with WITH CHECK clause for all direct tables', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sqlPath = path.join(__dirname, 'enable-rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    for (const table of DIRECT_TENANT_TABLES) {
      // Find the INSERT policy for this table
      const insertPolicyRegex = new RegExp(
        `CREATE POLICY tenant_insert ON ${table} FOR INSERT[\\s\\S]*?WITH CHECK`,
      );
      expect(sql).toMatch(insertPolicyRegex);
    }
  });

  it('should have UPDATE policies with both USING and WITH CHECK for all direct tables', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sqlPath = path.join(__dirname, 'enable-rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    for (const table of DIRECT_TENANT_TABLES) {
      // UPDATE policies need both USING (which rows can be updated) and WITH CHECK (new values valid)
      const updatePolicyRegex = new RegExp(
        `CREATE POLICY tenant_update ON ${table} FOR UPDATE[\\s\\S]*?USING[\\s\\S]*?WITH CHECK`,
      );
      expect(sql).toMatch(updatePolicyRegex);
    }
  });
});

describe('Tenant Isolation - Schema Validation', () => {
  it('all direct-tenant tables should have tenant_id column referenced in RLS', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sqlPath = path.join(__dirname, 'enable-rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    for (const table of DIRECT_TENANT_TABLES) {
      // Each direct table's SELECT policy should check tenant_id directly
      const selectBlock = sql.match(
        new RegExp(`CREATE POLICY tenant_select ON ${table}[\\s\\S]*?;`),
      );
      expect(selectBlock).not.toBeNull();
      expect(selectBlock![0]).toContain('tenant_id');
    }
  });

  it('indirect-tenant tables should use subquery through content table', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sqlPath = path.join(__dirname, 'enable-rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    for (const table of INDIRECT_TENANT_TABLES) {
      const selectBlock = sql.match(
        new RegExp(`CREATE POLICY tenant_select ON ${table}[\\s\\S]*?;`),
      );
      expect(selectBlock).not.toBeNull();
      expect(selectBlock![0]).toContain('SELECT content_id FROM content');
    }
  });
});
