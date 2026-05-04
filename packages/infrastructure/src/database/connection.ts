import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export async function setAppCurrentOrganizationId(orgId: string): Promise<void> {
  const client = getPool();
  await client.query('SELECT app.set_current_organization_id($1)', [orgId]);
}

export async function clearCurrentOrganizationId(): Promise<void> {
  const client = getPool();
  await client.query("SELECT set_config('app.current_organization_id', NULL, false)");
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}