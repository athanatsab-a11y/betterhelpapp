import pg from 'pg';
import { toPostgres, normalizeRow } from './dialect.js';

// Supabase Postgres. Use the pooled connection string (port 6543) in
// serverless environments and the direct one (5432) for migrations.
export function createPostgresDriver(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });

  const query = async (client, text, params) => {
    const res = await client.query(toPostgres(text), params);
    res.rows.forEach(normalizeRow);
    return res;
  };

  const wrap = (client) => ({
    kind: 'postgres',
    raw: client,
    async get(text, params = []) { return (await query(client, text, params)).rows[0]; },
    async all(text, params = []) { return (await query(client, text, params)).rows; },
    async run(text, params = []) {
      const res = await query(client, text, params);
      return { changes: res.rowCount, id: res.rows[0]?.id };
    },
    async insert(text, params = []) {
      const withReturning = /returning/i.test(text) ? text : `${text} RETURNING id`;
      return (await query(client, withReturning, params)).rows[0]?.id;
    },
    async exec(text) { await client.query(text); },
    async tx(fn) { return fn(wrap(client)); },
    async close() { /* pooled clients are released by the caller */ },
  });

  const driver = {
    ...wrap(pool),
    kind: 'postgres',
    raw: pool,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(wrap(client));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    async close() { await pool.end(); },
  };
  return driver;
}
