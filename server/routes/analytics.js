import { Router } from 'express';
import { ah } from './async-handler.js';
import { sql } from '../db/index.js';
import { requireRole } from '../auth.js';
import { SPECIALTIES, APPROACHES, QUESTIONNAIRE, questionnaireWithOptions } from '../../shared/catalog.js';

const router = Router();

// Ό,τι βλέπει ο διαχειριστής είναι συγκεντρωτικό. Τα μηνύματα της θεραπείας,
// οι σημειώσεις ημερολογίου και οι απαντήσεις των φύλλων εργασίας δεν φεύγουν
// ποτέ από τη σχέση πελάτη–θεραπευτή, ούτε καν για στατιστικά.
const LABELS = {
  ...Object.fromEntries(SPECIALTIES.map((s) => [s.key, s.label])),
  ...Object.fromEntries(APPROACHES.map((a) => [a.key, a.label])),
  unsure: 'Δεν ξέρω / να προτείνετε εσείς',
  el: 'Ελληνικά', en: 'Αγγλικά', de: 'Γερμανικά',
  female: 'Γυναίκα', male: 'Άνδρας', nonbinary: 'Μη δυαδικό άτομο', other: 'Δεν απάντησε',
  any: 'Χωρίς προτίμηση',
  individual: 'Ατομική', couples: 'Ζεύγους', teen: 'Εφήβων',
  now: 'Άμεσα', week: 'Μέσα στην εβδομάδα', exploring: 'Απλώς εξερευνά',
  good: 'Καλός', ok: 'Μέτριος', poor: 'Κακός', very_poor: 'Πολύ κακός',
  never: 'Ποτέ', sometimes: 'Μερικές φορές', often: 'Συχνά', always: 'Σχεδόν πάντα',
  yes: 'Ναι', no: 'Όχι', past: 'Στο παρελθόν',
  messaging: 'Μηνύματα', live_chat: 'Live chat', phone: 'Τηλέφωνο', video: 'Βιντεοκλήση',
};

const label = (key) => LABELS[key] ?? key;

// Μετρά απαντήσεις ανά ερώτηση και επιστρέφει ταξινομημένη κατανομή.
function distribution(rows, id, multi) {
  const counts = new Map();
  let answered = 0;
  for (const answers of rows) {
    const value = answers[id];
    if (value === undefined || value === null || value === '') continue;
    answered++;
    const values = multi ? (Array.isArray(value) ? value : [value]) : [value];
    for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  }
  const items = [...counts.entries()]
    .map(([key, count]) => ({ key, label: label(key), count, pct: answered ? Math.round((count / answered) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
  return { answered, items };
}

router.get('/admin/analytics', requireRole('admin'), ah(async (_req, res) => {
  const questions = questionnaireWithOptions();
  const intakeRows = (await sql.all('SELECT answers FROM intakes')).map((r) => JSON.parse(r.answers));

  const answers = {};
  for (const q of QUESTIONNAIRE) {
    const dist = distribution(intakeRows, q.id, q.type === 'multi');
    if (!dist.answered) continue;
    answers[q.id] = { title: q.title, multi: q.type === 'multi', ...dist };
  }

  const one = async (text, params = []) => Number((await sql.get(text, params))?.c ?? 0);

  const totals = {
    intakes: intakeRows.length,
    clients: await one("SELECT COUNT(*) AS c FROM users WHERE role = 'client'"),
    therapists_approved: await one("SELECT COUNT(*) AS c FROM therapists WHERE status = 'approved'"),
    therapists_pending: await one("SELECT COUNT(*) AS c FROM therapists WHERE status = 'pending'"),
    active_matches: await one("SELECT COUNT(*) AS c FROM matches WHERE status = 'active'"),
    messages: await one('SELECT COUNT(*) AS c FROM messages'),
    sessions: await one('SELECT COUNT(*) AS c FROM sessions'),
    assessments: await one('SELECT COUNT(*) AS c FROM assessments'),
    journal_entries: await one('SELECT COUNT(*) AS c FROM journal_entries'),
    groupinar_registrations: await one('SELECT COUNT(*) AS c FROM groupinar_registrations'),
  };

  // Χοάνη: από το ερωτηματολόγιο μέχρι τη συνδρομή που πληρώνει.
  const funnel = [
    { key: 'intakes', label: 'Ολοκλήρωσαν ερωτηματολόγιο', count: totals.intakes },
    { key: 'accounts', label: 'Δημιούργησαν λογαριασμό', count: totals.clients },
    { key: 'matched', label: 'Έχουν ενεργό θεραπευτή', count: totals.active_matches },
    { key: 'subscribed', label: 'Ενεργή συνδρομή', count: await one("SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active'") },
    { key: 'assessed', label: 'Συμπλήρωσαν αξιολόγηση γνωριμίας', count: await one('SELECT COUNT(DISTINCT user_id) AS c FROM assessments') },
  ];

  const risk = await sql.all(`
    SELECT risk_level AS key, COUNT(*) AS count FROM intakes GROUP BY risk_level ORDER BY count DESC
  `);

  const scoreRows = (await sql.all('SELECT scores FROM assessments')).map((r) => JSON.parse(r.scores));
  const average = (pick) => {
    const values = scoreRows.map(pick).filter((v) => Number.isFinite(v));
    return values.length ? Math.round((values.reduce((a, v) => a + v, 0) / values.length) * 10) / 10 : null;
  };
  const bandCounts = (pick) => {
    const counts = new Map();
    for (const s of scoreRows) {
      const band = pick(s);
      if (band) counts.set(band, (counts.get(band) || 0) + 1);
    }
    return [...counts.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count);
  };
  const assessment = {
    count: scoreRows.length,
    mood_avg: average((s) => s.mood?.total),
    anxiety_avg: average((s) => s.anxiety?.total),
    mood_bands: bandCounts((s) => s.mood?.label),
    anxiety_bands: bandCounts((s) => s.anxiety?.label),
  };

  const subscriptions = {
    by_plan: await sql.all('SELECT plan AS key, COUNT(*) AS count FROM subscriptions GROUP BY plan ORDER BY count DESC'),
    by_status: await sql.all('SELECT status AS key, COUNT(*) AS count FROM subscriptions GROUP BY status ORDER BY count DESC'),
    mrr_cents: Number((await sql.get("SELECT COALESCE(SUM(price_cents),0) AS c FROM subscriptions WHERE status = 'active' AND billing_period = 'monthly'"))?.c ?? 0),
    on_financial_aid: await one('SELECT COUNT(DISTINCT user_id) AS c FROM financial_aid WHERE discount_pct > 0'),
  };

  const revenue = {
    total_cents: Number((await sql.get('SELECT COALESCE(SUM(amount_cents),0) AS c FROM payments'))?.c ?? 0),
    last_30_cents: Number((await sql.get("SELECT COALESCE(SUM(amount_cents),0) AS c FROM payments WHERE created_at > datetime('now','-30 days')"))?.c ?? 0),
    payments: await one('SELECT COUNT(*) AS c FROM payments'),
  };

  const sessions = {
    by_status: await sql.all('SELECT status AS key, COUNT(*) AS count FROM sessions GROUP BY status ORDER BY count DESC'),
    by_modality: await sql.all('SELECT modality AS key, COUNT(*) AS count FROM sessions GROUP BY modality ORDER BY count DESC'),
    upcoming: await one("SELECT COUNT(*) AS c FROM sessions WHERE status = 'scheduled' AND starts_at > datetime('now')"),
  };

  const therapists = await sql.all(`
    SELECT t.id, u.display_name, t.status, t.rating, t.reviews_count, t.avg_response_hours, t.max_clients,
      (SELECT COUNT(*) FROM matches m WHERE m.therapist_id = t.id AND m.status = 'active') AS active_clients,
      (SELECT COUNT(*) FROM sessions s JOIN matches m2 ON m2.id = s.match_id WHERE m2.therapist_id = t.id) AS sessions
    FROM therapists t JOIN users u ON u.id = t.user_id
    ORDER BY active_clients DESC, t.rating DESC
  `);

  const signups = await sql.all(`
    SELECT date(created_at) AS day, COUNT(*) AS count
    FROM users WHERE role = 'client' GROUP BY day ORDER BY day
  `);

  res.json({
    generated_at: new Date().toISOString(),
    totals, funnel, answers, risk, assessment, subscriptions, revenue, sessions, therapists, signups,
    question_order: questions.map((q) => q.id),
  });
}));

// Ίδια δεδομένα σε CSV, για υπολογιστικό φύλλο.
router.get('/admin/analytics.csv', requireRole('admin'), ah(async (_req, res) => {
  const rows = (await sql.all('SELECT answers FROM intakes')).map((r) => JSON.parse(r.answers));
  const lines = [['ερώτηση', 'απάντηση', 'πλήθος', 'ποσοστό_%'].join(',')];
  for (const q of QUESTIONNAIRE) {
    const dist = distribution(rows, q.id, q.type === 'multi');
    for (const item of dist.items) {
      lines.push([q.title, item.label, item.count, item.pct].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mindbridge-intake.csv"');
  res.send(`﻿${lines.join('\n')}`);
}));

export default router;
