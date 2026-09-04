import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

const MEMBER = [
  ['/app', 'Αρχική', '🏠', true],
  ['/app/room', 'Δωμάτιο', '💬'],
  ['/app/sessions', 'Συνεδρίες', '📅'],
  ['/app/journal', 'Ημερολόγιο', '📓'],
  ['/app/more', 'Περισσότερα', '⋯'],
];

const PROVIDER = [
  ['/provider', 'Πελάτες', '📋', true],
  ['/provider/sessions', 'Συνεδρίες', '📅'],
  ['/provider/availability', 'Ώρες', '🕐'],
  ['/provider/profile', 'Προφίλ', '⚙️'],
];

// Phone navigation; the sidebar takes over from 900px up.
export default function BottomTabs({ provider = false }) {
  const { unread } = useAuth();
  const tabs = provider ? PROVIDER : MEMBER;
  return (
    <nav className="tabbar" aria-label="Κύρια πλοήγηση">
      {tabs.map(([to, label, icon, end]) => (
        <NavLink key={to} to={to} end={!!end}>
          <span className="tab-icon" aria-hidden="true">{icon}</span>
          <span>{label}</span>
          {to === '/app/more' && unread ? <i className="tab-dot" /> : null}
        </NavLink>
      ))}
    </nav>
  );
}
