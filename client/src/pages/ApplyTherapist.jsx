import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

const LANGS = [['el', 'Ελληνικά'], ['en', 'Αγγλικά'], ['de', 'Γερμανικά']];

export default function ApplyTherapist() {
  const { applyAsTherapist } = useAuth();
  const [meta, setMeta] = useState({ specialties: [], approaches: [] });
  const [form, setForm] = useState({
    display_name: '', email: '', password: '', phone: '',
    credentials: '', license_no: '', years_experience: '', gender: '',
    headline: '', bio: '', languages: ['el'], specialties: [], approaches: [],
    max_clients: 20, avg_response_hours: 12, lgbtq_friendly: true,
  });
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => { api.get('/questionnaire').then(setMeta).catch(() => {}); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (field, key) => {
    const cur = new Set(form[field]);
    cur.has(key) ? cur.delete(key) : cur.add(key);
    setForm({ ...form, [field]: [...cur] });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await applyAsTherapist({ ...form, years_experience: Number(form.years_experience) || 0 });
      if (r?.needsEmailConfirmation) { setSent(true); return; }
      nav('/provider');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <main className="container section stack" style={{ maxWidth: 620 }}>
        <span className="pill">Η αίτηση καταχωρήθηκε</span>
        <h1>Έλεγξε το email σου</h1>
        <p>
          Στείλαμε σύνδεσμο επιβεβαίωσης στο <b>{form.email}</b>. Μόλις τον πατήσεις, η αίτησή σου μπαίνει
          στην ουρά αξιολόγησης και θα σε ενημερώσουμε για την έγκριση.
        </p>
      </main>
    );
  }

  return (
    <main className="container section" style={{ maxWidth: 760 }}>
      <form className="stack" onSubmit={submit}>
        <div>
          <span className="pill warn">Αίτηση θεραπευτή</span>
          <h1>Γίνε μέλος του δικτύου μας</h1>
          <p className="muted small">
            Δεχόμαστε αδειούχους επαγγελματίες ψυχικής υγείας. Ελέγχουμε κάθε άδεια πριν ενεργοποιήσουμε
            το προφίλ — συνήθως μέσα σε 2 εργάσιμες ημέρες.
          </p>
        </div>

        <section className="card stack">
          <h3>Στοιχεία λογαριασμού</h3>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="dn">Ονοματεπώνυμο *</label>
              <input id="dn" required value={form.display_name} onChange={set('display_name')} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="em">Email *</label>
              <input id="em" type="email" required value={form.email} onChange={set('email')} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="pw">Κωδικός (8+ χαρακτήρες) *</label>
              <input id="pw" type="password" minLength={8} required value={form.password} onChange={set('password')} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="ph">Τηλέφωνο</label>
              <input id="ph" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
        </section>

        <section className="card stack">
          <h3>Διαπιστευτήρια</h3>
          <div className="field">
            <label htmlFor="cr">Τίτλος & εξειδίκευση *</label>
            <input id="cr" required placeholder="π.χ. Ψυχολόγος, MSc Γνωσιακή-Συμπεριφορική Θεραπεία"
              value={form.credentials} onChange={set('credentials')} />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="lic">Αριθμός άδειας άσκησης επαγγέλματος *</label>
              <input id="lic" required placeholder="GR-PSY-00000" value={form.license_no} onChange={set('license_no')} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="yr">Χρόνια κλινικής εμπειρίας</label>
              <input id="yr" type="number" min="0" value={form.years_experience} onChange={set('years_experience')} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="g">Φύλο</label>
              <select id="g" value={form.gender} onChange={set('gender')}>
                <option value="">Προτιμώ να μην πω</option>
                <option value="female">Γυναίκα</option>
                <option value="male">Άνδρας</option>
                <option value="nonbinary">Μη δυαδικό άτομο</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card stack">
          <h3>Προφίλ</h3>
          <div className="field">
            <label htmlFor="hl">Τίτλος προφίλ</label>
            <input id="hl" placeholder="π.χ. Άγχος, πανικός και burnout" value={form.headline} onChange={set('headline')} />
          </div>
          <div className="field">
            <label htmlFor="bio">Σύντομο βιογραφικό</label>
            <textarea id="bio" value={form.bio} onChange={set('bio')}
              placeholder="Πώς δουλεύεις, με ποιους, τι να περιμένει κάποιος από την πρώτη επαφή." />
          </div>
          <div>
            <label>Ειδικεύσεις * <span className="muted small">({form.specialties.length} επιλεγμένες)</span></label>
            <div className="chips">
              {meta.specialties.map((s) => (
                <button type="button" key={s.key} className={`chip ${form.specialties.includes(s.key) ? 'on' : ''}`}
                  onClick={() => toggle('specialties', s.key)}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label>Θεραπευτικές προσεγγίσεις</label>
            <div className="chips">
              {meta.approaches.map((s) => (
                <button type="button" key={s.key} className={`chip ${form.approaches.includes(s.key) ? 'on' : ''}`}
                  onClick={() => toggle('approaches', s.key)}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label>Γλώσσες συνεδριών *</label>
            <div className="chips">
              {LANGS.map(([k, label]) => (
                <button type="button" key={k} className={`chip ${form.languages.includes(k) ? 'on' : ''}`}
                  onClick={() => toggle('languages', k)}>{label}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="card stack">
          <h3>Τρόπος εργασίας</h3>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="mc">Μέγιστος αριθμός ενεργών μελών</label>
              <input id="mc" type="number" min="1" value={form.max_clients} onChange={set('max_clients')} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="rh">Χρόνος απόκρισης σε μηνύματα (ώρες)</label>
              <input id="rh" type="number" min="1" value={form.avg_response_hours} onChange={set('avg_response_hours')} />
            </div>
          </div>
          <label className="row small" style={{ fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.lgbtq_friendly}
              onChange={(e) => setForm({ ...form, lgbtq_friendly: e.target.checked })} />
            Δηλώνω ΛΟΑΤΚΙ+ φιλικό πλαίσιο
          </label>
        </section>

        {error && <p className="error">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Υποβολή…' : 'Υποβολή αίτησης'}</button>
        <p className="small muted">
          Υποβάλλοντας δηλώνεις ότι τα στοιχεία είναι ακριβή και ότι κατέχεις εν ισχύ άδεια άσκησης
          επαγγέλματος. Ψάχνεις θεραπεία; <Link to="/get-started">Πήγαινε εδώ</Link>.
        </p>
      </form>
    </main>
  );
}
