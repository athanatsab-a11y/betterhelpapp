import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dt, STATUS } from '../../lib/api.js';
import { Spinner, modalityLabel } from '../../components/common.jsx';

export default function ProviderSessions() {
  const [rows, setRows] = useState(null);
  const load = () => api.get('/sessions').then((d) => setRows(d.sessions)).catch(() => setRows([]));
  useEffect(load, []);
  if (!rows) return <Spinner />;

  const mark = async (s, status) => { await api.patch(`/sessions/${s.id}`, { status }); load(); };

  return (
    <div className="stack">
      <h1>Συνεδρίες</h1>
      <table className="table">
        <thead><tr><th>Ώρα</th><th>Πελάτης</th><th>Τρόπος</th><th>Κατάσταση</th><th /></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>{dt(s.starts_at)}</td>
              <td>{s.client_name}</td>
              <td>{modalityLabel(s.modality)}</td>
              <td>{STATUS[s.status] || s.status}</td>
              <td className="row" style={{ gap: '.3rem' }}>
                {s.status === 'scheduled' && <Link className="btn small" to={`/provider/sessions/${s.id}/live`}>Είσοδος</Link>}
                {s.status === 'scheduled' && <button className="btn small ghost" onClick={() => mark(s, 'no_show')}>Δεν προσήλθε</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted small">Καμία συνεδρία.</p>}
    </div>
  );
}
