import { Router } from 'express';
import { ah } from './async-handler.js';
import { sql, notify } from '../db/index.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

/* ---------- Journal ---------- */

router.get('/journal', requireAuth, ah(async (req, res) => {
  res.json({ entries: await sql.all('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY id DESC', [req.user.id]) });
}));

router.post('/journal', requireAuth, ah(async (req, res) => {
  const { title, body, mood, shared_with_therapist } = req.body || {};
  if (!body && !title) return res.status(400).json({ error: 'Γράψε κάτι πρώτα' });
  const newId = await sql.insert('INSERT INTO journal_entries (user_id, title, body, mood, shared_with_therapist) VALUES (?,?,?,?,?)', [req.user.id, title || 'Χωρίς τίτλο', body || '', mood ?? null, shared_with_therapist ? 1 : 0]);
  res.status(201).json({ entry: await sql.get('SELECT * FROM journal_entries WHERE id = ?', [newId]) });
}));

router.delete('/journal/:id', requireAuth, ah(async (req, res) => {
  await sql.run('DELETE FROM journal_entries WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

router.get('/mood-trend', requireAuth, ah(async (req, res) => {
  const rows = await sql.all(`
    SELECT date(created_at) AS day, AVG(mood) AS mood
    FROM journal_entries WHERE user_id = ? AND mood IS NOT NULL
    GROUP BY day ORDER BY day DESC LIMIT 30
  `, [req.user.id]);
  res.json({ trend: rows.reverse() });
}));

/* ---------- Worksheets ---------- */

router.get('/worksheets', requireAuth, ah(async (req, res) => {
  const library = (await sql.all('SELECT * FROM worksheets ORDER BY category, title', []))
    .map((w) => ({ ...w, fields: JSON.parse(w.fields) }));
  const assignments = (await sql.all(`
    SELECT a.*, w.title, w.slug, w.category, w.description, w.fields
    FROM worksheet_assignments a JOIN worksheets w ON w.id = a.worksheet_id
    WHERE a.client_id = ? ORDER BY a.id DESC
  `, [req.user.id])).map((a) => ({ ...a, fields: JSON.parse(a.fields), answers: a.answers ? JSON.parse(a.answers) : null }));
  res.json({ library, assignments });
}));

router.post('/worksheets/:slug/start', requireAuth, ah(async (req, res) => {
  const w = await sql.get('SELECT * FROM worksheets WHERE slug = ?', [req.params.slug]);
  if (!w) return res.status(404).json({ error: 'Δεν βρέθηκε' });
  const newId = await sql.insert('INSERT INTO worksheet_assignments (worksheet_id, client_id, assigned_by) VALUES (?,?,?)', [w.id, req.user.id, req.user.id]);
  res.status(201).json({ assignment_id: newId });
}));

router.post('/worksheet-assignments/:id', requireAuth, ah(async (req, res) => {
  const a = await sql.get('SELECT * FROM worksheet_assignments WHERE id = ? AND client_id = ?', [req.params.id, req.user.id]);
  if (!a) return res.status(404).json({ error: 'Δεν βρέθηκε' });
  await sql.run("UPDATE worksheet_assignments SET answers = ?, status='completed', completed_at=datetime('now') WHERE id = ?", [JSON.stringify(req.body?.answers || {}), a.id]);
  if (a.assigned_by && a.assigned_by !== req.user.id) {
    await notify(a.assigned_by, 'Ολοκληρωμένο φύλλο εργασίας', `${req.user.display_name} ολοκλήρωσε ένα φύλλο εργασίας`, '/provider');
  }
  res.json({ ok: true });
}));

/* ---------- Groupinars ---------- */

router.get('/groupinars', requireAuth, ah(async (req, res) => {
  const rows = await sql.all(`
    SELECT g.*, u.display_name AS host_name,
      (SELECT COUNT(*) FROM groupinar_registrations r WHERE r.groupinar_id = g.id) AS registered,
      EXISTS(SELECT 1 FROM groupinar_registrations r WHERE r.groupinar_id = g.id AND r.user_id = ?) AS is_registered
    FROM groupinars g LEFT JOIN therapists t ON t.id = g.host_therapist_id
    LEFT JOIN users u ON u.id = t.user_id
    WHERE g.starts_at > datetime('now', '-1 day') ORDER BY g.starts_at
  `, [req.user.id]);
  res.json({ groupinars: rows });
}));

router.post('/groupinars/:id/register', requireAuth, ah(async (req, res) => {
  try {
    await sql.run('INSERT INTO groupinar_registrations (groupinar_id, user_id) VALUES (?,?)', [req.params.id, req.user.id]);
  } catch { /* already registered */ }
  res.json({ ok: true });
}));

router.delete('/groupinars/:id/register', requireAuth, ah(async (req, res) => {
  await sql.run('DELETE FROM groupinar_registrations WHERE groupinar_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

/* ---------- Provider portal (therapist side) ---------- */

router.get('/provider/overview', requireRole('therapist'), ah(async (req, res) => {
  const t = await sql.get('SELECT * FROM therapists WHERE user_id = ?', [req.user.id]);
  if (t.status !== 'approved') return res.json({ therapist: t, clients: [], upcoming: [] });
  const clients = await sql.all(`
    SELECT m.id AS match_id, u.id AS client_id, u.display_name, u.nickname, m.started_at, r.id AS room_id,
      (SELECT COUNT(*) FROM messages WHERE room_id = r.id AND read_at IS NULL AND sender_id != ?) AS unread,
      COALESCE(
        (SELECT risk_level FROM assessments WHERE user_id = u.id ORDER BY id DESC LIMIT 1),
        (SELECT risk_level FROM intakes WHERE user_id = u.id ORDER BY id DESC LIMIT 1)
      ) AS risk_level,
      EXISTS(SELECT 1 FROM assessments WHERE user_id = u.id) AS has_assessment
    FROM matches m JOIN users u ON u.id = m.client_id JOIN rooms r ON r.match_id = m.id
    WHERE m.therapist_id = ? AND m.status = 'active' ORDER BY unread DESC, m.started_at DESC
  `, [req.user.id, t.id]);
  const upcoming = await sql.all(`
    SELECT s.*, u.display_name AS client_name FROM sessions s
    JOIN matches m ON m.id = s.match_id JOIN users u ON u.id = m.client_id
    WHERE m.therapist_id = ? AND s.status = 'scheduled' AND s.starts_at > datetime('now')
    ORDER BY s.starts_at LIMIT 20
  `, [t.id]);
  res.json({ therapist: t, clients, upcoming });
}));

router.get('/provider/availability', requireRole('therapist'), ah(async (req, res) => {
  const t = await sql.get('SELECT * FROM therapists WHERE user_id = ?', [req.user.id]);
  res.json({ slots: await sql.all("SELECT * FROM availability WHERE therapist_id = ? AND starts_at > datetime('now') ORDER BY starts_at", [t.id]) });
}));

router.post('/provider/availability', requireRole('therapist'), ah(async (req, res) => {
  const t = await sql.get('SELECT * FROM therapists WHERE user_id = ?', [req.user.id]);
  const { starts_at, duration_min = 45, modality = 'video' } = req.body || {};
  if (!starts_at) return res.status(400).json({ error: 'Δώσε ημερομηνία και ώρα' });
  const newId = await sql.insert('INSERT INTO availability (therapist_id, starts_at, duration_min, modality) VALUES (?,?,?,?)', [t.id, new Date(starts_at).toISOString(), duration_min, modality]);
  res.status(201).json({ slot: await sql.get('SELECT * FROM availability WHERE id = ?', [newId]) });
}));

router.delete('/provider/availability/:id', requireRole('therapist'), ah(async (req, res) => {
  const t = await sql.get('SELECT * FROM therapists WHERE user_id = ?', [req.user.id]);
  await sql.run('DELETE FROM availability WHERE id = ? AND therapist_id = ? AND booked = 0', [req.params.id, t.id]);
  res.json({ ok: true });
}));

router.patch('/provider/profile', requireRole('therapist'), ah(async (req, res) => {
  const allowed = ['headline', 'bio', 'credentials', 'specialties', 'approaches', 'languages', 'accepting_clients', 'max_clients', 'avg_response_hours'];
  const updates = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'Καμία αλλαγή' });
  await sql.run(`UPDATE therapists SET ${updates.map(([k]) => `${k} = ?`).join(', ')} WHERE user_id = ?`, [...updates.map(([, v]) => (Array.isArray(v) ? v.join(',') : typeof v === 'boolean' ? (v ? 1 : 0) : v)), req.user.id]);
  res.json({ therapist: await sql.get('SELECT * FROM therapists WHERE user_id = ?', [req.user.id]) });
}));

router.post('/provider/assign-worksheet', requireRole('therapist'), ah(async (req, res) => {
  const { client_id, slug } = req.body || {};
  const w = await sql.get('SELECT * FROM worksheets WHERE slug = ?', [slug]);
  if (!w) return res.status(404).json({ error: 'Το φύλλο εργασίας δεν βρέθηκε' });
  await sql.run('INSERT INTO worksheet_assignments (worksheet_id, client_id, assigned_by) VALUES (?,?,?)', [w.id, client_id, req.user.id]);
  await notify(client_id, 'Νέο φύλλο εργασίας', `${req.user.display_name} σου ανέθεσε: ${w.title}`, '/app/worksheets');
  res.status(201).json({ ok: true });
}));

router.get('/provider/clients/:id', requireRole('therapist'), ah(async (req, res) => {
  const t = await sql.get('SELECT * FROM therapists WHERE user_id = ?', [req.user.id]);
  const m = await sql.get("SELECT * FROM matches WHERE therapist_id = ? AND client_id = ? AND status='active'", [t.id, req.params.id]);
  if (!m) return res.status(404).json({ error: 'Δεν βρέθηκε' });
  const client = await sql.get('SELECT id, display_name, nickname, timezone, created_at FROM users WHERE id = ?', [req.params.id]);
  const intake = await sql.get('SELECT * FROM intakes WHERE user_id = ? ORDER BY id DESC', [req.params.id]);
  const journal = await sql.all('SELECT * FROM journal_entries WHERE user_id = ? AND shared_with_therapist = 1 ORDER BY id DESC LIMIT 20', [req.params.id]);
  const worksheets = await sql.all(`
    SELECT a.*, w.title FROM worksheet_assignments a JOIN worksheets w ON w.id = a.worksheet_id
    WHERE a.client_id = ? ORDER BY a.id DESC
  `, [req.params.id]);
  const assessments = (await sql.all('SELECT * FROM assessments WHERE user_id = ? ORDER BY id DESC LIMIT 10', [req.params.id]))
    .map((a) => ({ ...a, answers: JSON.parse(a.answers), scores: JSON.parse(a.scores) }));
  res.json({
    client, journal, worksheets, assessments,
    intake: intake ? { ...intake, answers: JSON.parse(intake.answers) } : null,
  });
}));

export default router;
