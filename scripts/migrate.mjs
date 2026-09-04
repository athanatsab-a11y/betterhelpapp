// Εφαρμόζει τα SQL migrations στη βάση του DATABASE_URL, με απλό μητρώο ώστε
// κάθε αρχείο να τρέχει μία φορά.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import 'dotenv/config';

const dir = path.join(import.meta.dirname, '..', 'supabase', 'migrations');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Λείπει το DATABASE_URL. Δες το .env.example και το docs/supabase.md.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
});
await client.connect();
await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
  )
`);

const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
let count = 0;

for (const file of files) {
  if (applied.has(file)) { console.log(`= ${file} (ήδη εφαρμοσμένο)`); continue; }
  const sqlText = fs.readFileSync(path.join(dir, file), 'utf8');
  try {
    await client.query('BEGIN');
    await client.query(sqlText);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`+ ${file}`);
    count++;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`✗ ${file}: ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

console.log(count ? `${count} migrations εφαρμόστηκαν.` : 'Η βάση ήταν ήδη ενημερωμένη.');
await client.end();
