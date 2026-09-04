import { Router } from 'express';
import { ah } from './async-handler.js';
import crypto from 'node:crypto';
import { sql } from '../db/index.js';
import { questionnaireWithOptions, riskFromAnswers, SPECIALTIES, APPROACHES, PLANS } from '../../shared/catalog.js';
import { rankTherapists, assignTherapist } from '../matching.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/questionnaire', ah(async (_req, res) => {
  res.json({ questions: questionnaireWithOptions(), specialties: SPECIALTIES, approaches: APPROACHES, plans: PLANS });
}));

// Submit the questionnaire. Works signed-out (returns an anon token that is
// claimed at registration) as well as signed-in.
router.post('/intake', ah(async (req, res) => {
  const answers = req.body?.answers || {};
  const service = answers.service || 'individual';
  const risk = riskFromAnswers(answers);
  const token = crypto.randomUUID();
  await sql.run('INSERT INTO intakes (user_id, anon_token, service, answers, risk_level) VALUES (?,?,?,?,?)', [req.user?.id ?? null, token, service, JSON.stringify(answers), risk]);

  const matches = await rankTherapists(answers, 5);
  res.json({
    intake_token: token,
    risk_level: risk,
    crisis: risk === 'crisis',
    matches: matches.map(publicTherapist),
  });
}));

// Confirm the match after signup (or switch therapist later).
router.post('/match', requireAuth, ah(async (req, res) => {
  const { therapist_id, reason } = req.body || {};
  const intake = await sql.get('SELECT * FROM intakes WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
  const answers = intake ? JSON.parse(intake.answers) : {};
  let chosen = null;
  if (therapist_id) {
    const t = await sql.get("SELECT * FROM therapists WHERE id = ? AND status = 'approved'", [therapist_id]);
    if (!t) return res.status(404).json({ error: 'Ο θεραπευτής δεν βρέθηκε' });
    const ranked = (await rankTherapists(answers, 50)).find((r) => r.id === t.id);
    chosen = ranked || { id: t.id, score: 0, reason: 'επιλογή χρήστη' };
  } else {
    const current = await sql.get("SELECT therapist_id FROM matches WHERE client_id = ? AND status='active'", [req.user.id]);
    chosen = (await rankTherapists(answers, 10)).find((r) => r.id !== current?.therapist_id);
    if (!chosen) return res.status(409).json({ error: 'Δεν υπάρχει διαθέσιμος θεραπευτής αυτή τη στιγμή' });
  }
  const { matchId, roomId } = await assignTherapist(req.user.id, chosen.id, chosen.score, reason || chosen.reason);
  res.json({ match_id: matchId, room_id: roomId, therapist_id: chosen.id });
}));

router.get('/therapists', ah(async (req, res) => {
  const { specialty, language, gender, q } = req.query;
  let rows = await sql.all(`
    SELECT t.*, u.display_name FROM therapists t JOIN users u ON u.id = t.user_id
    WHERE t.status = 'approved'
  `, []);
  if (specialty) rows = rows.filter((t) => (t.specialties || '').split(',').includes(specialty));
  if (language) rows = rows.filter((t) => (t.languages || '').split(',').includes(language));
  if (gender) rows = rows.filter((t) => t.gender === gender);
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((t) => `${t.display_name} ${t.headline} ${t.bio}`.toLowerCase().includes(needle));
  }
  res.json({ therapists: rows.map(publicTherapist) });
}));

router.get('/therapists/:id', ah(async (req, res) => {
  const t = await sql.get("SELECT t.*, u.display_name FROM therapists t JOIN users u ON u.id=t.user_id WHERE t.id = ? AND t.status = 'approved'", [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Δεν βρέθηκε' });
  const reviews = await sql.all('SELECT rating, body, author_label, created_at FROM reviews WHERE therapist_id = ? ORDER BY id DESC LIMIT 20', [t.id]);
  res.json({ therapist: publicTherapist(t), reviews });
}));

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
