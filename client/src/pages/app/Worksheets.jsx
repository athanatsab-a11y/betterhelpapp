import { useEffect, useState } from 'react';
import { api, dt } from '../../lib/api.js';
import { Spinner } from '../../components/common.jsx';

export default function Worksheets() {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/worksheets').then(setData).catch(() => setData({ library: [], assignments: [] }));
  useEffect(load, []);

  const open = (a) => { setActive(a); setAnswers(a.answers || {}); };

  const start = async (w) => {
    const { assignment_id } = await api.post(`/worksheets/${w.slug}/start`);
    const d = await api.get('/worksheets');
    setData(d);
    open(d.assignments.find((a) => a.id === assignment_id));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/worksheet-assignments/${active.id}`, { answers });
      setActive(null);
      load();
    } finally { setBusy(false); }
  };

  if (!data) return <Spinner />;

  if (active) {
    return (
      <div className="stack">
        <button className="btn ghost small" onClick={() => setActive(null)}>← Πίσω</button>
        <h1>{active.title}</h1>
        <p className="muted small">{active.description}</p>
        <form className="card stack" onSubmit={submit}>
          {active.fields.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea id={f.key} value={answers[f.key] || ''} onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })} />
              ) : f.type === 'select' ? (
                <select id={f.key} value={answers[f.key] || ''} onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })}>
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input id={f.key} type={f.type === 'number' ? 'number' : 'text'} value={answers[f.key] || ''}
                  onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          <button className="btn" disabled={busy}>Υποβολή στον θεραπευτή μου</button>
        </form>
      </div>
    );
  }

  const pending = data.assignments.filter((a) => a.status !== 'completed');
  const done = data.assignments.filter((a) => a.status === 'completed');

  return (
    <div className="stack">
      <h1>Φύλλα εργασίας</h1>

      <div className="card stack">
        <h3>Σε εκκρεμότητα ({pending.length})</h3>
        {pending.length === 0 && <p className="small muted">Δεν έχεις εκκρεμότητες.</p>}
        {pending.map((a) => (
          <div className="spread" key={a.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>
            <div><b>{a.title}</b><div className="small muted">{a.category} · ανατέθηκε {dt(a.assigned_at)}</div></div>
            <button className="btn small" onClick={() => open(a)}>Συμπλήρωσε</button>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h3>Βιβλιοθήκη</h3>
        <div className="grid grid-2">
          {data.library.map((w) => (
            <div className="card flat" key={w.id}>
              <span className="pill">{w.category}</span>
              <h4 style={{ marginTop: '.5rem' }}>{w.title}</h4>
              <p className="small muted">{w.description}</p>
              <button className="btn small secondary" onClick={() => start(w)}>Ξεκίνα</button>
            </div>
          ))}
        </div>
      </div>

      {done.length > 0 && (
        <div className="card stack">
          <h3>Ολοκληρωμένα</h3>
          {done.map((a) => (
            <div className="spread" key={a.id}>
              <span className="small">{a.title}</span>
              <span className="small muted">{dt(a.completed_at)}</span>
              <button className="btn small ghost" onClick={() => open(a)}>Δες</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
