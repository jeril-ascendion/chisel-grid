import type { Pool, PoolClient } from 'pg';

/**
 * Sets the tenant context for RLS-enforced queries.
 * Must be called at the beginning of each request/Lambda invocation
 * when using the chiselgrid_app role.
 */
export async function setTenantContext(
  client: PoolClient,
  tenantId: string,
): Promise<void> {
  await client.query(`SET app.current_tenant_id = '${tenantId}'`);
}

/**
 * Sets role to chiselgrid_app and configures tenant context.
 * Use this for application-level queries that should be RLS-enforced.
 */
export async function setAppRoleWithTenant(
  client: PoolClient,
  tenantId: string,
): Promise<void> {
  await client.query('SET ROLE chiselgrid_app');
  await setTenantContext(client, tenantId);
}

/**
 * Resets role back to the session default (admin/superuser).
 * Use after finishing tenant-scoped operations.
 */
export async function resetRole(client: PoolClient): Promise<void> {
  await client.query('RESET ROLE');
}

/**
 * Executes a callback within a tenant-scoped context.
 * Automatically sets and resets the role and tenant context.
 */
export async function withTenantContext<T>(
  pool: Pool,
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await setAppRoleWithTenant(client, tenantId);
    return await callback(client);
  } finally {
    await resetRole(client);
    client.release();
  }
}
