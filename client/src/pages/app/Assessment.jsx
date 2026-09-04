import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, dt } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Spinner } from '../../components/common.jsx';

// Clinical intake: the questionnaire the therapist reads before the first contact.
export default function Assessment() {
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => { api.get('/assessment').then(setData).catch(() => setData({ sections: [], history: [] })); }, []);

  const sections = data?.sections || [];
  const section = sections[step];
  const done = useMemo(() => {
    if (!section) return false;
    if (section.scale === 'text') return true;
    return section.items.every((i) => answers[i.key] !== undefined && answers[i.key] !== '');
  }, [section, answers]);

  if (!data) return <Spinner />;

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.post('/assessment', { answers });
      setResult(r);
      await refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (result) {
    return (
      <div className="stack">
        <h1>Ευχαριστούμε — το έστειλα στον θεραπευτή σου</h1>
        {result.crisis && (
          <div className="card stack" style={{ borderColor: 'var(--danger)' }}>
            <h3 style={{ color: 'var(--danger)' }}>Θέλουμε να είσαι ασφαλής</h3>
            <p className="small">
              Ανέφερες σκέψεις να βλάψεις τον εαυτό σου. Το MindBridge δεν είναι υπηρεσία έκτακτης ανάγκης.
              Αν κινδυνεύεις τώρα, κάλεσε <b>112</b> ή τη Γραμμή Παρέμβασης για την Αυτοκτονία <b>1018</b> (24/7).
            </p>
            <Link className="btn secondary small" to="/crisis">Γραμμές άμεσης βοήθειας</Link>
          </div>
        )}
        <div className="grid grid-2">
          {Object.entries(result.scores).map(([key, s]) => (
            <ScoreCard key={key} id={key} score={s} />
          ))}
        </div>
        <p className="small muted">
          Τα αποτελέσματα είναι ένδειξη, όχι διάγνωση. Ο θεραπευτής σου θα τα συζητήσει μαζί σου.
          Μπορείς να επαναλάβεις το ερωτηματολόγιο ανά πάσα στιγμή για να βλέπεις την πορεία σου.
        </p>
        <div className="row">
          <button className="btn" onClick={() => nav('/app')}>Πήγαινε στον χώρο μου</button>
          <Link className="btn secondary" to="/app/room">Γράψε στον θεραπευτή σου</Link>
        </div>
      </div>
    );
  }

  const isLast = step === sections.length - 1;

  return (
    <div className="stack">
      <div>
        <h1>Ας σε γνωρίσουμε καλύτερα</h1>
        <p className="muted small">
          {sections.length} σύντομες ενότητες. Οι απαντήσεις πάνε μόνο στον θεραπευτή σου και σε βοηθούν
          να ξεκινήσετε από το σωστό σημείο αντί να ξοδέψετε την πρώτη συνεδρία σε ερωτήσεις ρουτίνας.
        </p>
      </div>

      <div className="progress"><i style={{ width: `${(step / sections.length) * 100}%` }} /></div>
      <p className="small muted">Ενότητα {step + 1} από {sections.length} · {section.title}</p>

      <div className="card stack">
        <h2 style={{ fontSize: '1.15rem' }}>{section.intro}</h2>

        {section.scale === 'freq' && section.items.map((item) => (
          <fieldset className="q-block" key={item.key}>
            <legend className={item.critical ? 'critical' : ''}>{item.label}</legend>
            <div className="scale">
              {data.scale.map((opt) => (
                <button type="button" key={opt.value}
                  className={`scale-opt ${answers[item.key] === opt.value ? 'on' : ''}`}
                  onClick={() => setAnswers({ ...answers, [item.key]: opt.value })}>
                  <b>{opt.value}</b><span>{opt.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        {section.scale === 'choice' && section.items.map((item) => (
          <div className="field" key={item.key}>
            <label htmlFor={item.key}>{item.label}</label>
            <select id={item.key} value={answers[item.key] ?? ''}
              onChange={(e) => setAnswers({ ...answers, [item.key]: e.target.value })}>
              <option value="">Διάλεξε…</option>
              {item.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {section.scale === 'text' && section.items.map((item) => (
          <div className="field" key={item.key}>
            <label htmlFor={item.key}>{item.label}</label>
            {item.type === 'textarea'
              ? <textarea id={item.key} value={answers[item.key] ?? ''} onChange={(e) => setAnswers({ ...answers, [item.key]: e.target.value })} />
              : <input id={item.key} value={answers[item.key] ?? ''} onChange={(e) => setAnswers({ ...answers, [item.key]: e.target.value })} />}
          </div>
        ))}

        {answers.self_harm >= 1 && section.id === 'mood' && (
          <p className="small" style={{ color: 'var(--danger)' }}>
            Αν σκέφτεσαι να βλάψεις τον εαυτό σου, ζήτα βοήθεια τώρα: <b>112</b> ή <b>1018</b> (24/7, δωρεάν).
          </p>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      <div className="spread">
        <button className="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Πίσω</button>
        {isLast
          ? <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Αποστολή…' : 'Ολοκλήρωση'}</button>
          : <button className="btn" disabled={!done} onClick={() => setStep(step + 1)}>Συνέχεια →</button>}
      </div>

      {data.history.length > 0 && (
        <p className="small muted">Τελευταία συμπλήρωση: {dt(data.history[0].created_at)}</p>
      )}
    </div>
  );
}

export function ScoreCard({ id, score }) {
  const title = { mood: 'Διάθεση', anxiety: 'Άγχος' }[id] || id;
  const pct = Math.round((score.total / score.max) * 100);
  const tone = pct >= 70 ? 'danger' : pct >= 45 ? 'warn' : 'ok';
  return (
    <div className="card stack">
      <div className="spread">
        <h3 style={{ marginBottom: 0 }}>{title}</h3>
        <span className={`pill ${tone}`}>{score.label}</span>
      </div>
      <div className="meter"><i className={tone} style={{ width: `${pct}%` }} /></div>
      <div className="small muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{score.total} στα {score.max}</div>
    </div>
  );
}
