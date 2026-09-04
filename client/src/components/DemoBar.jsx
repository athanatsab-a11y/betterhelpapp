import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

// Only rendered in the static demo build: switches between the two portals and
// the public site without typing credentials.
export default function DemoBar() {
  const { user, login } = useAuth();
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const enter = async (email, to) => {
    setBusy(true);
    try { await login(email, 'password123'); nav(to); } finally { setBusy(false); }
  };

  const role = loc.pathname.startsWith('/provider') ? 'therapist'
    : loc.pathname.startsWith('/admin') ? 'admin'
    : loc.pathname.startsWith('/app') ? 'member' : 'public';

  return (
    <div className="demo-bar">
      <span className="small demo-label">Demo</span>
      <div className="demo-switch" role="group" aria-label="Εναλλαγή ρόλου">
        <button className={role === 'member' ? 'on' : ''} disabled={busy}
          onClick={() => enter('demo@mindbridge.gr', '/app')}>Μέλος</button>
        <button className={role === 'therapist' ? 'on' : ''} disabled={busy}
          onClick={() => enter('therapist1@mindbridge.gr', '/provider')}>Θεραπευτής</button>
        <button className={role === 'admin' ? 'on' : ''} disabled={busy}
          onClick={() => enter('admin@mindbridge.gr', '/admin')}>Διαχειριστής</button>
        <button className={role === 'public' ? 'on' : ''} disabled={busy}
          onClick={() => nav('/')}>Δημόσιο site</button>
      </div>
      <span className="small demo-note">{user ? `συνδεδεμένος ως ${user.display_name}` : 'αποσυνδεδεμένος'} · τα δεδομένα ζουν στον browser σου</span>
    </div>
  );
}
