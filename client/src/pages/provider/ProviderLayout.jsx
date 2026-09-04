import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';

export default function ProviderLayout() {
  const { user, unread } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="small muted" style={{ padding: '0 .8rem' }}>{user?.display_name}</p>
        <nav>
          <NavLink to="/provider" end><span aria-hidden="true">📋</span> Πελάτες</NavLink>
          <NavLink to="/provider/sessions"><span aria-hidden="true">📅</span> Συνεδρίες</NavLink>
          <NavLink to="/provider/availability"><span aria-hidden="true">🕐</span> Διαθεσιμότητα</NavLink>
          <NavLink to="/provider/profile"><span aria-hidden="true">⚙️</span> Προφίλ</NavLink>
        </nav>
        {unread ? <p className="small" style={{ padding: '.5rem .8rem' }}>🔔 {unread} νέες ειδοποιήσεις</p> : null}
      </aside>
      <main className="app-main"><Outlet /></main>
    </div>
  );
}
