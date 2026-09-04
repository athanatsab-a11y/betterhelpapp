import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { euro, PLAN, PERIOD } from '../../lib/api.js';

const LINKS = [
  ['/app/assessment', '🧭', 'Αξιολόγηση γνωριμίας', 'Διάθεση, άγχος, ιστορικό και στόχοι — δες την πορεία σου'],
  ['/app/worksheets', '📝', 'Φύλλα εργασίας', 'Ασκήσεις CBT/ACT που σου αναθέτει ο θεραπευτής σου'],
  ['/app/groupinars', '🎧', 'Groupinars', 'Ζωντανά σεμινάρια με ειδικούς, μέσα στη συνδρομή σου'],
  ['/app/notifications', '🔔', 'Ειδοποιήσεις', 'Μηνύματα, ραντεβού και αναθέσεις'],
  ['/app/billing', '💳', 'Χρεώσεις & συνδρομή', 'Πακέτο, πληρωμές, οικονομική ενίσχυση'],
  ['/app/switch-therapist', '🔄', 'Αλλαγή θεραπευτή', 'Δωρεάν, όποτε το χρειαστείς'],
  ['/app/account', '⚙️', 'Λογαριασμός', 'Στοιχεία, ειδοποιήσεις, κωδικός'],
  ['/crisis', '🆘', 'Άμεση βοήθεια', 'Γραμμές υποστήριξης 24/7'],
];

export default function More() {
  const { user, subscription } = useAuth();
  return (
    <div className="stack">
      <h1>Περισσότερα</h1>
      <div className="card row">
        <div>
          <b>{user?.display_name}</b>
          <div className="small muted">
            {subscription ? `Πακέτο ${PLAN[subscription.plan] || subscription.plan} · ${euro(subscription.price_cents)} ανά ${PERIOD[subscription.billing_period]}` : 'Χωρίς ενεργή συνδρομή'}
          </div>
        </div>
      </div>
      <div className="list-links">
        {LINKS.map(([to, icon, title, sub]) => (
          <Link key={to} to={to}>
            <span className="tab-icon" aria-hidden="true">{icon}</span>
            <span>
              <b>{title}</b>
              <span className="small muted">{sub}</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
