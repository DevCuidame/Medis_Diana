import { pool } from '../config/database.js';
async function run() {
  await pool.query('ALTER TABLE service_catalog ALTER COLUMN modality TYPE TEXT');
  console.log('Column modality altered to TEXT successfully');
  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
