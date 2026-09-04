import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Avatar } from '../components/common.jsx';

export default function Reviews() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get('/therapists').then(async (d) => {
      const details = await Promise.all(d.therapists.slice(0, 8).map((t) => api.get(`/therapists/${t.id}`)));
      setRows(details.flatMap((x) => x.reviews.map((r) => ({ ...r, therapist: x.therapist.display_name }))));
    }).catch(() => {});
  }, []);

  const avg = rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(1) : '—';

  return (
    <main className="container section stack">
      <h1>Κριτικές μελών</h1>
      <p className="muted">Μέση βαθμολογία <b>{avg}/5</b> από {rows.length} δημοσιευμένες κριτικές.</p>
      <div className="grid grid-3">
        {rows.map((r, i) => (
          <div className="card stack" key={i}>
            <div className="small">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
            <p className="small">{r.body}</p>
            <div className="row">
              <Avatar name={r.therapist} size="sm" />
              <div className="small muted">για {r.therapist}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="center"><Link className="btn" to="/get-started">Ξεκίνα κι εσύ</Link></p>
    </main>
  );
}
