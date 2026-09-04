import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local development and the test suite run on SQLite so the app boots with no
// external service. Production points DATABASE_URL at Supabase Postgres.
export function createSqliteDriver() {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'mindbridge.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const stmt = (text) => db.prepare(text);

  const driver = {
    kind: 'sqlite',
    raw: db,
    async get(text, params = []) { return stmt(text).get(...params); },
    async all(text, params = []) { return stmt(text).all(...params); },
    async run(text, params = []) {
      const info = stmt(text).run(...params);
      return { changes: info.changes, id: info.lastInsertRowid };
    },
    async insert(text, params = []) { return stmt(text).run(...params).lastInsertRowid; },
    async exec(text) { db.exec(text); },
    async tx(fn) {
      db.exec('BEGIN');
      try {
        const result = await fn(driver);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    async close() { db.close(); },
  };
  return driver;
}
