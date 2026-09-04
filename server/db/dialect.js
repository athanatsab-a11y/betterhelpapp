// The app's SQL is written once, in SQLite flavour with `?` placeholders.
// This module translates that into Postgres for the Supabase driver, so route
// code never has to know which database it is talking to.

const RELATIVE = /datetime\(\s*'now'\s*,\s*'([+-]?)(\d+)\s+(\w+?)s?'\s*\)/gi;

export function toPostgres(sql) {
  let text = sql
    // datetime('now','+21 days') -> now() + interval '21 days'
    .replace(RELATIVE, (_, sign, n, unit) => `(now() ${sign === '-' ? '-' : '+'} interval '${n} ${unit}')`)
    .replace(/datetime\(\s*'now'\s*\)/gi, 'now()')
    // date(created_at) is used to bucket by day; keep it a plain string
    .replace(/\bdate\((\w+)\)/gi, "to_char($1, 'YYYY-MM-DD')")
    .replace(/\bAUTOINCREMENT\b/gi, '');

  // ? placeholders -> $1, $2, ... (skipping ? inside quoted strings)
  let i = 0;
  let out = '';
  let quote = null;
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
      out += ch;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; out += ch; continue; }
    out += ch === '?' ? `$${++i}` : ch;
  }
  return out;
}

// Postgres returns timestamps as Date objects; the client formats plain ISO
// strings, so normalise every row the same way both drivers do.
export function normalizeRow(row) {
  if (!row) return row;
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) row[k] = v.toISOString();
    else if (typeof v === 'boolean') row[k] = v ? 1 : 0;
  }
  return row;
}
