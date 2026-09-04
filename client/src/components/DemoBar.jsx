import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

// Only rendered in the static demo build: lets a visitor jump straight into
// either portal without typing credentials.
export default function DemoBar() {
  const { user, login, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const enter = async (email, to) => {
    setBusy(true);
    try { await login(email, 'password123'); nav(to); } finally { setBusy(false); }
  };

  return (
    <div className="demo-bar">
      <div className="container row" style={{ justifyContent: 'center', gap: '.6rem' }}>
        <span className="small"><b>Demo</b> — όλα τα δεδομένα ζουν στον browser σου</span>
        {user ? (
          <>
            <span className="small">συνδεδεμένος ως {user.display_name}</span>
            <button className="btn small secondary" disabled={busy} onClick={async () => { await logout(); nav('/'); }}>Αποσύνδεση</button>
          </>
        ) : (
          <>
            <button className="btn small" disabled={busy} onClick={() => enter('demo@mindbridge.gr', '/app')}>Είσοδος ως μέλος</button>
            <button className="btn small secondary" disabled={busy} onClick={() => enter('therapist1@mindbridge.gr', '/provider')}>Είσοδος ως θεραπευτής</button>
          </>
        )}
      </div>
    </div>
  );
}
