import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

/**
 * Skeleton for withOrg() - will be fully implemented in M2 with RLS
 * This is a placeholder to ensure the pattern exists before M2 extends it
 */
export async function withOrg<T>(
  orgId: string,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  // In M2, this will:
  // 1. Open a transaction
  // 2. Execute SET LOCAL app.current_org_id = $1
  // 3. Run fn with the transaction
  // 4. Commit/rollback
  // For now, just run without org scoping (M1 has no RLS)
  return fn(db);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
