import { db } from './db.js';

const csv = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

// Scores every accepting therapist against the intake answers and returns
// the ranked list with a human-readable explanation of the match.
export function rankTherapists(answers = {}, limit = 5) {
  const rows = db.prepare(`
    SELECT t.*, u.display_name, u.timezone,
      (SELECT COUNT(*) FROM matches m WHERE m.therapist_id = t.id AND m.status = 'active') AS active_clients
    FROM therapists t JOIN users u ON u.id = t.user_id
  `).all();

  const wanted = answers.topics || [];
  const approaches = answers.approach || [];

  const scored = rows.map((t) => {
    let score = 0;
    const reasons = [];

    const specialties = csv(t.specialties);
    const overlap = wanted.filter((w) => specialties.includes(w));
    if (overlap.length) {
      score += overlap.length * 18;
      reasons.push(`εξειδίκευση σε ${overlap.length} από τα θέματά σου`);
    }

    const tApproaches = csv(t.approaches);
    const aOverlap = approaches.filter((a) => tApproaches.includes(a));
    if (aOverlap.length) {
      score += aOverlap.length * 10;
      reasons.push('θεραπευτική προσέγγιση που ζήτησες');
    }

    const lang = answers.language || 'el';
    if (csv(t.languages).includes(lang)) { score += 15; reasons.push('μιλάει τη γλώσσα σου'); }
    else score -= 40;

    const gPref = answers.therapist_gender || 'any';
    if (gPref !== 'any') {
      if (t.gender === gPref) { score += 14; reasons.push('ταιριάζει με την προτίμηση φύλου'); }
      else score -= 18;
    }

    if (answers.faith === 'yes') {
      if (t.faith_based) { score += 12; reasons.push('προσφέρει θεραπεία με πνευματική διάσταση'); }
      else score -= 10;
    }

    if (wanted.includes('lgbtq') && t.lgbtq_friendly) score += 8;
    if (answers.service === 'couples' && specialties.includes('relationships')) score += 12;
    if (answers.service === 'teen' && specialties.includes('parenting')) score += 8;

    if (answers.urgency === 'now') score += Math.max(0, 12 - t.avg_response_hours);

    score += Math.min(t.years_experience, 20) * 0.8;
    score += (t.rating - 4) * 10;

    const load = t.active_clients / Math.max(t.max_clients, 1);
    score -= load * 25;
    if (!t.accepting_clients || t.active_clients >= t.max_clients) score -= 1000;

    return {
      ...t,
      specialties,
      approaches: tApproaches,
      languages: csv(t.languages),
      score: Math.round(score * 10) / 10,
      reason: reasons.length ? reasons.join(', ') : 'διαθέσιμος/η και με υψηλή αξιολόγηση',
    };
  });

  return scored
    .filter((t) => t.score > -500)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
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
