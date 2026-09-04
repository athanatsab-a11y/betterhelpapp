import { useEffect, useState } from 'react';
import { api, dt } from '../../lib/api.js';
import { Spinner } from '../../components/common.jsx';

export default function Groupinars() {
  const [rows, setRows] = useState(null);
  const load = () => api.get('/groupinars').then((d) => setRows(d.groupinars)).catch(() => setRows([]));
  useEffect(load, []);

  const toggle = async (g) => {
    if (g.is_registered) await api.del(`/groupinars/${g.id}/register`);
    else await api.post(`/groupinars/${g.id}/register`);
    load();
  };

  if (!rows) return <Spinner />;

  return (
    <div className="stack">
      <h1>Groupinars</h1>
      <p className="muted small">Ζωντανά διαδικτυακά σεμινάρια με θεραπευτές μας. Περιλαμβάνονται στη συνδρομή σου.</p>
      <div className="grid grid-2">
        {rows.map((g) => (
          <div className="card stack" key={g.id}>
            <div className="spread">
              <h3 style={{ marginBottom: 0 }}>{g.title}</h3>
              {g.is_registered ? <span className="pill ok">Δηλωμένος</span> : null}
            </div>
            <p className="small muted">{g.description}</p>
            <div className="small">
              {dt(g.starts_at)} · {g.duration_min}′ · με {g.host_name}<br />
              {g.registered}/{g.capacity} συμμετέχοντες
            </div>
            <button className={`btn small ${g.is_registered ? 'secondary' : ''}`} onClick={() => toggle(g)}>
              {g.is_registered ? 'Ακύρωση δήλωσης' : 'Δήλωσε συμμετοχή'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
