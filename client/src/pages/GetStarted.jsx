import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, euro } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Spinner } from '../components/common.jsx';

export default function GetStarted() {
  const [params] = useSearchParams();
  const { user, register, refresh } = useAuth();
  const nav = useNavigate();

  const [questions, setQuestions] = useState(null);
  const [plans, setPlans] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ service: params.get('service') || undefined });
  const [result, setResult] = useState(null);      // { intake_token, matches, risk_level }
  const [phase, setPhase] = useState('quiz');      // quiz | signup | confirm | plan
  const [form, setForm] = useState({ display_name: '', nickname: '', email: '', password: '' });
  const [plan, setPlan] = useState(params.get('plan') || 'standard');
  const [period, setPeriod] = useState(params.get('period') || 'monthly');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/questionnaire').then((d) => { setQuestions(d.questions); setPlans(d.plans); }).catch(() => {});
  }, []);

  const q = questions?.[step];
  const progress = questions ? Math.round(((step + (phase === 'quiz' ? 0 : 1)) / questions.length) * 100) : 0;
  const selected = q ? answers[q.id] : null;

  const pick = (value) => {
    if (!q) return;
    if (q.type === 'multi') {
      const exclusive = q.options.filter((o) => o.exclusive).map((o) => o.value);
      const cur = new Set(answers[q.id] || []);
      cur.has(value) ? cur.delete(value) : cur.add(value);
      // "Δεν ξέρω" cannot sit next to a real preference, in either direction.
      if (exclusive.includes(value)) {
        setAnswers({ ...answers, [q.id]: cur.has(value) ? [value] : [] });
        return;
      }
      exclusive.forEach((x) => cur.delete(x));
      setAnswers({ ...answers, [q.id]: [...cur] });
    } else {
      setAnswers({ ...answers, [q.id]: value });
      setTimeout(() => advance({ ...answers, [q.id]: value }), 120);
    }
  };

  const advance = async (current = answers) => {
    if (step < questions.length - 1) { setStep(step + 1); return; }
    setBusy(true); setError('');
    try {
      const d = await api.post('/intake', { answers: current });
      setResult(d);
      // Signed-in members are re-matched on the spot; new users create their
      // account first — the match is made for them at registration.
      if (user) {
        await api.post('/match', {});
        await refresh();
        nav('/app');
        return;
      }
      setPhase('signup');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const doSignup = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await register({ ...form, intake_token: result.intake_token, plan, billing_period: period });
      if (r?.needsEmailConfirmation) { setPhase('confirm'); return; }
      await refresh();
      setPhase('plan');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const checkout = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/subscription', { plan, billing_period: period, card_number: e.target.card?.value || '' });
      await refresh();
      nav('/app');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const planObj = useMemo(() => plans.find((p) => p.key === plan), [plans, plan]);
  const mult = { weekly: 0.25, monthly: 1, quarterly: 2.7 }[period];

  if (!questions) return <Spinner />;

  return (
    <main className="container section">
      <div className="wizard stack">
        {phase === 'quiz' && (
          <>
            <p className="small muted">Εγγραφή ως πελάτης · <Link to="/apply">είμαι θεραπευτής</Link></p>
            <div className="progress"><i style={{ width: `${(step / questions.length) * 100}%` }} /></div>
            <p className="small muted">Ερώτηση {step + 1} από {questions.length}</p>
            <h1 style={{ fontSize: '1.7rem' }}>{q.title}</h1>
            {q.subtitle && <p className="muted">{q.subtitle}</p>}
            {q.type === 'multi' && <p className="small muted">Μπορείς να διαλέξεις περισσότερα από ένα.</p>}
            <div>
              {q.options.map((o) => {
                const on = q.type === 'multi' ? (answers[q.id] || []).includes(o.value) : selected === o.value;
                return (
                  <button type="button" key={o.value} className={`choice ${on ? 'selected' : ''}`} onClick={() => pick(o.value)}>
                    <span className="choice-label">{o.label}</span>
                    {o.hint && <span className="choice-hint">{o.hint}</span>}
                  </button>
                );
              })}
            </div>
            {q.id === 'self_harm' && (
              <p className="small muted">
                Αν έχεις σκέψεις να βλάψεις τον εαυτό σου, ζήτα άμεσα βοήθεια: <b>112</b> ή <b>1018</b> (24/7).
              </p>
            )}
            <div className="spread">
              <button className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Πίσω</button>
              <button className="btn" disabled={busy || (q.type === 'multi' && !(answers[q.id] || []).length)} onClick={() => advance()}>
                {step === questions.length - 1 ? 'Δες τις προτάσεις' : 'Συνέχεια'} →
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </>
        )}

        {phase === 'signup' && (
          <div className="stack">
            {result?.crisis && (
              <div className="card" style={{ borderColor: 'var(--danger)' }}>
                <h3 style={{ color: 'var(--danger)' }}>Θέλουμε να είσαι ασφαλής</h3>
                <p className="small">
                  Από τις απαντήσεις σου φαίνεται ότι περνάς πολύ δύσκολη περίοδο. Το MindBridge δεν είναι υπηρεσία
                  έκτακτης ανάγκης. Αν σκέφτεσαι να βλάψεις τον εαυτό σου, κάλεσε τώρα το <b>112</b> ή τη
                  Γραμμή Παρέμβασης για την Αυτοκτονία <b>1018</b> (24/7, δωρεάν).
                </p>
                <Link className="btn secondary small" to="/crisis">Γραμμές άμεσης βοήθειας</Link>
              </div>
            )}

            <div className="card stack">
            <span className="pill">Βήμα 2 από 3</span>
            <h1 style={{ fontSize: '1.6rem' }}>Δημιούργησε τον λογαριασμό σου</h1>
            <p className="small muted">
              Βρήκαμε {result?.matches?.length ?? 5} θεραπευτές που ταιριάζουν στις ανάγκες σου και θα σε συνδέσουμε
              με τον καταλληλότερο. Μπορείς να χρησιμοποιήσεις ψευδώνυμο — δεν χρειάζεται το πραγματικό σου όνομα.
            </p>
            <form onSubmit={doSignup} className="stack">
              <div className="field">
                <label htmlFor="dn">Όνομα ή ψευδώνυμο</label>
                <input id="dn" required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="em">Email</label>
                <input id="em" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pw">Κωδικός (8+ χαρακτήρες)</label>
                <input id="pw" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              {error && <p className="error">{error}</p>}
              <button className="btn block" disabled={busy}>{busy ? 'Δημιουργία…' : 'Συνέχεια'}</button>
              <p className="small muted">Έχεις ήδη λογαριασμό; <Link to="/login">Σύνδεση</Link></p>
            </form>
            </div>
          </div>
        )}

        {phase === 'confirm' && (
          <div className="card stack">
            <span className="pill">Ένα βήμα ακόμα</span>
            <h1 style={{ fontSize: '1.5rem' }}>Έλεγξε το email σου</h1>
            <p>
              Στείλαμε σύνδεσμο επιβεβαίωσης στο <b>{form.email}</b>. Μόλις τον πατήσεις, ο λογαριασμός σου
              ενεργοποιείται και συνεχίζουμε από εκεί που μείναμε — ο θεραπευτής που διάλεξες σε περιμένει.
            </p>
            <p className="small muted">Δεν το βρίσκεις; Κοίτα και στα ανεπιθύμητα.</p>
            <Link className="btn secondary" to="/login">Πήγαινε στη σύνδεση</Link>
          </div>
        )}

        {phase === 'plan' && (
          <div className="stack">
            <span className="pill">Βήμα 3 από 3</span>
            <h1 style={{ fontSize: '1.6rem' }}>Διάλεξε το πακέτο σου</h1>
            <p className="small muted">Η πρώτη εβδομάδα είναι δωρεάν. Ακύρωση οποτεδήποτε.</p>
            <div className="row">
              {['weekly', 'monthly', 'quarterly'].map((p) => (
                <button key={p} className={`btn small ${period === p ? '' : 'secondary'}`} onClick={() => setPeriod(p)}>
                  {{ weekly: 'Εβδομαδιαία', monthly: 'Μηνιαία', quarterly: 'Τριμηνιαία' }[p]}
                </button>
              ))}
            </div>
            <div className="grid grid-3">
              {plans.map((p) => (
                <button key={p.key} className={`choice ${plan === p.key ? 'selected' : ''}`} onClick={() => setPlan(p.key)} style={{ marginBottom: 0 }}>
                  <b>{p.name}</b>
                  <div style={{ fontSize: '1.3rem', color: 'var(--teal-700)' }}>{euro(p.monthly_cents * mult)}</div>
                  <div className="small muted">{p.tagline}</div>
                </button>
              ))}
            </div>
            <form className="card stack" onSubmit={checkout}>
              <h3>Στοιχεία πληρωμής</h3>
              <p className="small muted">Demo περιβάλλον — μη χρησιμοποιήσεις πραγματική κάρτα. Δεν αποθηκεύονται στοιχεία κάρτας.</p>
              <div className="field">
                <label htmlFor="card">Αριθμός κάρτας</label>
                <input id="card" name="card" inputMode="numeric" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}><label htmlFor="exp">Λήξη</label><input id="exp" placeholder="12/29" defaultValue="12/29" /></div>
                <div className="field" style={{ flex: 1 }}><label htmlFor="cvc">CVC</label><input id="cvc" placeholder="123" defaultValue="123" /></div>
              </div>
              <div className="spread">
                <b>Σύνολο: {euro((planObj?.monthly_cents || 0) * mult)}</b>
                <button className="btn" disabled={busy}>{busy ? 'Επεξεργασία…' : 'Ενεργοποίηση συνδρομής'}</button>
              </div>
              {error && <p className="error">{error}</p>}
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
