import { Router } from 'express';
import { db, notify } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { ASSESSMENT, FREQ_SCALE, scoreAssessment } from '../../shared/catalog.js';

const router = Router();

router.get('/assessment', requireAuth, (req, res) => {
  const history = db.prepare('SELECT id, scores, risk_level, created_at FROM assessments WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id).map((a) => ({ ...a, scores: JSON.parse(a.scores) }));
  const last = db.prepare('SELECT * FROM assessments WHERE user_id = ? ORDER BY id DESC').get(req.user.id);
  res.json({
    sections: ASSESSMENT,
    scale: FREQ_SCALE,
    history,
    last: last ? { ...last, answers: JSON.parse(last.answers), scores: JSON.parse(last.scores) } : null,
  });
});

router.post('/assessment', requireAuth, (req, res) => {
  const answers = req.body?.answers || {};
  const { scores, risk_level } = scoreAssessment(answers);
  const info = db.prepare('INSERT INTO assessments (user_id, answers, scores, risk_level) VALUES (?,?,?,?)')
    .run(req.user.id, JSON.stringify(answers), JSON.stringify(scores), risk_level);

  // The therapist sees the result as soon as it lands, flagged when it matters.
  const match = db.prepare(`
    SELECT t.user_id FROM matches m JOIN therapists t ON t.id = m.therapist_id
    WHERE m.client_id = ? AND m.status = 'active'
  `).get(req.user.id);
  if (match) {
    const flag = risk_level === 'crisis' ? '⚠️ Χρειάζεται άμεση προσοχή — ' : '';
    notify(match.user_id, 'Νέα αξιολόγηση γνωριμίας',
      `${flag}${req.user.display_name}: διάθεση ${scores.mood.total}/27, άγχος ${scores.anxiety.total}/21`,
      '/provider');
  }

  res.status(201).json({ id: info.lastInsertRowid, scores, risk_level, crisis: risk_level === 'crisis' });
});

/* ---------- Admin: αξιολόγηση αιτήσεων θεραπευτών ---------- */

router.get('/admin/applications', requireRole('admin'), (_req, res) => {
  const rows = db.prepare(`
    SELECT t.*, u.display_name, u.email, u.phone
    FROM therapists t JOIN users u ON u.id = t.user_id
    ORDER BY CASE t.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, t.applied_at DESC
  `).all();
  res.json({ applications: rows });
});

router.post('/admin/applications/:id', requireRole('admin'), (req, res) => {
  const { decision, note } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Άγνωστη απόφαση' });
  const t = db.prepare('SELECT * FROM therapists WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Δεν βρέθηκε' });

  db.prepare("UPDATE therapists SET status = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?")
    .run(decision, note || null, t.id);
  notify(t.user_id,
    decision === 'approved' ? 'Η αίτησή σου εγκρίθηκε' : 'Η αίτησή σου δεν εγκρίθηκε',
    decision === 'approved'
      ? 'Το προφίλ σου είναι πλέον ενεργό και μπορείς να δέχεσαι μέλη.'
      : note || 'Επικοινώνησε μαζί μας για διευκρινίσεις.',
    '/provider');
  res.json({ therapist: db.prepare('SELECT * FROM therapists WHERE id = ?').get(t.id) });
});

export default router;
