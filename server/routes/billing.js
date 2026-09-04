import { Router } from 'express';
import { ah } from './async-handler.js';
import { sql } from '../db/index.js';
import { requireAuth } from '../auth.js';
import { PLANS, planPrice } from '../../shared/catalog.js';

const router = Router();

router.get('/plans', (_req, res) => res.json({ plans: PLANS }));

router.get('/subscription', requireAuth, ah(async (req, res) => {
  const sub = await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id]) || null;
  const payments = await sql.all('SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 24', [req.user.id]);
  const aid = await sql.get('SELECT * FROM financial_aid WHERE user_id = ? ORDER BY id DESC', [req.user.id]) || null;
  res.json({ subscription: sub, payments, financial_aid: aid, plans: PLANS });
}));

// Mock checkout: no real card data is stored, only the last 4 digits are echoed.
router.post('/subscription', requireAuth, ah(async (req, res) => {
  const { plan = 'standard', billing_period = 'monthly', card_number = '' } = req.body || {};
  if (!PLANS.some((p) => p.key === plan)) return res.status(400).json({ error: 'Άγνωστο πακέτο' });
  const aid = await sql.get('SELECT * FROM financial_aid WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
  const discount = aid?.discount_pct || 0;
  const price = planPrice(plan, billing_period, discount);
  const renews = new Date(Date.now() + (billing_period === 'weekly' ? 7 : billing_period === 'quarterly' ? 90 : 30) * 86400000).toISOString();

  const existing = await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id]);
  if (existing) {
    await sql.run("UPDATE subscriptions SET plan=?, billing_period=?, price_cents=?, discount_pct=?, status='active', renews_at=?, cancelled_at=NULL WHERE user_id = ?", [plan, billing_period, price, discount, renews, req.user.id]);
  } else {
    await sql.run("INSERT INTO subscriptions (user_id, plan, billing_period, price_cents, discount_pct, status, renews_at) VALUES (?,?,?,?,?, 'active', ?)", [req.user.id, plan, billing_period, price, discount, renews]);
  }
  await sql.run('INSERT INTO payments (user_id, amount_cents, description) VALUES (?,?,?)', [req.user.id, price, `Συνδρομή ${plan} (${billing_period})${discount ? ` - έκπτωση ${discount}%` : ''}`]);

  res.json({
    subscription: await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id]),
    card_last4: String(card_number).replace(/\D/g, '').slice(-4) || null,
  });
}));

router.post('/subscription/cancel', requireAuth, ah(async (req, res) => {
  await sql.run("UPDATE subscriptions SET status='cancelled', cancelled_at=datetime('now') WHERE user_id = ?", [req.user.id]);
  res.json({ subscription: await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id]) });
}));

router.post('/subscription/pause', requireAuth, ah(async (req, res) => {
  await sql.run("UPDATE subscriptions SET status='paused' WHERE user_id = ?", [req.user.id]);
  res.json({ subscription: await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id]) });
}));

router.post('/subscription/resume', requireAuth, ah(async (req, res) => {
  await sql.run("UPDATE subscriptions SET status='active' WHERE user_id = ?", [req.user.id]);
  res.json({ subscription: await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id]) });
}));

// Financial aid: sliding scale discount based on income vs household size.
router.post('/financial-aid', requireAuth, ah(async (req, res) => {
  const income = Number(req.body?.monthly_income_cents || 0);
  const household = Math.max(1, Number(req.body?.household_size || 1));
  const perPerson = income / household;
  let discount = 0;
  if (perPerson < 60000) discount = 40;
  else if (perPerson < 90000) discount = 30;
  else if (perPerson < 130000) discount = 20;
  else if (perPerson < 180000) discount = 10;

  await sql.run('INSERT INTO financial_aid (user_id, monthly_income_cents, household_size, employment, discount_pct) VALUES (?,?,?,?,?)', [req.user.id, income, household, req.body?.employment || 'unknown', discount]);

  const sub = await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id]);
  if (sub) {
    const price = planPrice(sub.plan, sub.billing_period, discount);
    await sql.run('UPDATE subscriptions SET discount_pct = ?, price_cents = ? WHERE user_id = ?', [discount, price, req.user.id]);
  }
  res.json({ discount_pct: discount, subscription: await sql.get('SELECT * FROM subscriptions WHERE user_id = ?', [req.user.id]) });
}));

export default router;
