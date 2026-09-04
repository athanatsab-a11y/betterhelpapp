import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { questionnaireWithOptions, riskFromAnswers, SPECIALTIES, APPROACHES, PLANS } from '../../shared/catalog.js';
import { rankTherapists, assignTherapist } from '../matching.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/questionnaire', (_req, res) => {
  res.json({ questions: questionnaireWithOptions(), specialties: SPECIALTIES, approaches: APPROACHES, plans: PLANS });
});

// Submit the questionnaire. Works signed-out (returns an anon token that is
// claimed at registration) as well as signed-in.
router.post('/intake', (req, res) => {
  const answers = req.body?.answers || {};
  const service = answers.service || 'individual';
  const risk = riskFromAnswers(answers);
  const token = crypto.randomUUID();
  db.prepare('INSERT INTO intakes (user_id, anon_token, service, answers, risk_level) VALUES (?,?,?,?,?)')
    .run(req.user?.id ?? null, token, service, JSON.stringify(answers), risk);

  const matches = rankTherapists(answers, 5);
  res.json({
    intake_token: token,
    risk_level: risk,
    crisis: risk === 'crisis',
    matches: matches.map(publicTherapist),
  });
});

// Confirm the match after signup (or switch therapist later).
router.post('/match', requireAuth, (req, res) => {
  const { therapist_id, reason } = req.body || {};
  const intake = db.prepare('SELECT * FROM intakes WHERE user_id = ? ORDER BY id DESC').get(req.user.id);
  const answers = intake ? JSON.parse(intake.answers) : {};
  let chosen = null;
  if (therapist_id) {
    const t = db.prepare("SELECT * FROM therapists WHERE id = ? AND status = 'approved'").get(therapist_id);
    if (!t) return res.status(404).json({ error: 'Ο θεραπευτής δεν βρέθηκε' });
    const ranked = rankTherapists(answers, 50).find((r) => r.id === t.id);
    chosen = ranked || { id: t.id, score: 0, reason: 'επιλογή χρήστη' };
  } else {
    const current = db.prepare("SELECT therapist_id FROM matches WHERE client_id = ? AND status='active'").get(req.user.id);
    chosen = rankTherapists(answers, 10).find((r) => r.id !== current?.therapist_id);
    if (!chosen) return res.status(409).json({ error: 'Δεν υπάρχει διαθέσιμος θεραπευτής αυτή τη στιγμή' });
  }
  const { matchId, roomId } = assignTherapist(req.user.id, chosen.id, chosen.score, reason || chosen.reason);
  res.json({ match_id: matchId, room_id: roomId, therapist_id: chosen.id });
});

router.get('/therapists', (req, res) => {
  const { specialty, language, gender, q } = req.query;
  let rows = db.prepare(`
    SELECT t.*, u.display_name FROM therapists t JOIN users u ON u.id = t.user_id
    WHERE t.status = 'approved'
  `).all();
  if (specialty) rows = rows.filter((t) => (t.specialties || '').split(',').includes(specialty));
  if (language) rows = rows.filter((t) => (t.languages || '').split(',').includes(language));
  if (gender) rows = rows.filter((t) => t.gender === gender);
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((t) => `${t.display_name} ${t.headline} ${t.bio}`.toLowerCase().includes(needle));
  }
  res.json({ therapists: rows.map(publicTherapist) });
});

router.get('/therapists/:id', (req, res) => {
  const t = db.prepare("SELECT t.*, u.display_name FROM therapists t JOIN users u ON u.id=t.user_id WHERE t.id = ? AND t.status = 'approved'").get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Δεν βρέθηκε' });
  const reviews = db.prepare('SELECT rating, body, author_label, created_at FROM reviews WHERE therapist_id = ? ORDER BY id DESC LIMIT 20').all(t.id);
  res.json({ therapist: publicTherapist(t), reviews });
});

const asList = (v) => (Array.isArray(v) ? v : String(v || '').split(',').filter(Boolean));

export function publicTherapist(t) {
  return {
    id: t.id,
    display_name: t.display_name,
    headline: t.headline,
    bio: t.bio,
    credentials: t.credentials,
    license_no: t.license_no,
    years_experience: t.years_experience,
    gender: t.gender,
    languages: asList(t.languages),
    specialties: asList(t.specialties),
    approaches: asList(t.approaches),
    faith_based: !!t.faith_based,
    lgbtq_friendly: !!t.lgbtq_friendly,
    photo: t.photo,
    rating: t.rating,
    reviews_count: t.reviews_count,
    accepting_clients: !!t.accepting_clients,
    avg_response_hours: t.avg_response_hours,
    score: t.score,
    reason: t.reason,
  };
}

export default router;
