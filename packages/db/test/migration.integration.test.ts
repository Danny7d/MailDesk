import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@maildesk/db';

describe('Database Migrations', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    });
    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('T7: Migrations apply to an empty database', async () => {
    await migrate(db, { migrationsFolder: './packages/db/migrations' });
    
    // Verify the skeleton_probe table exists
    const result = await db.execute({
      sql: 'SELECT COUNT(*) FROM skeleton_probe',
    });
    
    expect(result).toBeDefined();
  });

  it('T11: withOrg() opens a transaction and issues SET LOCAL', async () => {
    const { withOrg } = await import('@maildesk/db');
    
    await withOrg('test-org-123', async (tx) => {
      const result = await tx.execute({
        sql: 'SELECT current_setting(\'app.current_org_id\', true) as org_id',
      });
      
      expect(result.rows[0].org_id).toBe('test-org-123');
    });
  });
});
