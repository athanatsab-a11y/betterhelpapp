import 'dotenv/config';
import { createPostgresDriver } from './postgres.js';
import { SQLITE_SCHEMA } from './schema.sqlite.js';

const connectionString = process.env.DATABASE_URL;

// One handle for the whole server. Postgres (Supabase) when DATABASE_URL is
// set, SQLite otherwise — the SQL in the routes is identical either way.
async function createSqlite() {
  try {
    const { createSqliteDriver } = await import('./sqlite.js');
    return createSqliteDriver();
  } catch (err) {
    throw new Error(
      'Δεν βρέθηκε τοπική βάση SQLite (better-sqlite3). Όρισε DATABASE_URL για Postgres ' +
      `ή τρέξε npm install για την τοπική ανάπτυξη. Αιτία: ${err.message}`
    );
  }
}

export const sql = connectionString ? createPostgresDriver(connectionString) : await createSqlite();
export const isPostgres = sql.kind === 'postgres';

export async function initDb() {
  if (isPostgres) {
    // Schema changes live in supabase/migrations and are applied out of band,
    // so a running app never mutates the production schema on boot.
    const { c } = await sql.get('SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?', ['public', 'users']);
    if (Number(c) === 0) {
      throw new Error('Το σχήμα δεν έχει εφαρμοστεί. Τρέξε: npm run db:migrate');
    }
    return;
  }

  sql.raw.exec(SQLITE_SCHEMA);
  ensureColumn('users', 'auth_id', 'TEXT');
  ensureColumn('therapists', 'status', "TEXT NOT NULL DEFAULT 'approved'");
  ensureColumn('therapists', 'applied_at', 'TEXT');
  ensureColumn('therapists', 'reviewed_at', 'TEXT');
  ensureColumn('therapists', 'review_note', 'TEXT');
}

// Adds a column to an existing SQLite database without a migration tool.
function ensureColumn(table, column, definition) {
  const cols = sql.raw.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    sql.raw.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function notify(userId, title, body, link) {
  return sql.run('INSERT INTO notifications (user_id,title,body,link) VALUES (?,?,?,?)',
    [userId, title, body ?? null, link ?? null]);
}
