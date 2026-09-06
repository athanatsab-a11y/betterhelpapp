import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, dt, firstName } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Avatar, Spinner } from '../../components/common.jsx';
import { onSocket, sendSocket } from '../../lib/socket.js';

export default function Room({ provider = false }) {
  const { user, match } = useAuth();
  const { roomId: paramRoomId } = useParams();
  const [roomId, setRoomId] = useState(paramRoomId ? Number(paramRoomId) : null);
  const [state, setState] = useState(null);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState([]);      // μηνύματα που δεν έχουν φύγει ακόμη
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerReadAt, setPeerReadAt] = useState(null);
  const [offline, setOffline] = useState(false);
  const logRef = useRef(null);
  const typingTimer = useRef(null);

  // Clients land here without a room id: pick their active room.
  useEffect(() => {
    if (roomId) return;
    if (match?.room_id) { setRoomId(match.room_id); return; }
    api.get('/rooms').then((d) => setRoomId(d.rooms[0]?.room_id ?? 0)).catch(() => setRoomId(0));
  }, [match, roomId]);

  const load = useCallback(() => {
    if (!roomId) return;
    api.get(`/rooms/${roomId}/messages`).then(setState).catch(() => setState({ error: true }));
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => onSocket((msg) => {
    if (msg.type === 'socket:close') { setOffline(true); return; }
    if (msg.type === 'socket:open') {
      setOffline(false);
      // Ό,τι ήρθε όσο ήμασταν εκτός σύνδεσης το φέρνουμε με ένα φρέσκο φόρτωμα.
      if (msg.reconnected) load();
      return;
    }
    if (msg.room_id !== roomId) return;

    if (msg.type === 'message') {
      setState((s) => (s ? { ...s, messages: [...s.messages, msg.message] } : s));
      setTyping(false);
      sendSocket({ type: 'read', room_id: roomId });   // το διαβάσαμε μόλις τώρα
    }
    if (msg.type === 'typing') {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    }
    if (msg.type === 'presence') setPeerOnline(msg.online);
    if (msg.type === 'read') setPeerReadAt(msg.at);
  }), [roomId, load]);

  // Μπαίνοντας στο δωμάτιο, ό,τι υπάρχει θεωρείται διαβασμένο.
  useEffect(() => {
    if (state?.messages?.length) sendSocket({ type: 'read', room_id: roomId });
  }, [roomId, state?.messages?.length]);

  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [state?.messages?.length, typing]);

  // Το μήνυμα εμφανίζεται αμέσως· αν η αποστολή αποτύχει μένει σημειωμένο ώστε
  // να ξαναδοκιμάσει ο χρήστης, αντί να χαθεί.
  const deliver = async (body, tempId) => {
    try {
      const { message } = await api.post(`/rooms/${roomId}/messages`, { body });
      setPending((p) => p.filter((m) => m.temp_id !== tempId));
      setState((s) => ({ ...s, messages: [...s.messages, message] }));
    } catch (err) {
      setPending((p) => p.map((m) => (m.temp_id === tempId ? { ...m, failed: true, error: err.message } : m)));
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    const tempId = `t${Date.now()}`;
    setSending(true);
    setPending((p) => [...p, { temp_id: tempId, body, failed: false }]);
    setDraft('');
    await deliver(body, tempId);
    setSending(false);
  };

  const retry = (m) => {
    setPending((p) => p.map((x) => (x.temp_id === m.temp_id ? { ...x, failed: false } : x)));
    deliver(m.body, m.temp_id);
  };

  if (roomId === 0) {
    return (
      <div className="stack">
        <h1>Δωμάτιο θεραπείας</h1>
        <div className="card stack">
          <p>Δεν έχεις ακόμη ενεργό θεραπευτή.</p>
          <Link className="btn" to="/get-started">Βρες θεραπευτή</Link>
        </div>
      </div>
    );
  }
  if (!state) return <Spinner />;
  if (state.error) return <div className="card">Το δωμάτιο δεν βρέθηκε.</div>;

  const other = provider
    ? { name: state.room.client_nickname || state.room.client_name, sub: 'Μέλος' }
    : { name: state.room.therapist_name, sub: state.room.credentials };

  return (
    <div className="chat">
      <div className="spread" style={{ paddingBottom: '.8rem', borderBottom: '1px solid var(--line)' }}>
        <div className="row">
          <Avatar name={other.name} />
          <div>
            <b>{other.name}</b>
            <div className="small muted">
              {peerOnline ? <span className="presence-dot" aria-hidden="true" /> : null}
              {peerOnline ? 'σε σύνδεση' : other.sub}
            </div>
          </div>
        </div>
        {!provider && <Link className="btn small secondary" to="/app/sessions">Κλείσε live συνεδρία</Link>}
      </div>

      {offline && <div className="bubble system" style={{ background: '#fdecd8', color: '#8a5216' }}>
        Χωρίς σύνδεση — τα μηνύματα θα σταλούν μόλις επανέλθει.
      </div>}

      <div className="chat-log" ref={logRef}>
        <div className="bubble system">
          Οι συνομιλίες είναι ιδιωτικές. Σε επείγον περιστατικό κάλεσε 112 ή 1018.
        </div>
        {state.messages.map((m, i) => {
          const mine = m.sender_id === user.id;
          const isLastMine = mine && !state.messages.slice(i + 1).some((x) => x.sender_id === user.id);
          const seen = m.read_at || (peerReadAt && new Date(peerReadAt) > new Date(`${m.created_at}Z`.replace('ZZ', 'Z')));
          return (
            <div key={m.id} className={`bubble ${mine ? 'mine' : ''} ${m.kind === 'system' ? 'system' : ''}`}>
              {m.body}
              <div className="meta">
                {firstName(m.sender_name)} · {dt(m.created_at)}
                {isLastMine && <> · {seen ? 'διαβάστηκε' : 'στάλθηκε'}</>}
              </div>
            </div>
          );
        })}
        {pending.map((m) => (
          <div key={m.temp_id} className={`bubble mine ${m.failed ? 'failed' : 'sending'}`}>
            {m.body}
            <div className="meta">
              {m.failed ? (
                <>δεν στάλθηκε · <button className="link-btn" onClick={() => retry(m)}>δοκίμασε ξανά</button></>
              ) : 'αποστολή…'}
            </div>
          </div>
        ))}
        {typing && <div className="bubble small muted">γράφει…</div>}
      </div>

      <form className="composer" onSubmit={send}>
        <textarea
          value={draft}
          placeholder="Γράψε το μήνυμά σου… (Enter για αποστολή)"
          onChange={(e) => { setDraft(e.target.value); sendSocket({ type: 'typing', room_id: roomId }); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
        />
        <button className="btn" disabled={sending || !draft.trim()}>Αποστολή</button>
      </form>
    </div>
  );
}
