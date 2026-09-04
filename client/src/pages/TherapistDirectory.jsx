import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { TherapistCard, Spinner } from '../components/common.jsx';

export default function TherapistDirectory() {
  const [meta, setMeta] = useState({ specialties: [], approaches: [] });
  const [rows, setRows] = useState(null);
  const [filters, setFilters] = useState({ specialty: '', language: '', gender: '', q: '' });

  useEffect(() => { api.get('/questionnaire').then(setMeta).catch(() => {}); }, []);
  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    setRows(null);
    api.get(`/therapists?${qs}`).then((d) => setRows(d.therapists)).catch(() => setRows([]));
  }, [filters]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <main className="container section stack">
      <h1>Οι θεραπευτές μας</h1>
      <p className="muted">Όλοι οι θεραπευτές είναι αδειούχοι, με ελεγμένα διαπιστευτήρια και κλινική εμπειρία.</p>

      <div className="card row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 220px' }}>
          <label htmlFor="q">Αναζήτηση</label>
          <input id="q" placeholder="όνομα ή θέμα" value={filters.q} onChange={set('q')} />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label htmlFor="sp">Ειδίκευση</label>
          <select id="sp" value={filters.specialty} onChange={set('specialty')}>
            <option value="">Όλες</option>
            {meta.specialties.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label htmlFor="lang">Γλώσσα</label>
          <select id="lang" value={filters.language} onChange={set('language')}>
            <option value="">Όλες</option>
            <option value="el">Ελληνικά</option>
            <option value="en">Αγγλικά</option>
            <option value="de">Γερμανικά</option>
          </select>
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label htmlFor="g">Φύλο</label>
          <select id="g" value={filters.gender} onChange={set('gender')}>
            <option value="">Αδιάφορο</option>
            <option value="female">Γυναίκα</option>
            <option value="male">Άνδρας</option>
            <option value="nonbinary">Μη δυαδικό άτομο</option>
          </select>
        </div>
      </div>

      {!rows ? <Spinner /> : (
        <>
          <p className="small muted">{rows.length} θεραπευτές</p>
          <div className="grid grid-3">
            {rows.map((t) => (
              <TherapistCard key={t.id} t={t} footer={<Link className="btn secondary small" to={`/therapists/${t.id}`}>Δες το προφίλ</Link>} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
