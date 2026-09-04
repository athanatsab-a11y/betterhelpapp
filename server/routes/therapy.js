import { Router } from 'express';
import crypto from 'node:crypto';
import { db, notify } from '../db.js';
import { requireAuth } from '../auth.js';
import { broadcastToRoom } from '../realtime.js';

const router = Router();

function roomAccess(user, roomId) {
  const row = db.prepare(`
    SELECT r.id AS room_id, m.id AS match_id, m.client_id, m.status,
           t.id AS therapist_id, t.user_id AS therapist_user_id,
           cu.display_name AS client_name, cu.nickname AS client_nickname,
           tu.display_name AS therapist_name, t.photo AS therapist_photo, t.credentials
    FROM rooms r
    JOIN matches m ON m.id = r.match_id
    JOIN therapists t ON t.id = m.therapist_id
    JOIN users cu ON cu.id = m.client_id
    JOIN users tu ON tu.id = t.user_id
    WHERE r.id = ?
  `).get(roomId);
  if (!row) return null;
  if (row.client_id !== user.id && row.therapist_user_id !== user.id && user.role !== 'admin') return null;
  return row;
}

router.get('/rooms', requireAuth, (req, res) => {
  const rows = req.user.role === 'therapist'
    ? db.prepare(`
        SELECT r.id AS room_id, m.id AS match_id, m.status, u.display_name AS title, u.nickname,
               (SELECT body FROM messages WHERE room_id = r.id ORDER BY id DESC LIMIT 1) AS last_message,
               (SELECT created_at FROM messages WHERE room_id = r.id ORDER BY id DESC LIMIT 1) AS last_at,
               (SELECT COUNT(*) FROM messages WHERE room_id = r.id AND read_at IS NULL AND sender_id != ?) AS unread
        FROM rooms r JOIN matches m ON m.id = r.match_id
        JOIN therapists t ON t.id = m.therapist_id
        JOIN users u ON u.id = m.client_id
        WHERE t.user_id = ? AND m.status = 'active'
        ORDER BY last_at DESC
      `).all(req.user.id, req.user.id)
    : db.prepare(`
        SELECT r.id AS room_id, m.id AS match_id, m.status, u.display_name AS title, t.photo,
               (SELECT body FROM messages WHERE room_id = r.id ORDER BY id DESC LIMIT 1) AS last_message,
               (SELECT created_at FROM messages WHERE room_id = r.id ORDER BY id DESC LIMIT 1) AS last_at,
               (SELECT COUNT(*) FROM messages WHERE room_id = r.id AND read_at IS NULL AND sender_id != ?) AS unread
        FROM rooms r JOIN matches m ON m.id = r.match_id
        JOIN therapists t ON t.id = m.therapist_id
        JOIN users u ON u.id = t.user_id
        WHERE m.client_id = ?
        ORDER BY m.status = 'active' DESC, last_at DESC
      `).all(req.user.id, req.user.id);
  res.json({ rooms: rows });
});

router.get('/rooms/:id/messages', requireAuth, (req, res) => {
  const room = roomAccess(req.user, req.params.id);
  if (!room) return res.status(404).json({ error: 'Το δωμάτιο δεν βρέθηκε' });
  const before = req.query.before ? Number(req.query.before) : Number.MAX_SAFE_INTEGER;
  const messages = db.prepare(`
    SELECT m.*, u.display_name AS sender_name, u.role AS sender_role
    FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE m.room_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT 50
  `).all(room.room_id, before).reverse();
  db.prepare("UPDATE messages SET read_at = datetime('now') WHERE room_id = ? AND sender_id != ? AND read_at IS NULL")
    .run(room.room_id, req.user.id);
  res.json({ room, messages });
});

router.post('/rooms/:id/messages', requireAuth, (req, res) => {
  const room = roomAccess(req.user, req.params.id);
  if (!room) return res.status(404).json({ error: 'Το δωμάτιο δεν βρέθηκε' });
  if (room.status !== 'active') return res.status(409).json({ error: 'Το δωμάτιο είναι κλειστό' });
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Το μήνυμα είναι κενό' });
  const info = db.prepare('INSERT INTO messages (room_id, sender_id, body, kind, meta) VALUES (?,?,?,?,?)')
    .run(room.room_id, req.user.id, body, req.body?.kind || 'text', req.body?.meta ? JSON.stringify(req.body.meta) : null);
  const message = db.prepare(`
    SELECT m.*, u.display_name AS sender_name, u.role AS sender_role
    FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?
  `).get(info.lastInsertRowid);

  broadcastToRoom(room.room_id, { type: 'message', room_id: room.room_id, message }, req.user.id);
  const recipient = req.user.id === room.client_id ? room.therapist_user_id : room.client_id;
  notify(recipient, 'Νέο μήνυμα', `${req.user.display_name}: ${body.slice(0, 80)}`, `/room/${room.room_id}`);
  res.status(201).json({ message });
});

/* ---------- Live sessions ---------- */

router.get('/therapists/:id/slots', requireAuth, (req, res) => {
  const slots = db.prepare(`
    SELECT * FROM availability
    WHERE therapist_id = ? AND booked = 0 AND starts_at > datetime('now')
    ORDER BY starts_at LIMIT 60
  `).all(req.params.id);
  res.json({ slots });
});

router.get('/sessions', requireAuth, (req, res) => {
  const rows = req.user.role === 'therapist'
    ? db.prepare(`
        SELECT s.*, u.display_name AS client_name
        FROM sessions s JOIN matches m ON m.id = s.match_id
        JOIN therapists t ON t.id = m.therapist_id
        JOIN users u ON u.id = m.client_id
        WHERE t.user_id = ? ORDER BY s.starts_at
      `).all(req.user.id)
    : db.prepare(`
        SELECT s.*, u.display_name AS therapist_name
        FROM sessions s JOIN matches m ON m.id = s.match_id
        JOIN therapists t ON t.id = m.therapist_id
        JOIN users u ON u.id = t.user_id
        WHERE m.client_id = ? ORDER BY s.starts_at
      `).all(req.user.id);
  res.json({ sessions: rows });
});

router.post('/sessions', requireAuth, (req, res) => {
  const { slot_id } = req.body || {};
  const match = db.prepare("SELECT * FROM matches WHERE client_id = ? AND status='active'").get(req.user.id);
  if (!match) return res.status(409).json({ error: 'Δεν έχεις ενεργό θεραπευτή' });
  const slot = db.prepare('SELECT * FROM availability WHERE id = ? AND booked = 0').get(slot_id);
  if (!slot) return res.status(409).json({ error: 'Το ραντεβού δεν είναι πια διαθέσιμο' });
  if (slot.therapist_id !== match.therapist_id) return res.status(403).json({ error: 'Το ραντεβού ανήκει σε άλλον θεραπευτή' });

  const joinCode = crypto.randomBytes(4).toString('hex');
  const tx = db.transaction(() => {
    db.prepare('UPDATE availability SET booked = 1 WHERE id = ?').run(slot.id);
    const info = db.prepare(
      'INSERT INTO sessions (match_id, slot_id, starts_at, duration_min, modality, join_code) VALUES (?,?,?,?,?,?)'
    ).run(match.id, slot.id, slot.starts_at, slot.duration_min, req.body?.modality || slot.modality, joinCode);
    return db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid);
  });
  const session = tx();
  const therapistUser = db.prepare('SELECT user_id FROM therapists WHERE id = ?').get(match.therapist_id);
  notify(therapistUser.user_id, 'Νέα κράτηση συνεδρίας',
    `${req.user.display_name} έκλεισε συνεδρία στις ${new Date(session.starts_at).toLocaleString('el-GR')}`, '/provider/sessions');
  res.status(201).json({ session });
});

router.patch('/sessions/:id', requireAuth, (req, res) => {
  const s = db.prepare(`
    SELECT s.*, m.client_id, t.user_id AS therapist_user_id
    FROM sessions s JOIN matches m ON m.id = s.match_id JOIN therapists t ON t.id = m.therapist_id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!s || (s.client_id !== req.user.id && s.therapist_user_id !== req.user.id)) {
    return res.status(404).json({ error: 'Η συνεδρία δεν βρέθηκε' });
  }
  const { status, notes } = req.body || {};
  if (status === 'cancelled' && s.slot_id) db.prepare('UPDATE availability SET booked = 0 WHERE id = ?').run(s.slot_id);
  if (status) db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, s.id);
  if (notes !== undefined && s.therapist_user_id === req.user.id) {
    db.prepare('UPDATE sessions SET notes = ? WHERE id = ?').run(notes, s.id);
  }
  res.json({ session: db.prepare('SELECT * FROM sessions WHERE id = ?').get(s.id) });
});

/* ---------- Reviews ---------- */

router.post('/therapists/:id/reviews', requireAuth, (req, res) => {
  const rating = Number(req.body?.rating);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Βαθμολογία 1-5' });
  const t = db.prepare('SELECT * FROM therapists WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Δεν βρέθηκε' });
  db.prepare('INSERT INTO reviews (therapist_id, client_id, rating, body, author_label) VALUES (?,?,?,?,?)')
    .run(t.id, req.user.id, rating, req.body?.body || '', req.user.nickname || 'Ανώνυμο μέλος');
  const agg = db.prepare('SELECT AVG(rating) avg, COUNT(*) c FROM reviews WHERE therapist_id = ?').get(t.id);
  db.prepare('UPDATE therapists SET rating = ?, reviews_count = ? WHERE id = ?')
    .run(Math.round(agg.avg * 10) / 10, agg.c, t.id);
  res.status(201).json({ ok: true, rating: agg.avg, reviews_count: agg.c });
});

/* ---------- Notifications ---------- */

router.get('/notifications', requireAuth, (req, res) => {
  res.json({ notifications: db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(req.user.id) });
});

router.post('/notifications/read', requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").run(req.user.id);
  res.json({ ok: true });
});

export default router;
