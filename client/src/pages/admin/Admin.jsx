import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dt } from '../../lib/api.js';
import { Avatar, Spinner, useSpecialtyLabels } from '../../components/common.jsx';

const STATUS = { pending: 'Σε αναμονή', approved: 'Εγκεκριμένος', rejected: 'Απορρίφθηκε' };

export default function Admin() {
  const [rows, setRows] = useState(null);
  const [note, setNote] = useState({});
  const [busy, setBusy] = useState(0);
  const labels = useSpecialtyLabels();

  const load = () => api.get('/admin/applications').then((d) => setRows(d.applications)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const review = async (t, decision) => {
    setBusy(t.id);
    try { await api.post(`/admin/applications/${t.id}`, { decision, note: note[t.id] }); await load(); }
    finally { setBusy(0); }
  };

  if (!rows) return <Spinner />;
  const pending = rows.filter((r) => r.status === 'pending');
  const reviewed = rows.filter((r) => r.status !== 'pending');

  return (
    <main className="app-main stack">
      <nav className="tabs">
        <Link to="/admin/analytics">Δεδομένα</Link>
        <Link to="/admin" className="active">Αιτήσεις</Link>
      </nav>
      <h1>Αιτήσεις θεραπευτών</h1>
      <div className="row">
        <span className="pill warn">{pending.length} σε αναμονή</span>
        <span className="pill ok">{rows.filter((r) => r.status === 'approved').length} εγκεκριμένοι</span>
      </div>

      {pending.length === 0 && <p className="muted small">Καμία εκκρεμής αίτηση.</p>}
      {pending.map((t) => (
        <article className="card stack" key={t.id}>
          <div className="row">
            <Avatar name={t.display_name} />
            <div style={{ flex: '1 1 240px' }}>
              <h3 style={{ marginBottom: 0 }}>{t.display_name}</h3>
              <div className="small muted">{t.credentials}</div>
              <div className="small">{t.email}{t.phone ? ` · ${t.phone}` : ''}</div>
            </div>
            <span className="pill warn">Υποβλήθηκε {dt(t.applied_at)}</span>
          </div>
          <table className="table">
            <tbody>
              <tr><th>Αρ. άδειας</th><td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.license_no}</td></tr>
              <tr><th>Εμπειρία</th><td>{t.years_experience} χρόνια</td></tr>
              <tr><th>Ειδικεύσεις</th><td>{(t.specialties || '').split(',').filter(Boolean).map((s) => labels[s] || s).join(', ')}</td></tr>
              <tr><th>Προσεγγίσεις</th><td>{(t.approaches || '').split(',').filter(Boolean).map((s) => labels[s] || s).join(', ') || '—'}</td></tr>
              <tr><th>Γλώσσες</th><td>{(t.languages || '').split(',').filter(Boolean).join(', ')}</td></tr>
              <tr><th>Φόρτος</th><td>έως {t.max_clients} μέλη · απόκριση {t.avg_response_hours}ω</td></tr>
            </tbody>
          </table>
          {t.bio && <p className="small">{t.bio}</p>}
          <div className="field">
            <label htmlFor={`n${t.id}`}>Σημείωση αξιολόγησης (φαίνεται στον θεραπευτή αν απορριφθεί)</label>
            <input id={`n${t.id}`} value={note[t.id] || ''} onChange={(e) => setNote({ ...note, [t.id]: e.target.value })} />
          </div>
          <div className="row">
            <button className="btn" disabled={busy === t.id} onClick={() => review(t, 'approved')}>Έγκριση</button>
            <button className="btn danger" disabled={busy === t.id} onClick={() => review(t, 'rejected')}>Απόρριψη</button>
          </div>
        </article>
      ))}

      <h2>Ιστορικό</h2>
      <table className="table">
        <thead><tr><th>Θεραπευτής</th><th>Άδεια</th><th>Κατάσταση</th><th>Αξιολογήθηκε</th></tr></thead>
        <tbody>
          {reviewed.map((t) => (
            <tr key={t.id}>
              <td>{t.display_name}</td>
              <td>{t.license_no}</td>
              <td><span className={`pill ${t.status === 'approved' ? 'ok' : 'danger'}`}>{STATUS[t.status]}</span></td>
              <td>{t.reviewed_at ? dt(t.reviewed_at) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
