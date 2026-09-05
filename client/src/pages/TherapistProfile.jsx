import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, dt, firstName } from '../lib/api.js';
import { Avatar, Spinner, useSpecialtyLabels, useApproachInfo } from '../components/common.jsx';

export default function TherapistProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const labels = useSpecialtyLabels();
  const approachInfo = useApproachInfo();

  useEffect(() => { api.get(`/therapists/${id}`).then(setData).catch(() => setData({ error: true })); }, [id]);

  if (!data) return <Spinner />;
  if (data.error) return <main className="container section"><h1>Δεν βρέθηκε</h1></main>;
  const t = data.therapist;

  return (
    <main className="container section stack">
      <div className="card row" style={{ alignItems: 'flex-start' }}>
        <Avatar name={t.display_name} size="lg" />
        <div style={{ flex: '1 1 340px' }}>
          <h1 style={{ fontSize: '1.9rem' }}>{t.display_name}</h1>
          <p className="muted small">{t.credentials} · Αρ. αδείας {t.license_no}</p>
          <p className="small">★ {t.rating} ({t.reviews_count} κριτικές) · {t.years_experience} χρόνια εμπειρίας · απόκριση ~{t.avg_response_hours}ω</p>
          <div className="row" style={{ gap: '.4rem' }}>
            {t.specialties.map((s) => <span key={s} className="pill">{labels[s] || s}</span>)}
          </div>
        </div>
        <Link className="btn" to="/get-started">Ξεκίνα με τον/την {firstName(t.display_name)}</Link>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <h3>Σχετικά</h3>
          <p className="small">{t.bio}</p>
          <div>
            <h4 style={{ marginBottom: '.4rem' }}>Πώς δουλεύει</h4>
            <dl className="approach-list">
              {t.approaches.map((a) => (
                <div key={a}>
                  <dt>{approachInfo[a]?.label || labels[a] || a}</dt>
                  {approachInfo[a]?.hint && <dd className="small muted">{approachInfo[a].hint}</dd>}
                </div>
              ))}
            </dl>
          </div>
          <div className="small muted">
            Γλώσσες: {t.languages.map((l) => ({ el: 'Ελληνικά', en: 'Αγγλικά', de: 'Γερμανικά' }[l] || l)).join(', ')}<br />
            {t.lgbtq_friendly ? 'ΛΟΑΤΚΙ+ φιλικό περιβάλλον' : ''}
          </div>
          <div>{t.accepting_clients ? <span className="pill ok">Δέχεται νέα μέλη</span> : <span className="pill warn">Πλήρες πρόγραμμα</span>}</div>
        </div>
        <div className="card stack">
          <h3>Κριτικές μελών</h3>
          {data.reviews.length === 0 && <p className="small muted">Δεν υπάρχουν ακόμη κριτικές.</p>}
          {data.reviews.map((r, i) => (
            <div key={i} className="stack" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '.7rem' }}>
              <div className="small">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              <p className="small">{r.body}</p>
              <div className="small muted">{r.author_label} · {dt(r.created_at, { hour: undefined, minute: undefined })}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
