import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dt, day, STATUS } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Spinner, modalityLabel } from '../../components/common.jsx';

export default function Sessions() {
  const { match } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [slots, setSlots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get('/sessions').then((d) => setSessions(d.sessions)).catch(() => setSessions([]));
    if (match) api.get(`/therapists/${match.id}/slots`).then((d) => setSlots(d.slots)).catch(() => {});
  };
  useEffect(() => { load(); }, [match?.id]);

  const book = async (slot) => {
    setBusy(true); setMsg('');
    try {
      await api.post('/sessions', { slot_id: slot.id });
      setMsg('Η συνεδρία κλείστηκε. Θα λάβεις υπενθύμιση.');
      load();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  const cancel = async (s) => {
    if (!confirm('Να ακυρωθεί η συνεδρία;')) return;
    await api.patch(`/sessions/${s.id}`, { status: 'cancelled' });
    load();
  };

  if (!sessions) return <Spinner />;

  const upcoming = sessions.filter((s) => s.status === 'scheduled');
  const past = sessions.filter((s) => s.status !== 'scheduled');
  const byDay = slots.reduce((acc, s) => {
    const k = day(s.starts_at);
    (acc[k] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="stack">
      <h1>Live συνεδρίες</h1>
      {msg && <p className="success">{msg}</p>}

      <div className="card stack">
        <h3>Οι συνεδρίες μου</h3>
        {upcoming.length === 0 && <p className="small muted">Δεν έχεις προγραμματισμένη συνεδρία.</p>}
        {upcoming.map((s) => (
          <div className="spread" key={s.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: '.6rem' }}>
            <div>
              <b>{dt(s.starts_at)}</b>
              <div className="small muted">{modalityLabel(s.modality)} · {s.duration_min}′ · με {s.therapist_name}</div>
            </div>
            <div className="row">
              <Link className="btn small" to={`/app/sessions/${s.id}/live`}>Είσοδος</Link>
              <button className="btn small ghost" onClick={() => cancel(s)}>Ακύρωση</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h3>Διαθέσιμα ραντεβού {match ? `με ${match.display_name}` : ''}</h3>
        {!match && <p className="small muted">Χρειάζεσαι ενεργό θεραπευτή για να κλείσεις συνεδρία.</p>}
        {Object.entries(byDay).slice(0, 8).map(([d, list]) => (
          <div key={d}>
            <div className="small muted" style={{ textTransform: 'capitalize' }}>{d}</div>
            <div className="row" style={{ gap: '.5rem', marginTop: '.3rem' }}>
              {list.map((s) => (
                <button key={s.id} className="btn small secondary" disabled={busy} onClick={() => book(s)}>
                  {new Date(s.starts_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })} · {modalityLabel(s.modality)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {past.length > 0 && (
        <div className="card stack">
          <h3>Ιστορικό</h3>
          <table className="table">
            <thead><tr><th>Ημερομηνία</th><th>Τρόπος</th><th>Κατάσταση</th></tr></thead>
            <tbody>
              {past.map((s) => (
                <tr key={s.id}><td>{dt(s.starts_at)}</td><td>{modalityLabel(s.modality)}</td><td>{STATUS[s.status] || s.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
