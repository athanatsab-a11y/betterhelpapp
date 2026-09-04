import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';

const LINKS = [
  ['/app', 'Επισκόπηση', '🏠', true],
  ['/app/room', 'Δωμάτιο θεραπείας', '💬'],
  ['/app/sessions', 'Συνεδρίες', '📅'],
  ['/app/journal', 'Ημερολόγιο', '📓'],
  ['/app/assessment', 'Αξιολόγηση', '🧭'],
  ['/app/worksheets', 'Φύλλα εργασίας', '📝'],
  ['/app/groupinars', 'Groupinars', '🎧'],
  ['/app/billing', 'Χρεώσεις', '💳'],
  ['/app/account', 'Λογαριασμός', '⚙️'],
];

export default function AppLayout() {
  const { user, unread } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="small muted" style={{ padding: '0 .8rem' }}>Καλώς ήρθες, {user?.nickname || user?.display_name}</p>
        <nav>
          {LINKS.map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={!!end}>
              <span aria-hidden="true">{icon}</span> {label}
            </NavLink>
          ))}
          <NavLink to="/app/notifications">
            <span aria-hidden="true">🔔</span> Ειδοποιήσεις
            {unread ? <span className="badge-count">{unread}</span> : null}
          </NavLink>
        </nav>
      </aside>
      <main className="app-main"><Outlet /></main>
    </div>
  );
}
