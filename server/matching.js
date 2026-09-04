import { sql } from './db/index.js';
import { scoreTherapists } from '../shared/matching-core.js';

export async function rankTherapists(answers = {}, limit = 5) {
  const rows = await sql.all(`
    SELECT t.*, u.display_name, u.timezone,
      (SELECT COUNT(*) FROM matches m WHERE m.therapist_id = t.id AND m.status = 'active') AS active_clients
    FROM therapists t JOIN users u ON u.id = t.user_id
    WHERE t.status = 'approved'
  `);
  return scoreTherapists(rows, answers, limit);
}

export async function assignTherapist(clientId, therapistId, score = 0, reason = '') {
  return sql.tx(async (t) => {
    const active = await t.get("SELECT * FROM matches WHERE client_id = ? AND status = 'active'", [clientId]);
    if (active) {
      await t.run("UPDATE matches SET status='ended', ended_at=datetime('now') WHERE id = ?", [active.id]);
    }
    const matchId = await t.insert(
      'INSERT INTO matches (client_id, therapist_id, score, reason) VALUES (?,?,?,?)',
      [clientId, therapistId, score, reason]
    );
    const roomId = await t.insert('INSERT INTO rooms (match_id) VALUES (?)', [matchId]);
    const therapist = await t.get(
      'SELECT t.*, u.display_name, u.id AS user_id FROM therapists t JOIN users u ON u.id=t.user_id WHERE t.id = ?',
      [therapistId]
    );
    await t.run('INSERT INTO messages (room_id, sender_id, body, kind) VALUES (?,?,?,?)', [
      roomId, therapist.user_id,
      `Γεια σου! Είμαι ο/η ${therapist.display_name}. Χαίρομαι που ξεκινάμε μαζί. Πες μου με δικά σου λόγια τι σε φέρνει εδώ και τι θα ήθελες να αλλάξει στη ζωή σου.`,
      'text',
    ]);
    return { matchId, roomId };
  });
}
