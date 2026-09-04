import { useEffect, useState } from 'react';
import { api, euro, dt } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Spinner } from '../../components/common.jsx';

export default function Billing() {
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [aid, setAid] = useState({ monthly_income: '', household_size: 1, employment: 'employed' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/subscription').then(setData).catch(() => setData(null));
  useEffect(load, []);

  const act = async (fn) => {
    setBusy(true); setMsg('');
    try { const r = await fn(); setMsg(r?.message || 'Έγινε.'); await refresh(); load(); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  const changePlan = (plan, period) => act(async () => {
    await api.post('/subscription', { plan, billing_period: period });
    return { message: 'Το πακέτο σου ενημερώθηκε.' };
  });

  const applyAid = (e) => {
    e.preventDefault();
    act(async () => {
      const r = await api.post('/financial-aid', {
        monthly_income_cents: Math.round(Number(aid.monthly_income || 0) * 100),
        household_size: Number(aid.household_size),
        employment: aid.employment,
      });
      return { message: r.discount_pct ? `Εγκρίθηκε έκπτωση ${r.discount_pct}%.` : 'Με βάση τα στοιχεία σου δεν προκύπτει έκπτωση.' };
    });
  };

  if (!data) return <Spinner />;
  const sub = data.subscription;

  return (
    <div className="stack">
      <h1>Χρεώσεις & συνδρομή</h1>
      {msg && <p className="success">{msg}</p>}

      <div className="card stack">
        <h3>Η συνδρομή μου</h3>
        {sub ? (
          <>
            <p className="small">
              Πακέτο <b>{sub.plan}</b> · {euro(sub.price_cents)} ανά {sub.billing_period}
              {sub.discount_pct ? ` (έκπτωση ${sub.discount_pct}%)` : ''}<br />
              Κατάσταση: <span className={`pill ${sub.status === 'active' ? 'ok' : 'warn'}`}>{sub.status}</span>
              {sub.renews_at && <> · ανανέωση {dt(sub.renews_at)}</>}
            </p>
            <div className="row">
              {sub.status !== 'cancelled' && <button className="btn small ghost" disabled={busy} onClick={() => act(() => api.post('/subscription/cancel'))}>Ακύρωση συνδρομής</button>}
              {sub.status === 'active' && <button className="btn small secondary" disabled={busy} onClick={() => act(() => api.post('/subscription/pause'))}>Πάγωμα</button>}
              {sub.status !== 'active' && <button className="btn small" disabled={busy} onClick={() => act(() => api.post('/subscription/resume'))}>Επανενεργοποίηση</button>}
            </div>
          </>
        ) : <p className="small muted">Δεν έχεις ενεργή συνδρομή.</p>}
      </div>

      <div className="card stack">
        <h3>Άλλαξε πακέτο</h3>
        <div className="grid grid-3">
          {data.plans.map((p) => (
            <div className="card flat" key={p.key}>
              <div className="spread"><b>{p.name}</b>{sub?.plan === p.key && <span className="pill">Τρέχον</span>}</div>
              <div style={{ fontSize: '1.4rem', color: 'var(--teal-700)' }}>{euro(p.monthly_cents)}<span className="small muted">/μήνα</span></div>
              <p className="small muted">{p.tagline}</p>
              <div className="row">
                <button className="btn small secondary" disabled={busy} onClick={() => changePlan(p.key, 'monthly')}>Μηνιαία</button>
                <button className="btn small ghost" disabled={busy} onClick={() => changePlan(p.key, 'quarterly')}>Τριμηνιαία</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h3>Οικονομική ενίσχυση</h3>
        {data.financial_aid ? (
          <p className="small">Έχεις εγκεκριμένη έκπτωση <b>{data.financial_aid.discount_pct}%</b> από {dt(data.financial_aid.created_at)}.</p>
        ) : null}
        <form className="stack" onSubmit={applyAid}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="inc">Μηνιαίο καθαρό εισόδημα νοικοκυριού (€)</label>
              <input id="inc" type="number" min="0" required value={aid.monthly_income} onChange={(e) => setAid({ ...aid, monthly_income: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="hh">Άτομα στο νοικοκυριό</label>
              <input id="hh" type="number" min="1" value={aid.household_size} onChange={(e) => setAid({ ...aid, household_size: e.target.value })} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="emp">Εργασιακή κατάσταση</label>
              <select id="emp" value={aid.employment} onChange={(e) => setAid({ ...aid, employment: e.target.value })}>
                <option value="employed">Εργαζόμενος/η</option>
                <option value="student">Φοιτητής/τρια</option>
                <option value="unemployed">Άνεργος/η</option>
                <option value="retired">Συνταξιούχος</option>
              </select>
            </div>
          </div>
          <button className="btn" disabled={busy}>Υποβολή αίτησης</button>
        </form>
      </div>

      <div className="card stack">
        <h3>Ιστορικό πληρωμών</h3>
        {data.payments.length === 0 && <p className="small muted">Καμία χρέωση ακόμη.</p>}
        {data.payments.length > 0 && (
          <table className="table">
            <thead><tr><th>Ημερομηνία</th><th>Περιγραφή</th><th>Ποσό</th><th>Κατάσταση</th></tr></thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}><td>{dt(p.created_at)}</td><td>{p.description}</td><td>{euro(p.amount_cents)}</td><td>{p.status}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
