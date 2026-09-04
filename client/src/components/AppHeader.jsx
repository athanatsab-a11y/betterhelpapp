import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Avatar } from './common.jsx';

// Product chrome for the signed-in areas: compact, no marketing navigation.
export default function AppHeader({ variant = 'client' }) {
  const provider = variant === 'provider';
  const admin = variant === 'admin';
  const { user, unread, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const base = admin ? '/admin' : provider ? '/provider' : '/app';

  return (
    <header className="app-header">
      <Link to={base} className="logo"><span className="logo-mark">MB</span> MindBridge</Link>
      <div className="app-header-actions">
        {variant === 'client' && (
          <Link className="icon-btn" to="/app/notifications" aria-label="Ειδοποιήσεις">
            🔔{unread ? <i className="dot">{unread}</i> : null}
          </Link>
        )}
        <div className="menu-wrap" ref={menuRef}>
          <button className="icon-btn avatar-btn" onClick={() => setOpen((o) => !o)} aria-label="Μενού λογαριασμού" aria-expanded={open}>
            <Avatar name={user?.display_name} size="sm" />
          </button>
          {open && (
            <div className="menu">
              <div className="menu-head">
                <b>{user?.display_name}</b>
                <div className="small muted">{admin ? 'Διαχειριστής' : provider ? 'Θεραπευτής' : 'Μέλος'}</div>
              </div>
              {admin && <Link to="/admin">Αιτήσεις θεραπευτών</Link>}
              {!admin && <Link to={provider ? '/provider/profile' : '/app/account'}>Ρυθμίσεις λογαριασμού</Link>}
              {variant === 'client' && <Link to="/app/billing">Χρεώσεις & συνδρομή</Link>}
              {variant === 'client' && <Link to="/app/switch-therapist">Αλλαγή θεραπευτή</Link>}
              <Link to="/">Δημόσιο site</Link>
              <Link to="/crisis">Άμεση βοήθεια</Link>
              <button onClick={async () => { await logout(); nav('/'); }}>Αποσύνδεση</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
