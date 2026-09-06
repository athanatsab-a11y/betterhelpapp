import { Router } from 'express';
import { ah } from './async-handler.js';
import { sql } from '../db/index.js';
import { hashPassword, checkPassword, issueToken, clearToken, requireAuth, publicUser, supabaseAuthEnabled } from '../auth.js';
import { assignTherapist, rankTherapists } from '../matching.js';
import { planPrice } from '../../shared/catalog.js';
import { notify } from '../db/index.js';

const router = Router();

// In Supabase mode the account itself lives in auth.users: the client signs up
// through Supabase, then calls these endpoints with the access token so we can
// create the matching profile row. In legacy mode we hash a password ourselves.
function identity(req, body) {
  if (supabaseAuthEnabled) {
    if (!req.authUser) return { error: 'Λείπει έγκυρο token από το Supabase Auth' };
    return { auth_id: req.authUser.id, email: (req.authUser.email || body.email || '').toLowerCase(), password_hash: null };
  }
  if (!body.email || !body.password) return { error: 'Συμπλήρωσε email και κωδικό' };
  if (String(body.password).length < 8) return { error: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' };
  return { auth_id: null, email: String(body.email).toLowerCase(), password_hash: hashPassword(body.password) };
}

router.post('/register', ah(async (req, res) => {
  const { display_name, nickname, intake_token, plan = 'standard', billing_period = 'monthly' } = req.body || {};
  if (!display_name) return res.status(400).json({ error: 'Συμπλήρωσε το όνομά σου' });

  const id = identity(req, req.body || {});
  if (id.error) return res.status(400).json({ error: id.error });
  const exists = await sql.get('SELECT 1 FROM users WHERE email = ?', [id.email]);
  if (exists) return res.status(409).json({ error: 'Υπάρχει ήδη λογαριασμός με αυτό το email' });

  const newId = await sql.insert(
    'INSERT INTO users (email, auth_id, password_hash, role, display_name, nickname) VALUES (?,?,?,?,?,?)',
    [id.email, id.auth_id, id.password_hash, 'client', display_name, nickname || display_name.split(' ')[0]]
  );
  const user = await sql.get('SELECT * FROM users WHERE id = ?', [newId]);

  // Attach the anonymous questionnaire filled in before signup and auto-match.
  let matched = null;
  if (intake_token) {
    const intake = await sql.get('SELECT * FROM intakes WHERE anon_token = ? ORDER BY id DESC', [intake_token]);
    if (intake) {
      await sql.run('UPDATE intakes SET user_id = ? WHERE id = ?', [user.id, intake.id]);
      const answers = JSON.parse(intake.answers);
      const best = (await rankTherapists(answers, 1))[0];
      if (best) {
        await assignTherapist(user.id, best.id, best.score, best.reason);
        matched = best.display_name;
      }
    }
  }

  const trialEnd = new Date(Date.now() + 7 * 86400000).toISOString();
  await sql.run("INSERT INTO subscriptions (user_id, plan, billing_period, price_cents, status, renews_at) VALUES (?,?,?,?,'trialing',?)", [user.id, plan, billing_period, planPrice(plan, billing_period), trialEnd]);

  const token = supabaseAuthEnabled ? null : issueToken(res, user);
  res.status(201).json({ user: publicUser(user), matched, token });
}));

// Therapists sign up themselves; the profile stays unlisted until an admin
// reviews the credentials.
router.post('/apply-therapist', ah(async (req, res) => {
  const b = req.body || {};
  const required = supabaseAuthEnabled
    ? ['display_name', 'credentials', 'license_no']
    : ['email', 'password', 'display_name', 'credentials', 'license_no'];
  const missing = required.filter((k) => !String(b[k] || '').trim());
  if (missing.length) return res.status(400).json({ error: 'Συμπλήρωσε όλα τα υποχρεωτικά πεδία' });
  if (!(b.specialties || []).length) return res.status(400).json({ error: 'Διάλεξε τουλάχιστον μία ειδίκευση' });
  if (!(b.languages || []).length) return res.status(400).json({ error: 'Διάλεξε τουλάχιστον μία γλώσσα' });

  const id = identity(req, b);
  if (id.error) return res.status(400).json({ error: id.error });
  const email = id.email;
  if (await sql.get('SELECT 1 FROM users WHERE email = ?', [email])) {
    return res.status(409).json({ error: 'Υπάρχει ήδη λογαριασμός με αυτό το email' });
  }
  if (await sql.get('SELECT 1 FROM therapists WHERE license_no = ?', [b.license_no])) {
    return res.status(409).json({ error: 'Ο αριθμός άδειας χρησιμοποιείται ήδη' });
  }

  const csv = (v) => (Array.isArray(v) ? v.join(',') : String(v || ''));
  const newId = await sql.insert(
    'INSERT INTO users (email, auth_id, password_hash, role, display_name, nickname, phone) VALUES (?,?,?,?,?,?,?)',
    [email, id.auth_id, id.password_hash, 'therapist', b.display_name, b.display_name.split(' ')[0], b.phone || null]
  );
  const userId = newId;

  await sql.run(`
    INSERT INTO therapists (user_id, headline, bio, credentials, license_no, years_experience, gender,
      languages, specialties, approaches, faith_based, lgbtq_friendly, rating, reviews_count,
      accepting_clients, max_clients, avg_response_hours, status, applied_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,0,1,?,?, 'pending', datetime('now'))
  `, [userId, b.headline || '', b.bio || '', b.credentials, b.license_no, Number(b.years_experience) || 0, b.gender || null, csv(b.languages), csv(b.specialties), csv(b.approaches), b.faith_based ? 1 : 0, b.lgbtq_friendly === false ? 0 : 1, Number(b.max_clients) || 20, Number(b.avg_response_hours) || 12]);

  for (const admin of await sql.all("SELECT id FROM users WHERE role = 'admin'", [])) {
    await notify(admin.id, 'Νέα αίτηση θεραπευτή', `${b.display_name} — ${b.credentials}`, '/admin');
  }

  const user = await sql.get('SELECT * FROM users WHERE id = ?', [userId]);
  const token = supabaseAuthEnabled ? null : issueToken(res, user);
  res.status(201).json({ user: publicUser(user), status: 'pending', token });
}));

router.post('/login', ah(async (req, res) => {
  if (supabaseAuthEnabled) {
    return res.status(400).json({ error: 'Η σύνδεση γίνεται μέσω Supabase Auth από την εφαρμογή' });
  }
  const { email, password } = req.body || {};
  const user = await sql.get('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()]);
  if (!user || !checkPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Λάθος email ή κωδικός' });
  }
  // Το token επιστρέφεται και στο σώμα: το native κέλυφος δεν μπορεί να
  // στηριχτεί σε cookie από άλλο origin.
  const token = issueToken(res, user);
  res.json({ user: publicUser(user), token });
}));

router.post('/logout', ah(async (req, res) => { clearToken(res); res.json({ ok: true }); }));

router.get('/me', ah(async (req, res) => {
  if (!req.user) return res.json({ user: null });
  const user = publicUser(req.user);
  const extra = {};
  if (user.role === 'client') {
    extra.subscription = await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [user.id]) || null;
    extra.match = await sql.get(`
      SELECT m.id AS match_id, m.status, m.reason, m.started_at, t.*, u.display_name, r.id AS room_id
      FROM matches m
      JOIN therapists t ON t.id = m.therapist_id
      JOIN users u ON u.id = t.user_id
      JOIN rooms r ON r.match_id = m.id
      WHERE m.client_id = ? AND m.status = 'active'
    `, [user.id]) || null;
  }
  if (user.role === 'therapist') {
    extra.therapist = await sql.get('SELECT * FROM therapists WHERE user_id = ?', [user.id]) || null;
  }
  if (user.role === 'client') {
    const last = await sql.get('SELECT id, scores, risk_level, created_at FROM assessments WHERE user_id = ? ORDER BY id DESC', [user.id]);
    extra.assessment = last ? { ...last, scores: JSON.parse(last.scores) } : null;
  }
  extra.unread_notifications = (await sql.get('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL', [user.id])).c;
  res.json({ user, ...extra });
}));

router.patch('/me', requireAuth, ah(async (req, res) => {
  const allowed = ['display_name', 'nickname', 'phone', 'timezone', 'locale', 'emergency_contact', 'notify_email', 'notify_sms'];
  const updates = Object.entries(req.body || {}).filter(([k]) => allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'Καμία αλλαγή' });
  await sql.run(`UPDATE users SET ${updates.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`, [...updates.map(([, v]) => (typeof v === 'boolean' ? (v ? 1 : 0) : v)), req.user.id]);
  res.json({ user: publicUser(await sql.get('SELECT * FROM users WHERE id = ?', [req.user.id])) });
}));

router.post('/password', requireAuth, ah(async (req, res) => {
  if (supabaseAuthEnabled) {
    return res.status(400).json({ error: 'Η αλλαγή κωδικού γίνεται μέσω Supabase Auth' });
  }
  const { current, next } = req.body || {};
  if (!checkPassword(String(current || ''), req.user.password_hash)) {
    return res.status(400).json({ error: 'Ο τρέχων κωδικός δεν είναι σωστός' });
  }
  if (String(next || '').length < 8) return res.status(400).json({ error: 'Ο νέος κωδικός θέλει 8+ χαρακτήρες' });
  await sql.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(next), req.user.id]);
  res.json({ ok: true });
}));

router.delete('/me', requireAuth, ah(async (req, res) => {
  await sql.run('DELETE FROM users WHERE id = ?', [req.user.id]);
  clearToken(res);
  res.json({ ok: true });
}));

export default router;
