import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { TherapistCard, Spinner } from '../../components/common.jsx';

const REASONS = [
  'Δεν ένιωσα ότι ταιριάζουμε',
  'Θέλω θεραπευτή άλλου φύλου',
  'Θέλω διαφορετική θεραπευτική προσέγγιση',
  'Οι ώρες διαθεσιμότητας δεν με βολεύουν',
  'Αργεί να απαντήσει',
  'Άλλος λόγος',
];

export default function SwitchTherapist() {
  const { match, refresh } = useAuth();
  const [rows, setRows] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => { api.get('/therapists').then((d) => setRows(d.therapists)).catch(() => setRows([])); }, []);

  const pick = async (id) => {
    setBusy(true);
    try {
      await api.post('/match', { therapist_id: id, reason });
      await refresh();
      nav('/app/room');
    } catch (e) { alert(e.message); } finally { setBusy(false); }
  };

  if (!rows) return <Spinner />;
  const available = rows.filter((t) => t.id !== match?.id && t.accepting_clients);

  return (
    <div className="stack">
      <h1>Αλλαγή θεραπευτή</h1>
      <p className="muted small">
        Η αλλαγή είναι δωρεάν και δεν χρειάζεται να εξηγήσεις τον λόγο. Το ιστορικό των παλιών συνομιλιών
        παραμένει διαθέσιμο σε σένα.
      </p>

      <div className="card stack">
        <div className="field">
          <label htmlFor="r">Θέλεις να μας πεις γιατί; (προαιρετικό)</label>
          <select id="r" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <button className="btn" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await api.post('/match', { reason }); await refresh(); nav('/app/room'); }
          catch (e) { alert(e.message); } finally { setBusy(false); }
        }}>
          Πρότεινέ μου αυτόματα νέο θεραπευτή
        </button>
      </div>

      <h2>Ή διάλεξε μόνος/η σου</h2>
      <div className="grid grid-2">
        {available.map((t) => (
          <TherapistCard key={t.id} t={t} footer={<button className="btn small" disabled={busy} onClick={() => pick(t.id)}>Επίλεξε</button>} />
        ))}
      </div>
    </div>
  );
}
