import { Router } from 'express';
import { ah } from './async-handler.js';
import { sql, notify } from '../db/index.js';
import { requireAuth, requireRole } from '../auth.js';
import { ASSESSMENT, FREQ_SCALE, scoreAssessment } from '../../shared/catalog.js';

const router = Router();

router.get('/assessment', requireAuth, ah(async (req, res) => {
  const history = (await sql.all('SELECT id, scores, risk_level, created_at FROM assessments WHERE user_id = ? ORDER BY id DESC', [req.user.id])).map((a) => ({ ...a, scores: JSON.parse(a.scores) }));
  const last = await sql.get('SELECT * FROM assessments WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
  res.json({
    sections: ASSESSMENT,
    scale: FREQ_SCALE,
    history,
    last: last ? { ...last, answers: JSON.parse(last.answers), scores: JSON.parse(last.scores) } : null,
  });
}));

router.post('/assessment', requireAuth, ah(async (req, res) => {
  const answers = req.body?.answers || {};
  const { scores, risk_level } = scoreAssessment(answers);
  const newId = await sql.insert('INSERT INTO assessments (user_id, answers, scores, risk_level) VALUES (?,?,?,?)', [req.user.id, JSON.stringify(answers), JSON.stringify(scores), risk_level]);

  // The therapist sees the result as soon as it lands, flagged when it matters.
  const match = await sql.get(`
    SELECT t.user_id FROM matches m JOIN therapists t ON t.id = m.therapist_id
    WHERE m.client_id = ? AND m.status = 'active'
  `, [req.user.id]);
  if (match) {
    const flag = risk_level === 'crisis' ? '⚠️ Χρειάζεται άμεση προσοχή — ' : '';
    await notify(match.user_id, 'Νέα αξιολόγηση γνωριμίας',
      `${flag}${req.user.display_name}: διάθεση ${scores.mood.total}/27, άγχος ${scores.anxiety.total}/21`,
      '/provider');
  }

  res.status(201).json({ id: newId, scores, risk_level, crisis: risk_level === 'crisis' });
}));

/* ---------- Admin: αξιολόγηση αιτήσεων θεραπευτών ---------- */

router.get('/admin/applications', requireRole('admin'), ah(async (_req, res) => {
  const rows = await sql.all(`
    SELECT t.*, u.display_name, u.email, u.phone
    FROM therapists t JOIN users u ON u.id = t.user_id
    ORDER BY CASE t.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, t.applied_at DESC
  `, []);
  res.json({ applications: rows });
}));

router.post('/admin/applications/:id', requireRole('admin'), ah(async (req, res) => {
  const { decision, note } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Άγνωστη απόφαση' });
  const t = await sql.get('SELECT * FROM therapists WHERE id = ?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Δεν βρέθηκε' });

  await sql.run("UPDATE therapists SET status = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?", [decision, note || null, t.id]);
  await notify(t.user_id,
    decision === 'approved' ? 'Η αίτησή σου εγκρίθηκε' : 'Η αίτησή σου δεν εγκρίθηκε',
    decision === 'approved'
      ? 'Το προφίλ σου είναι πλέον ενεργό και μπορείς να δέχεσαι μέλη.'
      : note || 'Επικοινώνησε μαζί μας για διευκρινίσεις.',
    '/provider');
  res.json({ therapist: await sql.get('SELECT * FROM therapists WHERE id = ?', [t.id]) });
}));

export default router;
