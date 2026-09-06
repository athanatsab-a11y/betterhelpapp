import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, dt } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { createCall } from '../../lib/call.js';
import { Avatar, Spinner, modalityLabel } from '../../components/common.jsx';

const DEMO = import.meta.env.VITE_DEMO === '1';

const STATE_TEXT = {
  idle: 'Έτοιμο για σύνδεση',
  'requesting-media': 'Ζητάμε πρόσβαση σε κάμερα και μικρόφωνο…',
  waiting: 'Περιμένουμε τον συνομιλητή σου να μπει…',
  ringing: 'Ο συνομιλητής σου συνδέεται…',
  connecting: 'Γίνεται σύνδεση…',
  connected: 'Συνδεδεμένοι',
  reconnecting: 'Η σύνδεση αστάθησε — επανασύνδεση…',
  ended: 'Η κλήση τερματίστηκε',
  failed: 'Η σύνδεση απέτυχε',
};

export default function LiveSession() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [session, setSession] = useState(undefined);
  const [state, setState] = useState('idle');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [notes, setNotes] = useState('');

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const call = useRef(null);

  useEffect(() => {
    api.get('/sessions').then((d) => {
      const s = d.sessions.find((x) => String(x.id) === String(id)) || null;
      setSession(s);
      setNotes(s?.notes || '');
    });
  }, [id]);

  // Ο χρόνος μετρά από τη στιγμή που συνδέθηκαν πραγματικά, όχι από το άνοιγμα.
  useEffect(() => {
    if (state !== 'connected') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => {
    if (!session || DEMO) return;
    const withVideo = session.modality === 'video';
    const instance = createCall({
      roomId: session.room_id,
      selfId: user.id,
      peerId: session.peer_id,
      video: withVideo,
      onState: (s, d) => { setState(s); setDetail(d || ''); },
      onError: setError,
      onLocalStream: (stream) => { if (localVideo.current) localVideo.current.srcObject = stream; },
      onRemoteStream: (stream) => { if (remoteVideo.current) remoteVideo.current.srcObject = stream; },
    });
    call.current = instance;
    instance.start();
    return () => instance.stop();
  }, [session?.id, session?.room_id]);

  if (session === undefined) return <Spinner />;
  if (!session) return <div className="card">Η συνεδρία δεν βρέθηκε.</div>;

  const isTherapist = user.role === 'therapist';
  const other = session.peer_name || (isTherapist ? session.client_name : session.therapist_name);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const isVideo = session.modality === 'video';

  const setMicrophone = (on) => { setMic(on); call.current?.toggleAudio(on); };
  const setCamera = (on) => { setCam(on); call.current?.toggleVideo(on); };

  const end = async (status = 'completed') => {
    call.current?.stop();
    await api.patch(`/sessions/${session.id}`, { status, ...(isTherapist ? { notes } : {}) });
    nav(isTherapist ? '/provider/sessions' : '/app/sessions');
  };

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: '.2rem' }}>{modalityLabel(session.modality)} με {other}</h1>
          <p className="small muted">Προγραμματισμένη για {dt(session.starts_at)} · διάρκεια {session.duration_min}′</p>
        </div>
        <span className={`pill ${state === 'connected' ? 'ok' : state === 'failed' ? 'danger' : 'warn'}`}>
          {STATE_TEXT[state] || state}
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      {detail && state !== 'connected' && <p className="small muted">{detail}</p>}

      {DEMO ? (
        <div className="call-stage stack" style={{ placeItems: 'center' }}>
          <Avatar name={other} size="lg" />
          <b>{other}</b>
          <p className="small" style={{ maxWidth: 460, textAlign: 'center', opacity: .85 }}>
            Στην πραγματική εφαρμογή εδώ τρέχει κλήση WebRTC: ήχος και εικόνα ταξιδεύουν απευθείας
            ανάμεσα στις δύο συσκευές. Σε αυτό το demo δεν υπάρχει δεύτερος συμμετέχων για να συνδεθεί.
          </p>
        </div>
      ) : (
        <div className="call-stage">
          <video ref={remoteVideo} className="call-remote" autoPlay playsInline />
          {state !== 'connected' && (
            <div className="call-overlay stack" style={{ placeItems: 'center' }}>
              <Avatar name={other} size="lg" />
              <b>{other}</b>
              <span className="small" style={{ opacity: .8 }}>{STATE_TEXT[state]}</span>
            </div>
          )}
          {isVideo && <video ref={localVideo} className="call-local" autoPlay playsInline muted />}
          {state === 'connected' && <span className="call-timer">{mm}:{ss}</span>}
        </div>
      )}

      <div className="row" style={{ justifyContent: 'center' }}>
        <button className={`btn small ${mic ? 'secondary' : ''}`} onClick={() => setMicrophone(!mic)}>
          {mic ? '🎙️ Μικρόφωνο ανοιχτό' : '🔇 Μικρόφωνο κλειστό'}
        </button>
        {isVideo && (
          <button className={`btn small ${cam ? 'secondary' : ''}`} onClick={() => setCamera(!cam)}>
            {cam ? '🎥 Κάμερα ανοιχτή' : '📷 Κάμερα κλειστή'}
          </button>
        )}
        <button className="btn small danger" onClick={() => end('completed')}>Τερματισμός</button>
      </div>

      {state === 'failed' && (
        <div className="card stack">
          <b>Η απευθείας σύνδεση δεν στάθηκε δυνατή</b>
          <p className="small muted">
            Συνήθως φταίει αυστηρό εταιρικό δίκτυο. Δοκιμάστε άλλο δίκτυο ή συνεχίστε με
            <Link to={isTherapist ? '/provider' : '/app/room'}> μηνύματα</Link> ή τηλεφωνική συνεδρία.
          </p>
        </div>
      )}

      {isTherapist && (
        <div className="card stack">
          <h3>Σημειώσεις συνεδρίας (ιδιωτικές)</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Παρατηρήσεις, στόχοι, εργασία για το σπίτι…" />
          <button className="btn small secondary" onClick={() => api.patch(`/sessions/${session.id}`, { notes })}>Αποθήκευση</button>
        </div>
      )}

      <p className="small muted">
        Η κλήση είναι κρυπτογραφημένη από άκρο σε άκρο (DTLS-SRTP) και δεν περνά από τους διακομιστές μας —
        μεταφέρουμε μόνο τα μηνύματα σύνδεσης.
      </p>
    </div>
  );
}
