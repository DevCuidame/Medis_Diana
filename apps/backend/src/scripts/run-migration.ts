import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client, Pool } = pg;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 310_000, 32, 'sha256')
    .toString('hex');
  return `${salt}:${hash}`;
}

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  console.log('🔍 Parsing DATABASE_URL...');
  const parsed = new URL(connectionString);
  const user = parsed.username;
  const password = parsed.password;
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const databaseName = parsed.pathname.substring(1);

  // 1. Connect to postgres database to ensure medisdiana_db exists
  console.log(`🔌 Connecting to default 'postgres' database at ${host}:${port}...`);
  const defaultClient = new Client({
    host,
    port: parseInt(port, 10),
    user,
    password,
    database: 'postgres',
  });

  try {
    await defaultClient.connect();
    const dbCheck = await defaultClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`📁 Database "${databaseName}" does not exist. Creating...`);
      // CREATE DATABASE cannot run inside a transaction, so we use default client
      await defaultClient.query(`CREATE DATABASE ${databaseName}`);
      console.log(`✅ Database "${databaseName}" created successfully!`);
    } else {
      console.log(`📁 Database "${databaseName}" already exists.`);
    }
  } catch (err) {
    console.error('❌ Failed to check/create database:', err);
    throw err;
  } finally {
    await defaultClient.end();
  }

  // 2. Establish connection to medisdiana_db
  console.log(`🔌 Connecting to target database "${databaseName}"...`);
  const pool = new Pool({ connectionString });

  try {
    // 3. Run migration 001
    console.log('🔄 Running migration 001 (Users & Auth)...');
    const sql001 = fs.readFileSync(
      path.resolve('migrations', '001_create_users.sql'),
      'utf8'
    );
    await pool.query(sql001);
    console.log('✅ Migration 001 successful!');

    // 4. Run migration 002
    console.log('🔄 Running migration 002 (Disciplines, Classes, Bookings & Ratings)...');
    const sql002 = fs.readFileSync(
      path.resolve('migrations', '002_create_professionals.sql'),
      'utf8'
    );
    await pool.query(sql002);
    console.log('✅ Migration 002 successful!');

    // 4b. Run migration 003
    console.log('🔄 Running migration 003 (Locations & Rooms)...');
    const sql003 = fs.readFileSync(
      path.resolve('migrations', '003_create_locations_and_rooms.sql'),
      'utf8'
    );
    await pool.query(sql003);
    console.log('✅ Migration 003 successful!');

    // 4c. Run migration 004
    console.log('🔄 Running migration 004 (Memberships)...');
    const sql004 = fs.readFileSync(
      path.resolve('migrations', '004_create_memberships.sql'),
      'utf8'
    );
    await pool.query(sql004);
    console.log('✅ Migration 004 successful!');

    // 4d. Run migration 005
    console.log('🔄 Running migration 005 (Service Management)...');
    const sql005 = fs.readFileSync(
      path.resolve('migrations', '005_service_management.sql'),
      'utf8'
    );
    await pool.query(sql005);
    console.log('✅ Migration 005 successful!');

    // 4e. Run migration 006
    console.log('🔄 Running migration 006 (Membership Benefits)...');
    const sql006 = fs.readFileSync(
      path.resolve('migrations', '006_add_membership_benefits.sql'),
      'utf8'
    );
    await pool.query(sql006);
    console.log('✅ Migration 006 successful!');

    // 4f. Run migration 007
    console.log('🔄 Running migration 007 (User Memberships)...');
    const sql007 = fs.readFileSync(
      path.resolve('migrations', '007_user_memberships.sql'),
      'utf8'
    );
    await pool.query(sql007);
    console.log('✅ Migration 007 successful!');

    // 4g. Run migration 008
    console.log('🔄 Running migration 008 (Payment Method)...');
    const sql008 = fs.readFileSync(
      path.resolve('migrations', '008_payment_method.sql'),
      'utf8'
    );
    await pool.query(sql008);
    console.log('✅ Migration 008 successful!');

    // 4h. Run migration 009
    console.log('🔄 Running migration 009 (Benefits Catalog)...');
    const sql009 = fs.readFileSync(
      path.resolve('migrations', '009_benefits_catalog.sql'),
      'utf8'
    );
    await pool.query(sql009);
    console.log('✅ Migration 009 successful!');

    // 4i. Run migration 010
    console.log('🔄 Running migration 010 (Benefit Types)...');
    const sql010 = fs.readFileSync(
      path.resolve('migrations', '010_benefit_types.sql'),
      'utf8'
    );
    await pool.query(sql010);
    console.log('✅ Migration 010 successful!');

    // 4j. Run migration 011
    console.log('🔄 Running migration 011 (Professional Type & Schedules)...');
    const sql011 = fs.readFileSync(
      path.resolve('migrations', '011_professional_type.sql'),
      'utf8'
    );
    await pool.query(sql011);
    console.log('✅ Migration 011 successful!');

    // Run migration 018
    console.log('🔄 Running migration 018 (RIPS Service Catalog)...');
    const sql018 = fs.readFileSync(
      path.resolve('migrations', '018_service_catalog_rips.sql'),
      'utf8'
    );
    await pool.query(sql018);
    console.log('✅ Migration 018 successful!');

    console.log('\n🌟 MIGRATIONS COMPLETE! 🌟');
  } catch (err) {
    console.error('❌ Setup database execution failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

setupDatabase().catch((e) => {
  console.error('Fatal error during setup:', e);
  process.exit(1);
});
