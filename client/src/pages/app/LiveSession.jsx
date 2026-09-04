import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, dt } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Avatar, Spinner, modalityLabel } from '../../components/common.jsx';

// Simulated live room: a real deployment would embed a WebRTC/telehealth SDK here.
export default function LiveSession() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get('/sessions').then((d) => {
      const s = d.sessions.find((x) => String(x.id) === String(id));
      setSession(s || null);
      setNotes(s?.notes || '');
    });
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (session === null) return <Spinner />;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const isTherapist = user.role === 'therapist';
  const other = isTherapist ? session.client_name : session.therapist_name;

  const end = async (status = 'completed') => {
    await api.patch(`/sessions/${session.id}`, { status, ...(isTherapist ? { notes } : {}) });
    nav(isTherapist ? '/provider/sessions' : '/app/sessions');
  };

  return (
    <div className="stack">
      <h1>{modalityLabel(session.modality)} με {other}</h1>
      <p className="small muted">Προγραμματισμένη για {dt(session.starts_at)} · διάρκεια {session.duration_min}′</p>

      <div className="card stack" style={{ background: 'var(--teal-900)', color: '#fff' }}>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
          {cam ? (
            <div className="stack center">
              <Avatar name={other} size="lg" />
              <div>{other}</div>
              <div className="small" style={{ opacity: .7 }}>Σύνδεση ενεργή · {mm}:{ss}</div>
            </div>
          ) : <div className="small">Η κάμερα είναι κλειστή</div>}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn small secondary" onClick={() => setMic(!mic)}>{mic ? '🎙️ Μικρόφωνο on' : '🔇 Μικρόφωνο off'}</button>
          {session.modality === 'video' && (
            <button className="btn small secondary" onClick={() => setCam(!cam)}>{cam ? '🎥 Κάμερα on' : '📷 Κάμερα off'}</button>
          )}
          <button className="btn small danger" onClick={() => end('completed')}>Τερματισμός</button>
        </div>
      </div>

      {isTherapist && (
        <div className="card stack">
          <h3>Σημειώσεις συνεδρίας (ιδιωτικές)</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Παρατηρήσεις, στόχοι, εργασία για το σπίτι…" />
          <button className="btn small secondary" onClick={() => api.patch(`/sessions/${session.id}`, { notes })}>Αποθήκευση</button>
        </div>
      )}

      <p className="small muted">
        Demo περιβάλλον: η κλήση προσομοιώνεται. Σε παραγωγή εδώ ενσωματώνεται τηλεϊατρική πλατφόρμα με κρυπτογράφηση end-to-end.
      </p>
    </div>
  );
}
