import { Link, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';

// First screen after someone installs the app and opens it. It answers three
// questions immediately: what this is, that it is private, and what to do next.
export default function Welcome() {
  const [params] = useSearchParams();
  const next = params.get('next');
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <AuthShell>
      <h1 className="auth-title">Ο θεραπευτικός σου χώρος</h1>
      <p className="muted">
        Αδειούχοι ψυχοθεραπευτές, μηνύματα όποτε τους χρειάζεσαι και live συνεδρίες
        με βίντεο, τηλέφωνο ή chat.
      </p>

      <div className="stack" style={{ marginTop: '1.4rem' }}>
        <Link className="btn block" to="/join">Δημιουργία λογαριασμού</Link>
        <Link className="btn secondary block" to={loginHref}>Έχω ήδη λογαριασμό</Link>
      </div>

      <ul className="auth-points small">
        <li>Οι συνομιλίες σου είναι ιδιωτικές — μπορείς να χρησιμοποιήσεις ψευδώνυμο</li>
        <li>Πρώτη εβδομάδα δωρεάν, ακύρωση όποτε θέλεις</li>
        <li>Αλλαγή θεραπευτή χωρίς χρέωση</li>
      </ul>
    </AuthShell>
  );
}
