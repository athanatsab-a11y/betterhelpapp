import { useEffect, useState } from 'react';
import { api, euro, dt } from '../../lib/api.js';
import { Link } from 'react-router-dom';
import { Spinner } from '../../components/common.jsx';

// Κάθε κατανομή είναι ένα μέγεθος ανά κατηγορία: μία σειρά, ένα χρώμα, οι τιμές
// γραμμένες δίπλα στη μπάρα ώστε να μη χρειάζεται να τις μαντέψει κανείς.
function Bars({ items, total, tone = 'teal', unit = '', empty = 'Καμία καταγραφή ακόμη' }) {
  if (!items?.length) return <p className="small muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ol className="bars">
      {items.map((item) => (
        <li key={item.key} title={`${item.label}: ${item.count}${unit}`}>
          <span className="bars-label">{item.label}</span>
          <span className="bars-track">
            <span className={`bars-fill ${tone}`} style={{ width: `${Math.max((item.count / max) * 100, 2)}%` }} />
          </span>
          <span className="bars-value">
            {item.count}
            {total ? <em>{Math.round((item.count / total) * 100)}%</em> : item.pct !== undefined ? <em>{item.pct}%</em> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div className="tile">
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
      {sub && <div className="small muted">{sub}</div>}
    </div>
  );
}

const RISK_TONE = { low: 'ok', elevated: 'warn', crisis: 'danger' };
const RISK_LABEL = { low: 'Χαμηλός', elevated: 'Αυξημένος', crisis: 'Υψηλός — ανέφερε σκέψεις αυτοτραυματισμού' };

export default function Analytics() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/analytics').then(setD).catch((e) => setError(e.message));
  }, []);

  if (error) return <main className="app-main"><p className="error">{error}</p></main>;
  if (!d) return <Spinner />;

  const riskItems = d.risk.map((r) => ({ ...r, label: RISK_LABEL[r.key] || r.key }));
  const riskTotal = d.risk.reduce((a, r) => a + Number(r.count), 0);
  const firstStep = d.funnel[0]?.count || 0;

  return (
    <main className="app-main stack">
      <nav className="tabs">
        <Link to="/admin/analytics" className="active">Δεδομένα</Link>
        <Link to="/admin">Αιτήσεις{d.totals.therapists_pending ? ` (${d.totals.therapists_pending})` : ''}</Link>
      </nav>
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: '.2rem' }}>Δεδομένα εφαρμογής</h1>
          <p className="small muted">Ενημερώθηκε {dt(d.generated_at)} · συγκεντρωτικά στοιχεία, χωρίς προσωπικό περιεχόμενο</p>
        </div>
        <a className="btn secondary small" href="/api/admin/analytics.csv">Λήψη CSV</a>
      </div>

      <section className="tiles">
        <Tile label="Μέλη" value={d.totals.clients} sub={`${d.totals.intakes} ερωτηματολόγια συνολικά`} />
        <Tile label="Ενεργές αντιστοιχίσεις" value={d.totals.active_matches} sub={`${d.totals.messages} μηνύματα`} />
        <Tile label="Ενεργές συνδρομές" value={d.funnel.find((f) => f.key === 'subscribed')?.count ?? 0}
          sub={`${euro(d.subscriptions.mrr_cents)} μηνιαία επαναλαμβανόμενα`} />
        <Tile label="Συνεδρίες" value={d.totals.sessions} sub={`${d.sessions.upcoming} επερχόμενες`} />
        <Tile label="Θεραπευτές" value={d.totals.therapists_approved}
          sub={d.totals.therapists_pending ? `${d.totals.therapists_pending} σε αναμονή έγκρισης` : 'καμία εκκρεμής αίτηση'} />
        <Tile label="Έσοδα (30 ημερών)" value={euro(d.revenue.last_30_cents)} sub={`${euro(d.revenue.total_cents)} συνολικά`} />
      </section>

      <section className="card stack">
        <h2>Χοάνη εγγραφής</h2>
        <p className="small muted">Πόσοι φτάνουν σε κάθε βήμα, από το ερωτηματολόγιο μέχρι τη συνδρομή.</p>
        <Bars items={d.funnel.map((f) => ({ ...f, key: f.key }))} total={firstStep} />
      </section>

      <section className="card stack">
        <h2>Επίπεδο κινδύνου στο ερωτηματολόγιο</h2>
        <div className="bars-status">
          {riskItems.map((r) => (
            <div key={r.key} className="row" style={{ gap: '.5rem' }}>
              <span className={`pill ${RISK_TONE[r.key] || ''}`}>{r.label}</span>
              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{r.count}</b>
              <span className="small muted">({Math.round((r.count / riskTotal) * 100)}%)</span>
            </div>
          ))}
        </div>
        <p className="small muted">
          Όποιος δηλώνει σκέψεις αυτοτραυματισμού βλέπει αμέσως τις γραμμές άμεσης βοήθειας και ο
          θεραπευτής του ειδοποιείται.
        </p>
      </section>

      <h2>Τι απαντούν στο ερωτηματολόγιο</h2>
      <div className="grid grid-2">
        {d.question_order.filter((id) => d.answers[id]).map((id) => {
          const a = d.answers[id];
          return (
            <section className="card stack" key={id}>
              <div>
                <h3 style={{ marginBottom: '.15rem' }}>{a.title}</h3>
                <span className="small muted">
                  {a.answered} απαντήσεις{a.multi ? ' · πολλαπλή επιλογή' : ''}
                </span>
              </div>
              <Bars items={a.items} />
            </section>
          );
        })}
      </div>

      {d.assessment.count > 0 && (
        <section className="card stack">
          <h2>Αξιολόγηση γνωριμίας</h2>
          <p className="small muted">{d.assessment.count} συμπληρώσεις · μέσος όρος διάθεσης {d.assessment.mood_avg}/27, άγχους {d.assessment.anxiety_avg}/21</p>
          <div className="grid grid-2">
            <div>
              <h4>Διάθεση</h4>
              <Bars items={d.assessment.mood_bands} />
            </div>
            <div>
              <h4>Άγχος</h4>
              <Bars items={d.assessment.anxiety_bands} />
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-2">
        <section className="card stack">
          <h2>Συνδρομές</h2>
          <h4>Ανά πακέτο</h4>
          <Bars items={d.subscriptions.by_plan.map((x) => ({ ...x, label: x.key }))} />
          <h4>Ανά κατάσταση</h4>
          <Bars items={d.subscriptions.by_status.map((x) => ({ ...x, label: x.key }))} />
          <p className="small muted">{d.subscriptions.on_financial_aid} μέλη με έκπτωση οικονομικής ενίσχυσης.</p>
        </section>

        <section className="card stack">
          <h2>Συνεδρίες</h2>
          <h4>Ανά τρόπο</h4>
          <Bars items={d.sessions.by_modality.map((x) => ({ ...x, label: x.key }))} />
          <h4>Ανά κατάσταση</h4>
          <Bars items={d.sessions.by_status.map((x) => ({ ...x, label: x.key }))} />
        </section>
      </div>

      <section className="card stack">
        <h2>Θεραπευτές και φόρτος</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr><th>Θεραπευτής</th><th>Κατάσταση</th><th>Ενεργά μέλη</th><th>Πληρότητα</th><th>Συνεδρίες</th><th>Αξιολόγηση</th><th>Απόκριση</th></tr>
            </thead>
            <tbody>
              {d.therapists.map((t) => {
                const load = Math.round((t.active_clients / Math.max(t.max_clients, 1)) * 100);
                return (
                  <tr key={t.id}>
                    <td>{t.display_name}</td>
                    <td><span className={`pill ${t.status === 'approved' ? 'ok' : t.status === 'pending' ? 'warn' : 'danger'}`}>{t.status}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.active_clients}</td>
                    <td>
                      <span className="meter" style={{ minWidth: 90, display: 'inline-block' }}>
                        <i className={load > 90 ? 'danger' : load > 70 ? 'warn' : ''} style={{ width: `${Math.min(load, 100)}%` }} />
                      </span>
                      <span className="small muted" style={{ marginInlineStart: '.4rem' }}>{load}%</span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.sessions}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.reviews_count ? `★ ${t.rating}` : '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.avg_response_hours}ω</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {d.signups.length > 1 && (
        <section className="card stack">
          <h2>Νέα μέλη ανά ημέρα</h2>
          <div className="mood-chart">
            <ol className="mood-bars">
              {d.signups.slice(-30).map((s) => {
                const max = Math.max(...d.signups.map((x) => Number(x.count)), 1);
                return (
                  <li key={s.day} title={`${s.day}: ${s.count}`}>
                    <span className="bar" style={{ height: `${(Number(s.count) / max) * 100}%` }} />
                    <span className="small muted">{s.day.slice(5)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      <p className="small muted">
        Δεν εμφανίζονται εδώ — και δεν πρέπει — τα μηνύματα της θεραπείας, οι σημειώσεις ημερολογίου
        και οι απαντήσεις στα φύλλα εργασίας. Είναι δεδομένα υγείας και ανήκουν στη σχέση πελάτη–θεραπευτή.
      </p>
    </main>
  );
}
