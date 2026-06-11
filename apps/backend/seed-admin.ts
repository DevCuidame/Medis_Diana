import crypto from 'node:crypto';
import { pool } from './src/config/database.js';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 310_000, 32, 'sha256')
    .toString('hex');
  return `${salt}:${hash}`;
}

async function seedAdmin() {
  const email = 'admin@medis.com';
  const password = 'Medis2026*';

  try {
    const passwordHash = hashPassword(password);

    await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [email, passwordHash, 'Medis', 'Admin', 'ADMIN']
    );

    console.log('✅ Admin user created/verified successfully!');
    console.log('--------------------------------------------------');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('Role:     ADMIN');
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error('❌ Failed to seed admin user:', err);
  } finally {
    await pool.end();
  }
}

seedAdmin();
