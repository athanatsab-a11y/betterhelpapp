import { useEffect, useState } from 'react';
import { api, dt } from '../../lib/api.js';
import { Spinner } from '../../components/common.jsx';

const MOODS = ['😞', '🙁', '😐', '🙂', '😄'];

export default function Journal() {
  const [entries, setEntries] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', mood: 3, shared_with_therapist: false });
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/journal').then((d) => setEntries(d.entries)).catch(() => setEntries([]));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/journal', form);
      setForm({ title: '', body: '', mood: 3, shared_with_therapist: false });
      load();
    } finally { setBusy(false); }
  };

  const remove = async (id) => { await api.del(`/journal/${id}`); load(); };

  return (
    <div className="stack">
      <h1>Ημερολόγιο</h1>
      <p className="muted small">Κράτα σημειώσεις ανάμεσα στις συνεδρίες. Ό,τι δεν μοιράζεσαι, το βλέπεις μόνο εσύ.</p>

      <form className="card stack" onSubmit={save}>
        <div className="field">
          <label htmlFor="t">Τίτλος</label>
          <input id="t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="π.χ. Δύσκολη μέρα στη δουλειά" />
        </div>
        <div className="field">
          <label htmlFor="b">Τι σκέφτεσαι;</label>
          <textarea id="b" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <div className="field">
          <label>Πώς νιώθεις σήμερα;</label>
          <div className="mood-bar">
            {MOODS.map((m, i) => (
              <button type="button" key={m} className={form.mood === i + 1 ? 'selected' : ''} onClick={() => setForm({ ...form, mood: i + 1 })}>{m}</button>
            ))}
          </div>
        </div>
        <label className="row small" style={{ fontWeight: 400 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={form.shared_with_therapist}
            onChange={(e) => setForm({ ...form, shared_with_therapist: e.target.checked })} />
          Μοιράσου το με τον θεραπευτή μου
        </label>
        <button className="btn" disabled={busy || (!form.body && !form.title)}>Αποθήκευση</button>
      </form>

      {!entries ? <Spinner /> : entries.map((e) => (
        <div className="card stack" key={e.id}>
          <div className="spread">
            <b>{e.title}</b>
            <span className="small muted">{MOODS[(e.mood || 3) - 1]} {dt(e.created_at)}</span>
          </div>
          <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{e.body}</p>
          <div className="row">
            {e.shared_with_therapist ? <span className="pill">Κοινοποιημένο</span> : <span className="pill warn">Ιδιωτικό</span>}
            <button className="btn small ghost" onClick={() => remove(e.id)}>Διαγραφή</button>
          </div>
        </div>
      ))}
    </div>
  );
}
