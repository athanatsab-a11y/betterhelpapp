import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, dt } from '../../lib/api.js';
import { Spinner, useSpecialtyLabels } from '../../components/common.jsx';

export default function ProviderClient() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [library, setLibrary] = useState([]);
  const [slug, setSlug] = useState('');
  const [msg, setMsg] = useState('');
  const labels = useSpecialtyLabels();

  const load = () => api.get(`/provider/clients/${id}`).then(setData).catch(() => setData({ error: true }));
  useEffect(() => { load(); api.get('/worksheets').then((d) => { setLibrary(d.library); setSlug(d.library[0]?.slug || ''); }); }, [id]);

  if (!data) return <Spinner />;
  if (data.error) return <div className="card">Δεν βρέθηκε.</div>;

  const assign = async () => {
    await api.post('/provider/assign-worksheet', { client_id: Number(id), slug });
    setMsg('Ανατέθηκε.');
    load();
  };

  const a = data.intake?.answers || {};

  return (
    <div className="stack">
      <Link className="small" to="/provider">← Πίσω στους πελάτες</Link>
      <h1>{data.client.nickname || data.client.display_name}</h1>
      <p className="small muted">Μέλος από {dt(data.client.created_at)} · {data.client.timezone}</p>

      <div className="card stack">
        <h3>Ερωτηματολόγιο εισαγωγής</h3>
        {data.intake ? (
          <>
            <div className="row">
              <span className={`pill ${data.intake.risk_level === 'crisis' ? 'danger' : data.intake.risk_level === 'elevated' ? 'warn' : 'ok'}`}>
                Κίνδυνος: {data.intake.risk_level}
              </span>
              <span className="pill">{data.intake.service}</span>
            </div>
            <table className="table">
              <tbody>
                <tr><th>Ηλικία</th><td>{a.age}</td></tr>
                <tr><th>Θέματα</th><td>{(a.topics || []).map((t) => labels[t] || t).join(', ')}</td></tr>
                <tr><th>Ύπνος</th><td>{a.sleep}</td></tr>
                <tr><th>Διάθεση</th><td>{a.mood}</td></tr>
                <tr><th>Αυτοτραυματισμός</th><td>{a.self_harm}</td></tr>
                <tr><th>Προηγούμενη θεραπεία</th><td>{a.therapy_before}</td></tr>
                <tr><th>Προτιμώμενοι τρόποι</th><td>{(a.modality || []).join(', ')}</td></tr>
              </tbody>
            </table>
          </>
        ) : <p className="small muted">Δεν υπάρχει ερωτηματολόγιο.</p>}
      </div>

      <div className="card stack">
        <h3>Ανάθεση φύλλου εργασίας</h3>
        <div className="row">
          <select value={slug} onChange={(e) => setSlug(e.target.value)} style={{ maxWidth: 320 }}>
            {library.map((w) => <option key={w.slug} value={w.slug}>{w.title}</option>)}
          </select>
          <button className="btn small" onClick={assign}>Ανάθεση</button>
          {msg && <span className="success small">{msg}</span>}
        </div>
        {data.worksheets.map((w) => (
          <div className="spread small" key={w.id}>
            <span>{w.title}</span>
            <span className={`pill ${w.status === 'completed' ? 'ok' : 'warn'}`}>{w.status === 'completed' ? 'Ολοκληρώθηκε' : 'Σε εκκρεμότητα'}</span>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h3>Κοινοποιημένες σημειώσεις ημερολογίου</h3>
        {data.journal.length === 0 && <p className="small muted">Ο πελάτης δεν έχει μοιραστεί σημειώσεις.</p>}
        {data.journal.map((j) => (
          <div key={j.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: '.5rem' }}>
            <div className="spread"><b className="small">{j.title}</b><span className="small muted">{dt(j.created_at)} · διάθεση {j.mood}/5</span></div>
            <p className="small">{j.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
