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
    if (msg.type === 'message' && msg.room_id === roomId) {
      setState((s) => (s ? { ...s, messages: [...s.messages, msg.message] } : s));
      setTyping(false);
    }
    if (msg.type === 'typing' && msg.room_id === roomId) {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    }
  }), [roomId]);

  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [state?.messages?.length, typing]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { message } = await api.post(`/rooms/${roomId}/messages`, { body });
      setState((s) => ({ ...s, messages: [...s.messages, message] }));
      setDraft('');
    } catch (err) {
      alert(err.message);
    } finally { setSending(false); }
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
            <div className="small muted">{other.sub}</div>
          </div>
        </div>
        {!provider && <Link className="btn small secondary" to="/app/sessions">Κλείσε live συνεδρία</Link>}
      </div>

      <div className="chat-log" ref={logRef}>
        <div className="bubble system">
          Οι συνομιλίες είναι ιδιωτικές. Σε επείγον περιστατικό κάλεσε 112 ή 1018.
        </div>
        {state.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === user.id ? 'mine' : ''} ${m.kind === 'system' ? 'system' : ''}`}>
            {m.body}
            <div className="meta">{firstName(m.sender_name)} · {dt(m.created_at)}</div>
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
