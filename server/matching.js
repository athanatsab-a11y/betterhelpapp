import { db } from './db.js';
import { scoreTherapists } from '../shared/matching-core.js';

export function rankTherapists(answers = {}, limit = 5) {
  const rows = db.prepare(`
    SELECT t.*, u.display_name, u.timezone,
      (SELECT COUNT(*) FROM matches m WHERE m.therapist_id = t.id AND m.status = 'active') AS active_clients
    FROM therapists t JOIN users u ON u.id = t.user_id
    WHERE t.status = 'approved'
  `).all();
  return scoreTherapists(rows, answers, limit);
}

export function assignTherapist(clientId, therapistId, score = 0, reason = '') {
  const tx = db.transaction(() => {
    const active = db.prepare("SELECT * FROM matches WHERE client_id = ? AND status = 'active'").get(clientId);
    if (active) {
      db.prepare("UPDATE matches SET status='ended', ended_at=datetime('now') WHERE id = ?").run(active.id);
    }
    const info = db.prepare(
      'INSERT INTO matches (client_id, therapist_id, score, reason) VALUES (?,?,?,?)'
    ).run(clientId, therapistId, score, reason);
    const matchId = info.lastInsertRowid;
    db.prepare('INSERT INTO rooms (match_id) VALUES (?)').run(matchId);
    const room = db.prepare('SELECT * FROM rooms WHERE match_id = ?').get(matchId);
    const t = db.prepare('SELECT t.*, u.display_name, u.id AS user_id FROM therapists t JOIN users u ON u.id=t.user_id WHERE t.id = ?').get(therapistId);
    db.prepare('INSERT INTO messages (room_id, sender_id, body, kind) VALUES (?,?,?,?)').run(
      room.id, t.user_id,
      `Γεια σου! Είμαι ο/η ${t.display_name}. Χαίρομαι που ξεκινάμε μαζί. Πες μου με δικά σου λόγια τι σε φέρνει εδώ και τι θα ήθελες να αλλάξει στη ζωή σου.`,
      'text'
    );
    return { matchId, roomId: room.id };
  });
  return tx();
}
