import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dt } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Spinner } from '../../components/common.jsx';

export default function Notifications() {
  const [rows, setRows] = useState(null);
  const { refresh } = useAuth();

  useEffect(() => {
    api.get('/notifications').then(async (d) => {
      setRows(d.notifications);
      await api.post('/notifications/read');
      refresh();
    }).catch(() => setRows([]));
  }, []);

  if (!rows) return <Spinner />;

  return (
    <div className="stack">
      <h1>Ειδοποιήσεις</h1>
      {rows.length === 0 && <p className="muted small">Δεν υπάρχουν ειδοποιήσεις.</p>}
      {rows.map((n) => (
        <div className="card" key={n.id}>
          <div className="spread">
            <b>{n.title}</b>
            <span className="small muted">{dt(n.created_at)}</span>
          </div>
          <p className="small">{n.body}</p>
          {n.link && <Link className="small" to={n.link.startsWith('/room/') ? '/app/room' : n.link}>Άνοιγμα →</Link>}
        </div>
      ))}
    </div>
  );
}
