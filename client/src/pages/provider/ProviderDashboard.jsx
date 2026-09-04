import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dt } from '../../lib/api.js';
import { Avatar, Spinner, modalityLabel } from '../../components/common.jsx';

export default function ProviderDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/provider/overview').then(setData).catch(() => setData({ clients: [], upcoming: [] })); }, []);
  if (!data) return <Spinner />;

  return (
    <div className="stack">
      <h1>Οι πελάτες μου</h1>
      <div className="row">
        <span className="pill">{data.clients.length} ενεργοί</span>
        <span className="pill warn">{data.clients.reduce((a, c) => a + c.unread, 0)} αδιάβαστα μηνύματα</span>
        <span className="pill ok">{data.upcoming.length} επερχόμενες συνεδρίες</span>
      </div>

      <div className="grid grid-2">
        {data.clients.map((c) => (
          <div className="card stack" key={c.match_id}>
            <div className="spread">
              <div className="row">
                <Avatar name={c.nickname || c.display_name} />
                <div>
                  <b>{c.nickname || c.display_name}</b>
                  <div className="small muted">Ξεκίνησε {dt(c.started_at)}</div>
                </div>
              </div>
              {c.risk_level === 'crisis' && <span className="pill danger">Υψηλός κίνδυνος</span>}
              {c.risk_level === 'elevated' && <span className="pill warn">Αυξημένος κίνδυνος</span>}
            </div>
            <div className="row">
              <Link className="btn small" to={`/provider/room/${c.room_id}`}>
                Μηνύματα{c.unread ? ` (${c.unread})` : ''}
              </Link>
              <Link className="btn small secondary" to={`/provider/clients/${c.client_id}`}>Φάκελος</Link>
            </div>
          </div>
        ))}
        {data.clients.length === 0 && <p className="muted small">Δεν έχεις ακόμη ενεργούς πελάτες.</p>}
      </div>

      <div className="card stack">
        <h3>Επερχόμενες συνεδρίες</h3>
        {data.upcoming.length === 0 && <p className="small muted">Καμία προγραμματισμένη.</p>}
        {data.upcoming.map((s) => (
          <div className="spread" key={s.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>
            <div><b>{dt(s.starts_at)}</b><div className="small muted">{s.client_name} · {modalityLabel(s.modality)}</div></div>
            <Link className="btn small" to={`/provider/sessions/${s.id}/live`}>Είσοδος</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
