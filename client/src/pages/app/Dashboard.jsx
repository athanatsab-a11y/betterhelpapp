import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, dt, euro, PLAN, PERIOD, SUB_STATUS } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { Avatar, Spinner, modalityLabel } from '../../components/common.jsx';
import { ScoreCard } from './Assessment.jsx';

const MOOD_FACES = ['😞', '🙁', '😐', '🙂', '😄'];

// Mood is a 1-5 scale, so the bars are drawn against that fixed scale rather
// than the range of the data — a good week should look like a good week.
function MoodChart({ trend }) {
  const days = trend.slice(-14);
  const avg = days.reduce((a, d) => a + d.mood, 0) / days.length;
  return (
    <div className="card stack">
      <div className="spread">
        <h3 style={{ marginBottom: 0 }}>Η διάθεσή σου</h3>
        <span className="small muted">μέσος όρος {avg.toFixed(1)}/5 {MOOD_FACES[Math.round(avg) - 1]}</span>
      </div>
      <div className="mood-chart">
        <div className="mood-scale small muted" aria-hidden="true"><span>5</span><span>3</span><span>1</span></div>
        <ol className="mood-bars">
          {days.map((d) => (
            <li key={d.day}>
              <span className="bar" style={{ height: `${(d.mood / 5) * 100}%` }}
                title={`${new Date(d.day).toLocaleDateString('el-GR')}: ${d.mood.toFixed(1)} στα 5`} />
              <span className="small muted">{new Date(d.day).toLocaleDateString('el-GR', { day: 'numeric', month: 'numeric' })}</span>
            </li>
          ))}
        </ol>
      </div>
      <Link className="small" to="/app/journal">Γράψε στο ημερολόγιο →</Link>
    </div>
  );
}

export default function Dashboard() {
  const { user, match, subscription, assessment } = useAuth();
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

      {match && !assessment && (
        <div className="card stack" style={{ borderColor: 'var(--teal-500)' }}>
          <span className="pill">Επόμενο βήμα</span>
          <h3>Ας σε γνωρίσουμε καλύτερα</h3>
          <p className="small muted">
            Ένα ερωτηματολόγιο 4 ενοτήτων για τη διάθεση, το άγχος, το ιστορικό και τους στόχους σου.
            Ο θεραπευτής σου το διαβάζει πριν την πρώτη σας επαφή — κερδίζετε μια ολόκληρη συνεδρία.
          </p>
          <Link className="btn" to="/app/assessment">Ξεκίνα το ερωτηματολόγιο (5 λεπτά)</Link>
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
                <b>{PLAN[subscription.plan] || subscription.plan}</b> · {euro(subscription.price_cents)} ανά {PERIOD[subscription.billing_period]}
                <br /><span className={`pill ${subscription.status === 'active' ? 'ok' : 'warn'}`}>
                  {SUB_STATUS[subscription.status] || subscription.status}
                </span>
              </p>
              <Link className="small" to="/app/billing">Διαχείριση →</Link>
            </>
          ) : <Link className="btn small" to="/app/billing">Ενεργοποίησε</Link>}
        </div>
      </div>

      {assessment && (
        <div className="card stack">
          <div className="spread">
            <h3 style={{ marginBottom: 0 }}>Η αξιολόγηση γνωριμίας σου</h3>
            <Link className="small" to="/app/assessment">Συμπλήρωσέ το ξανά →</Link>
          </div>
          <div className="grid grid-2">
            {Object.entries(assessment.scores).map(([key, sc]) => <ScoreCard key={key} id={key} score={sc} />)}
          </div>
          <div className="small muted">Τελευταία συμπλήρωση: {dt(assessment.created_at)}</div>
        </div>
      )}

      {data.trend?.length > 0 && <MoodChart trend={data.trend} />}
    </div>
  );
}
