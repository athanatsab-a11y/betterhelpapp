import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { initials, avatarColor, MODALITY } from '../lib/api.js';

export function Avatar({ name, size = '' }) {
  return (
    <div className={`avatar ${size}`} style={{ background: avatarColor(name || '') }} aria-hidden="true">
      {initials(name || '?')}
    </div>
  );
}

export function Spinner() { return <div className="spinner" role="status" aria-label="Φόρτωση" />; }

export function CrisisBanner() {
  return (
    <div className="crisis-banner">
      <div className="container">
        Αν βρίσκεσαι σε άμεσο κίνδυνο, το MindBridge δεν είναι υπηρεσία έκτακτης ανάγκης.
        Κάλεσε <b>112</b> ή τη Γραμμή Παρέμβασης για την Αυτοκτονία <b>1018</b> (24/7, δωρεάν).
      </div>
    </div>
  );
}

export function Header() {
  const { user, logout, unread } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const doLogout = async () => { await logout(); nav('/'); };

  return (
    <header className="site-header">
      <div className="container inner">
        <Link to="/" className="logo"><span className="logo-mark">MB</span> MindBridge</Link>
        <button className="burger" onClick={() => setOpen((o) => !o)} aria-label="Μενού">☰</button>
        <nav className={`nav ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          <NavLink to="/how-it-works">Πώς λειτουργεί</NavLink>
          <NavLink to="/therapists">Θεραπευτές</NavLink>
          <NavLink to="/pricing">Κόστος</NavLink>
          <NavLink to="/faq">Συχνές ερωτήσεις</NavLink>
          {user ? (
            <>
              <NavLink to={user.role === 'therapist' ? '/provider' : '/app'}>
                Ο χώρος μου{unread ? <span className="badge-count">{unread}</span> : null}
              </NavLink>
              <button className="btn small secondary" onClick={doLogout}>Αποσύνδεση</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Σύνδεση</NavLink>
              <Link className="btn small" to="/join">Ξεκίνα τώρα</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="grid grid-3">
          <div>
            <div className="logo" style={{ color: '#fff' }}><span className="logo-mark">MB</span> MindBridge</div>
            <p className="small">Προσιτή, εμπιστευτική ψυχοθεραπεία με αδειούχους επαγγελματίες ψυχικής υγείας.</p>
          </div>
          <div>
            <h4>Υπηρεσίες</h4>
            <p className="small stack">
              <Link to="/get-started">Ατομική θεραπεία</Link><br />
              <Link to="/get-started?service=couples">Θεραπεία ζεύγους</Link><br />
              <Link to="/get-started?service=teen">Θεραπεία εφήβων</Link><br />
              <Link to="/therapists">Κατάλογος θεραπευτών</Link><br />
              <Link to="/apply">Γίνε θεραπευτής μας</Link>
            </p>
          </div>
          <div>
            <h4>Υποστήριξη</h4>
            <p className="small">
              <Link to="/faq">Συχνές ερωτήσεις</Link><br />
              <Link to="/pricing">Κόστος & οικονομική ενίσχυση</Link><br />
              <Link to="/reviews">Κριτικές</Link><br />
              <Link to="/crisis">Γραμμές άμεσης βοήθειας</Link>
            </p>
          </div>
        </div>
        <div className="divider" style={{ background: 'rgba(255,255,255,.18)' }} />
        <p className="small">
          © {new Date().getFullYear()} MindBridge. Εκπαιδευτικό demo — δεν παρέχει πραγματικές ιατρικές υπηρεσίες.
          Σε επείγον περιστατικό κάλεσε 112.
        </p>
      </div>
    </footer>
  );
}

export function TherapistCard({ t, footer }) {
  const specLabels = useSpecialtyLabels();
  return (
    <article className="card stack">
      <div className="row">
        <Avatar name={t.display_name} size="lg" />
        <div>
          <h3 style={{ marginBottom: '.15rem' }}>{t.display_name}</h3>
          <div className="small muted">{t.credentials}</div>
          <div className="small">★ {t.rating} · {t.reviews_count} κριτικές · {t.years_experience} χρόνια εμπειρίας</div>
        </div>
      </div>
      <p className="small">{t.headline}</p>
      <div className="row" style={{ gap: '.4rem' }}>
        {t.specialties.slice(0, 4).map((s) => <span key={s} className="pill">{specLabels[s] || s}</span>)}
      </div>
      <div className="small muted">
        Γλώσσες: {t.languages.map((l) => ({ el: 'Ελληνικά', en: 'Αγγλικά', de: 'Γερμανικά' }[l] || l)).join(', ')}
        {' · '}Απόκριση ~{t.avg_response_hours}ω
      </div>
      {t.reason && <div className="small" style={{ color: 'var(--teal-700)' }}>Γιατί ταιριάζει: {t.reason}</div>}
      {footer}
    </article>
  );
}

let approachCache = null;
export function useApproachInfo() {
  const [info, setInfo] = useState(approachCache || {});
  useEffect(() => {
    if (approachCache) return;
    fetch('/api/questionnaire').then((r) => r.json()).then((d) => {
      approachCache = Object.fromEntries(d.approaches.map((a) => [a.key, a]));
      setInfo(approachCache);
    }).catch(() => {});
  }, []);
  return info;
}

let specialtyCache = null;
export function useSpecialtyLabels() {
  const [labels, setLabels] = useState(specialtyCache || {});
  useEffect(() => {
    if (specialtyCache) return;
    fetch('/api/questionnaire').then((r) => r.json()).then((d) => {
      specialtyCache = Object.fromEntries([...d.specialties, ...d.approaches].map((s) => [s.key, s.label]));
      setLabels(specialtyCache);
    }).catch(() => {});
  }, []);
  return labels;
}

export const modalityLabel = (m) => MODALITY[m] || m;
