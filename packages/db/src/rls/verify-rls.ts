import { Pool } from 'pg';

/**
 * Verification script for RLS tenant isolation.
 * Creates two test tenants and verifies they cannot see each other's data.
 * Run after applying migrations and RLS policies.
 */
async function verifyRls() {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const adminPool = new Pool({ connectionString, max: 2 });
  const appPool = new Pool({ connectionString, max: 2 });

  console.log('Verifying RLS tenant isolation...\n');

  try {
    // Create two test tenants using admin connection (bypasses RLS)
    const { rows: [tenant1] } = await adminPool.query<{ tenant_id: string }>(
      `INSERT INTO tenants (name, subdomain, plan)
       VALUES ('RLS Test Tenant A', 'rls-test-a', 'internal')
       ON CONFLICT DO NOTHING
       RETURNING tenant_id`,
    );
    const { rows: [tenant2] } = await adminPool.query<{ tenant_id: string }>(
      `INSERT INTO tenants (name, subdomain, plan)
       VALUES ('RLS Test Tenant B', 'rls-test-b', 'internal')
       ON CONFLICT DO NOTHING
       RETURNING tenant_id`,
    );

    if (!tenant1 || !tenant2) {
      console.log('Test tenants already exist. Cleaning up and retrying...');
      await adminPool.query(`DELETE FROM tenants WHERE subdomain IN ('rls-test-a', 'rls-test-b')`);
      console.log('Run this script again.');
      await adminPool.end();
      await appPool.end();
      return;
    }

    console.log(`Created Tenant A: ${tenant1.tenant_id}`);
    console.log(`Created Tenant B: ${tenant2.tenant_id}`);

    // Use app connection with RLS context for Tenant A
    const clientA = await appPool.connect();
    await clientA.query(`SET ROLE chiselgrid_app`);
    await clientA.query(`SET app.current_tenant_id = '${tenant1.tenant_id}'`);

    // Tenant A should only see itself
    const { rows: tenantsSeenByA } = await clientA.query('SELECT tenant_id, name FROM tenants');
    console.log(`\nTenant A sees ${tenantsSeenByA.length} tenant(s):`);
    for (const t of tenantsSeenByA) {
      console.log(`  - ${t.name} (${t.tenant_id})`);
    }

    const aSeesTenantB = tenantsSeenByA.some(
      (t: { tenant_id: string }) => t.tenant_id === tenant2.tenant_id,
    );
    console.log(
      aSeesTenantB
        ? '  FAIL: Tenant A can see Tenant B!'
        : '  PASS: Tenant A cannot see Tenant B',
    );
    clientA.release();

    // Use app connection with RLS context for Tenant B
    const clientB = await appPool.connect();
    await clientB.query(`SET ROLE chiselgrid_app`);
    await clientB.query(`SET app.current_tenant_id = '${tenant2.tenant_id}'`);

    const { rows: tenantsSeenByB } = await clientB.query('SELECT tenant_id, name FROM tenants');
    console.log(`\nTenant B sees ${tenantsSeenByB.length} tenant(s):`);
    for (const t of tenantsSeenByB) {
      console.log(`  - ${t.name} (${t.tenant_id})`);
    }

    const bSeesTenantA = tenantsSeenByB.some(
      (t: { tenant_id: string }) => t.tenant_id === tenant1.tenant_id,
    );
    console.log(
      bSeesTenantA
        ? '  FAIL: Tenant B can see Tenant A!'
        : '  PASS: Tenant B cannot see Tenant A',
    );
    clientB.release();

    // Cleanup test tenants
    await adminPool.query(`DELETE FROM tenants WHERE subdomain IN ('rls-test-a', 'rls-test-b')`);
    console.log('\nCleaned up test tenants.');

    if (aSeesTenantB || bSeesTenantA) {
      console.error('\nRLS VERIFICATION FAILED — tenant isolation is broken!');
      process.exit(1);
    } else {
      console.log('\nRLS VERIFICATION PASSED — tenant isolation is working correctly.');
    }
  } finally {
    await adminPool.end();
    await appPool.end();
  }
}

verifyRls().catch((err) => {
  console.error('RLS verification failed:', err);
  process.exit(1);
});
