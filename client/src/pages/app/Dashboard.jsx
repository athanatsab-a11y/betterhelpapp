import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dt, euro } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Avatar, Spinner, modalityLabel } from '../../components/common.jsx';

export default function Dashboard() {
  const { user, match, subscription } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/sessions').catch(() => ({ sessions: [] })),
      api.get('/rooms').catch(() => ({ rooms: [] })),
      api.get('/worksheets').catch(() => ({ assignments: [] })),
      api.get('/mood-trend').catch(() => ({ trend: [] })),
    ]).then(([s, r, w, m]) => setData({ ...s, ...r, ...w, ...m }));
  }, []);

  if (!data) return <Spinner />;

  const upcoming = data.sessions.filter((s) => s.status === 'scheduled' && new Date(s.starts_at) > new Date());
  const unread = data.rooms.reduce((a, r) => a + (r.unread || 0), 0);
  const pending = data.assignments.filter((a) => a.status !== 'completed');

  return (
    <div className="stack">
      <h1>Γεια σου, {user.nickname || user.display_name}</h1>

      {!match && (
        <div className="card stack">
          <h3>Δεν έχεις ακόμη θεραπευτή</h3>
          <p className="small muted">Ολοκλήρωσε το ερωτηματολόγιο για να σε αντιστοιχίσουμε.</p>
          <Link className="btn" to="/get-started">Βρες θεραπευτή</Link>
        </div>
      )}

      {match && (
        <div className="card stack">
          <div className="spread">
            <div className="row">
              <Avatar name={match.display_name} size="lg" />
              <div>
                <div className="small muted">Ο θεραπευτής σου</div>
                <h3 style={{ marginBottom: 0 }}>{match.display_name}</h3>
                <div className="small muted">{match.credentials} · απαντά συνήθως σε {match.avg_response_hours}ω</div>
              </div>
            </div>
            <div className="row">
              <Link className="btn" to="/app/room">Άνοιξε το δωμάτιο{unread ? ` (${unread})` : ''}</Link>
              <Link className="btn secondary" to="/app/sessions">Κλείσε συνεδρία</Link>
            </div>
          </div>
          {match.reason && <p className="small muted">Αντιστοιχίστηκε επειδή: {match.reason}</p>}
          <Link className="small" to="/app/switch-therapist">Θέλω άλλον θεραπευτή →</Link>
        </div>
      )}

      <div className="grid grid-3">
        <div className="card stack">
          <h3>Επόμενη συνεδρία</h3>
          {upcoming.length ? (
            <>
              <b>{dt(upcoming[0].starts_at)}</b>
              <div className="small muted">{modalityLabel(upcoming[0].modality)} · {upcoming[0].duration_min}′</div>
              <Link className="btn small" to={`/app/sessions/${upcoming[0].id}/live`}>Είσοδος</Link>
            </>
          ) : <p className="small muted">Καμία προγραμματισμένη. <Link to="/app/sessions">Κλείσε τώρα</Link></p>}
        </div>

        <div className="card stack">
          <h3>Φύλλα εργασίας</h3>
          {pending.length ? (
            <>
              <p className="small">{pending.length} σε εκκρεμότητα</p>
              <Link className="btn small secondary" to="/app/worksheets">Συμπλήρωσε</Link>
            </>
          ) : <p className="small muted">Όλα ολοκληρωμένα. <Link to="/app/worksheets">Βιβλιοθήκη</Link></p>}
        </div>

        <div className="card stack">
          <h3>Συνδρομή</h3>
          {subscription ? (
            <>
              <p className="small">
                <b>{subscription.plan}</b> · {euro(subscription.price_cents)} / {subscription.billing_period}
                <br /><span className={`pill ${subscription.status === 'active' ? 'ok' : 'warn'}`}>{subscription.status}</span>
              </p>
              <Link className="small" to="/app/billing">Διαχείριση →</Link>
            </>
          ) : <Link className="btn small" to="/app/billing">Ενεργοποίησε</Link>}
        </div>
      </div>

      {data.trend?.length > 0 && (
        <div className="card stack">
          <h3>Η διάθεσή σου τις τελευταίες μέρες</h3>
          <div className="sparkline">
            {data.trend.map((d) => <i key={d.day} style={{ height: `${(d.mood / 5) * 100}%` }} title={`${d.day}: ${d.mood.toFixed(1)}/5`} />)}
          </div>
          <Link className="small" to="/app/journal">Γράψε στο ημερολόγιο →</Link>
        </div>
      )}
    </div>
  );
}
