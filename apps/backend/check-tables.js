import pg from 'pg';
const { Client } = pg;
const client = new Client('postgresql://postgres:2309@localhost:5432/medis_dev');
client.connect().then(async () => {
  const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  console.log('Tables:', res.rows.map(r => r.table_name));
  await client.end();
}).catch(console.error);
