import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Spinner } from '../../components/common.jsx';

export default function ProviderProfile() {
  const [meta, setMeta] = useState({ specialties: [], approaches: [] });
  const [t, setT] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/questionnaire').then(setMeta).catch(() => {});
    api.get('/provider/overview').then((d) => setT(d.therapist)).catch(() => {});
  }, []);

  if (!t) return <Spinner />;

  const list = (csvStr) => (csvStr || '').split(',').filter(Boolean);
  const toggle = (field, key) => {
    const cur = new Set(list(t[field]));
    cur.has(key) ? cur.delete(key) : cur.add(key);
    setT({ ...t, [field]: [...cur].join(',') });
  };

  const save = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await api.patch('/provider/profile', {
        headline: t.headline, bio: t.bio, credentials: t.credentials,
        specialties: t.specialties, approaches: t.approaches, languages: t.languages,
        accepting_clients: t.accepting_clients ? 1 : 0, max_clients: Number(t.max_clients),
        avg_response_hours: Number(t.avg_response_hours),
      });
      setMsg('Το προφίλ ενημερώθηκε.');
    } catch (err) { setMsg(err.message); }
  };

  return (
    <form className="stack" onSubmit={save}>
      <h1>Το προφίλ μου</h1>
      {msg && <p className="success">{msg}</p>}

      <div className="card stack">
        <div className="field">
          <label htmlFor="hl">Τίτλος προφίλ</label>
          <input id="hl" value={t.headline || ''} onChange={(e) => setT({ ...t, headline: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="cr">Διαπιστευτήρια</label>
          <input id="cr" value={t.credentials || ''} onChange={(e) => setT({ ...t, credentials: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="bio">Βιογραφικό</label>
          <textarea id="bio" value={t.bio || ''} onChange={(e) => setT({ ...t, bio: e.target.value })} />
        </div>
      </div>

      <div className="card stack">
        <h3>Ειδικεύσεις</h3>
        <div className="row" style={{ gap: '.4rem' }}>
          {meta.specialties.map((s) => (
            <button type="button" key={s.key} className={`btn small ${list(t.specialties).includes(s.key) ? '' : 'secondary'}`} onClick={() => toggle('specialties', s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        <h3>Προσεγγίσεις</h3>
        <div className="row" style={{ gap: '.4rem' }}>
          {meta.approaches.map((s) => (
            <button type="button" key={s.key} className={`btn small ${list(t.approaches).includes(s.key) ? '' : 'secondary'}`} onClick={() => toggle('approaches', s.key)}>
              {s.label}
            </button>
          ))}
        </div>
        <h3>Γλώσσες</h3>
        <div className="row" style={{ gap: '.4rem' }}>
          {[['el', 'Ελληνικά'], ['en', 'Αγγλικά'], ['de', 'Γερμανικά']].map(([k, label]) => (
            <button type="button" key={k} className={`btn small ${list(t.languages).includes(k) ? '' : 'secondary'}`} onClick={() => toggle('languages', k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h3>Φόρτος εργασίας</h3>
        <label className="row small" style={{ fontWeight: 400 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={!!t.accepting_clients} onChange={(e) => setT({ ...t, accepting_clients: e.target.checked ? 1 : 0 })} />
          Δέχομαι νέα μέλη
        </label>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="mc">Μέγιστος αριθμός πελατών</label>
            <input id="mc" type="number" min="1" value={t.max_clients} onChange={(e) => setT({ ...t, max_clients: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="rh">Μέσος χρόνος απόκρισης (ώρες)</label>
            <input id="rh" type="number" min="1" value={t.avg_response_hours} onChange={(e) => setT({ ...t, avg_response_hours: e.target.value })} />
          </div>
        </div>
      </div>

      <button className="btn">Αποθήκευση</button>
    </form>
  );
}
