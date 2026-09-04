import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { PLANS, planPrice } from '../catalog.js';

const router = Router();

router.get('/plans', (_req, res) => res.json({ plans: PLANS }));

router.get('/subscription', requireAuth, (req, res) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id) || null;
  const payments = db.prepare('SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 24').all(req.user.id);
  const aid = db.prepare('SELECT * FROM financial_aid WHERE user_id = ? ORDER BY id DESC').get(req.user.id) || null;
  res.json({ subscription: sub, payments, financial_aid: aid, plans: PLANS });
});

// Mock checkout: no real card data is stored, only the last 4 digits are echoed.
router.post('/subscription', requireAuth, (req, res) => {
  const { plan = 'standard', billing_period = 'monthly', card_number = '' } = req.body || {};
  if (!PLANS.some((p) => p.key === plan)) return res.status(400).json({ error: 'Άγνωστο πακέτο' });
  const aid = db.prepare('SELECT * FROM financial_aid WHERE user_id = ? ORDER BY id DESC').get(req.user.id);
  const discount = aid?.discount_pct || 0;
  const price = planPrice(plan, billing_period, discount);
  const renews = new Date(Date.now() + (billing_period === 'weekly' ? 7 : billing_period === 'quarterly' ? 90 : 30) * 86400000).toISOString();

  const existing = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id);
  if (existing) {
    db.prepare("UPDATE subscriptions SET plan=?, billing_period=?, price_cents=?, discount_pct=?, status='active', renews_at=?, cancelled_at=NULL WHERE user_id = ?")
      .run(plan, billing_period, price, discount, renews, req.user.id);
  } else {
    db.prepare("INSERT INTO subscriptions (user_id, plan, billing_period, price_cents, discount_pct, status, renews_at) VALUES (?,?,?,?,?, 'active', ?)")
      .run(req.user.id, plan, billing_period, price, discount, renews);
  }
  db.prepare('INSERT INTO payments (user_id, amount_cents, description) VALUES (?,?,?)')
    .run(req.user.id, price, `Συνδρομή ${plan} (${billing_period})${discount ? ` - έκπτωση ${discount}%` : ''}`);

  res.json({
    subscription: db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id),
    card_last4: String(card_number).replace(/\D/g, '').slice(-4) || null,
  });
});

router.post('/subscription/cancel', requireAuth, (req, res) => {
  db.prepare("UPDATE subscriptions SET status='cancelled', cancelled_at=datetime('now') WHERE user_id = ?").run(req.user.id);
  res.json({ subscription: db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id) });
});

router.post('/subscription/pause', requireAuth, (req, res) => {
  db.prepare("UPDATE subscriptions SET status='paused' WHERE user_id = ?").run(req.user.id);
  res.json({ subscription: db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id) });
});

router.post('/subscription/resume', requireAuth, (req, res) => {
  db.prepare("UPDATE subscriptions SET status='active' WHERE user_id = ?").run(req.user.id);
  res.json({ subscription: db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id) });
});

// Financial aid: sliding scale discount based on income vs household size.
router.post('/financial-aid', requireAuth, (req, res) => {
  const income = Number(req.body?.monthly_income_cents || 0);
  const household = Math.max(1, Number(req.body?.household_size || 1));
  const perPerson = income / household;
  let discount = 0;
  if (perPerson < 60000) discount = 40;
  else if (perPerson < 90000) discount = 30;
  else if (perPerson < 130000) discount = 20;
  else if (perPerson < 180000) discount = 10;

  db.prepare('INSERT INTO financial_aid (user_id, monthly_income_cents, household_size, employment, discount_pct) VALUES (?,?,?,?,?)')
    .run(req.user.id, income, household, req.body?.employment || 'unknown', discount);

  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id);
  if (sub) {
    const price = planPrice(sub.plan, sub.billing_period, discount);
    db.prepare('UPDATE subscriptions SET discount_pct = ?, price_cents = ? WHERE user_id = ?').run(discount, price, req.user.id);
  }
  res.json({ discount_pct: discount, subscription: db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id) });
});

export default router;
