import { Router } from 'express';
import { db } from '../db.js';
import { hashPassword, checkPassword, issueToken, clearToken, requireAuth, publicUser } from '../auth.js';
import { assignTherapist, rankTherapists } from '../matching.js';
import { planPrice } from '../../shared/catalog.js';
import { notify } from '../db.js';

const router = Router();

router.post('/register', (req, res) => {
  const { email, password, display_name, nickname, intake_token, plan = 'standard', billing_period = 'monthly' } = req.body || {};
  if (!email || !password || !display_name) return res.status(400).json({ error: 'Συμπλήρωσε email, κωδικό και όνομα' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' });
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'Υπάρχει ήδη λογαριασμός με αυτό το email' });

  const info = db.prepare(
    'INSERT INTO users (email, password_hash, role, display_name, nickname) VALUES (?,?,?,?,?)'
  ).run(String(email).toLowerCase(), hashPassword(password), 'client', display_name, nickname || display_name.split(' ')[0]);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  // Attach the anonymous questionnaire filled in before signup and auto-match.
  let matched = null;
  if (intake_token) {
    const intake = db.prepare('SELECT * FROM intakes WHERE anon_token = ? ORDER BY id DESC').get(intake_token);
    if (intake) {
      db.prepare('UPDATE intakes SET user_id = ? WHERE id = ?').run(user.id, intake.id);
      const answers = JSON.parse(intake.answers);
      const best = rankTherapists(answers, 1)[0];
      if (best) {
        assignTherapist(user.id, best.id, best.score, best.reason);
        matched = best.display_name;
      }
    }
  }

  const trialEnd = new Date(Date.now() + 7 * 86400000).toISOString();
  db.prepare(
    "INSERT INTO subscriptions (user_id, plan, billing_period, price_cents, status, renews_at) VALUES (?,?,?,?,'trialing',?)"
  ).run(user.id, plan, billing_period, planPrice(plan, billing_period), trialEnd);

  issueToken(res, user);
  res.status(201).json({ user: publicUser(user), matched });
});

// Therapists sign up themselves; the profile stays unlisted until an admin
// reviews the credentials.
router.post('/apply-therapist', (req, res) => {
  const b = req.body || {};
  const required = ['email', 'password', 'display_name', 'credentials', 'license_no'];
  const missing = required.filter((k) => !String(b[k] || '').trim());
  if (missing.length) return res.status(400).json({ error: 'Συμπλήρωσε όλα τα υποχρεωτικά πεδία' });
  if (String(b.password).length < 8) return res.status(400).json({ error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' });
  if (!(b.specialties || []).length) return res.status(400).json({ error: 'Διάλεξε τουλάχιστον μία ειδίκευση' });
  if (!(b.languages || []).length) return res.status(400).json({ error: 'Διάλεξε τουλάχιστον μία γλώσσα' });

  const email = String(b.email).toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Υπάρχει ήδη λογαριασμός με αυτό το email' });
  }
  if (db.prepare('SELECT 1 FROM therapists WHERE license_no = ?').get(b.license_no)) {
    return res.status(409).json({ error: 'Ο αριθμός άδειας χρησιμοποιείται ήδη' });
  }

  const csv = (v) => (Array.isArray(v) ? v.join(',') : String(v || ''));
  const info = db.prepare(
    'INSERT INTO users (email, password_hash, role, display_name, nickname, phone) VALUES (?,?,?,?,?,?)'
  ).run(email, hashPassword(b.password), 'therapist', b.display_name, b.display_name.split(' ')[0], b.phone || null);
  const userId = info.lastInsertRowid;

  db.prepare(`
    INSERT INTO therapists (user_id, headline, bio, credentials, license_no, years_experience, gender,
      languages, specialties, approaches, faith_based, lgbtq_friendly, rating, reviews_count,
      accepting_clients, max_clients, avg_response_hours, status, applied_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0,1,?,?, 'pending', datetime('now'))
  `).run(
    userId, b.headline || '', b.bio || '', b.credentials, b.license_no,
    Number(b.years_experience) || 0, b.gender || null, csv(b.languages), csv(b.specialties),
    csv(b.approaches), b.faith_based ? 1 : 0, b.lgbtq_friendly === false ? 0 : 1,
    Number(b.max_clients) || 20, Number(b.avg_response_hours) || 12
  );

  for (const admin of db.prepare("SELECT id FROM users WHERE role = 'admin'").all()) {
    notify(admin.id, 'Νέα αίτηση θεραπευτή', `${b.display_name} — ${b.credentials}`, '/admin');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  issueToken(res, user);
  res.status(201).json({ user: publicUser(user), status: 'pending' });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase());
  if (!user || !checkPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Λάθος email ή κωδικός' });
  }
  issueToken(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => { clearToken(res); res.json({ ok: true }); });

router.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  const user = publicUser(req.user);
  const extra = {};
  if (user.role === 'client') {
    extra.subscription = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id) || null;
    extra.match = db.prepare(`
      SELECT m.id AS match_id, m.status, m.reason, m.started_at, t.*, u.display_name, r.id AS room_id
      FROM matches m
      JOIN therapists t ON t.id = m.therapist_id
      JOIN users u ON u.id = t.user_id
      JOIN rooms r ON r.match_id = m.id
      WHERE m.client_id = ? AND m.status = 'active'
    `).get(user.id) || null;
  }
  if (user.role === 'therapist') {
    extra.therapist = db.prepare('SELECT * FROM therapists WHERE user_id = ?').get(user.id) || null;
  }
  if (user.role === 'client') {
    const last = db.prepare('SELECT id, scores, risk_level, created_at FROM assessments WHERE user_id = ? ORDER BY id DESC').get(user.id);
    extra.assessment = last ? { ...last, scores: JSON.parse(last.scores) } : null;
  }
  extra.unread_notifications = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL').get(user.id).c;
  res.json({ user, ...extra });
});

router.patch('/me', requireAuth, (req, res) => {
  const allowed = ['display_name', 'nickname', 'phone', 'timezone', 'locale', 'emergency_contact', 'notify_email', 'notify_sms'];
  const updates = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'Καμία αλλαγή' });
  db.prepare(`UPDATE users SET ${updates.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`)
    .run(...updates.map(([, v]) => (typeof v === 'boolean' ? (v ? 1 : 0) : v)), req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

router.post('/password', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  if (!checkPassword(String(current || ''), req.user.password_hash)) {
    return res.status(400).json({ error: 'Ο τρέχων κωδικός δεν είναι σωστός' });
  }
  if (String(next || '').length < 8) return res.status(400).json({ error: 'Ο νέος κωδικός θέλει 8+ χαρακτήρες' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), req.user.id);
  res.json({ ok: true });
});

router.delete('/me', requireAuth, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  clearToken(res);
  res.json({ ok: true });
});

export default router;
