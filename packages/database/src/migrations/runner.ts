import pg from 'pg';

const { Pool } = pg;

interface Migration {
  name: string;
  up: (pool: pg.Pool) => Promise<void>;
  down: (pool: pg.Pool) => Promise<void>;
}

const migrations: Migration[] = [];

export async function runMigrations(connectionString: string) {
  const pool = new Pool({ connectionString });

  try {
    console.log('Running migrations...');

    for (const migration of migrations) {
      console.log(`  ↳ ${migration.name}`);
      await migration.up(pool);
    }

    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
