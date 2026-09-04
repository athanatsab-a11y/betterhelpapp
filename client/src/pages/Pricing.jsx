import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, euro } from '../lib/api.js';

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [period, setPeriod] = useState('monthly');
  useEffect(() => { api.get('/plans').then((d) => setPlans(d.plans)).catch(() => {}); }, []);

  const mult = { weekly: 0.25, monthly: 1, quarterly: 2.7 }[period];
  const label = { weekly: 'εβδομάδα', monthly: 'μήνα', quarterly: 'τρίμηνο' }[period];

  return (
    <main className="container section stack">
      <h1 className="center">Ένα κόστος, τα πάντα μέσα</h1>
      <p className="center muted">Χωρίς χρέωση ανά συνεδρία. Ακύρωση οποτεδήποτε. Πρώτη εβδομάδα δωρεάν.</p>

      <div className="row" style={{ justifyContent: 'center' }}>
        {['weekly', 'monthly', 'quarterly'].map((p) => (
          <button key={p} className={`btn small ${period === p ? '' : 'secondary'}`} onClick={() => setPeriod(p)}>
            {{ weekly: 'Εβδομαδιαία', monthly: 'Μηνιαία', quarterly: 'Τριμηνιαία (-10%)' }[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-3">
        {plans.map((plan) => (
          <div className="card stack" key={plan.key}>
            <div className="spread">
              <h3>{plan.name}</h3>
              {plan.key === 'plus' && <span className="pill">Δημοφιλές</span>}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--teal-700)' }}>
              {euro(plan.monthly_cents * mult)}<span className="small muted"> / {label}</span>
            </div>
            <p className="small muted">{plan.tagline}</p>
            <ul className="small">{plan.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <Link className="btn block" to={`/get-started?plan=${plan.key}&period=${period}`}>Ξεκίνα με {plan.name}</Link>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h2>Οικονομική ενίσχυση</h2>
        <p className="small">
          Πιστεύουμε ότι το κόστος δεν πρέπει να είναι εμπόδιο. Μετά την εγγραφή μπορείς να υποβάλεις αίτηση
          οικονομικής ενίσχυσης δηλώνοντας το μηνιαίο εισόδημα και το μέγεθος του νοικοκυριού σου.
          Η έκπτωση φτάνει έως και <b>40%</b> και εφαρμόζεται αυτόματα στη συνδρομή σου.
        </p>
        <table className="table">
          <thead><tr><th>Εισόδημα ανά άτομο / μήνα</th><th>Έκπτωση</th></tr></thead>
          <tbody>
            <tr><td>έως 600€</td><td>40%</td></tr>
            <tr><td>600€ - 900€</td><td>30%</td></tr>
            <tr><td>900€ - 1.300€</td><td>20%</td></tr>
            <tr><td>1.300€ - 1.800€</td><td>10%</td></tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
