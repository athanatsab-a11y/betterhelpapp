import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { TherapistCard, Avatar } from '../components/common.jsx';

const STEPS = [
  { t: 'Απάντησε στο ερωτηματολόγιο', d: 'Λίγες ερωτήσεις για το τι σε απασχολεί, τις προτιμήσεις σου και τον τρόπο που θέλεις να επικοινωνείς. Παίρνει 3 λεπτά.' },
  { t: 'Σε συνδέουμε με θεραπευτή', d: 'Ο αλγόριθμος αντιστοίχισης προτείνει τον καταλληλότερο αδειούχο θεραπευτή — συνήθως μέσα σε 24 ώρες.' },
  { t: 'Ξεκίνα τη θεραπεία σου', d: 'Στείλε μηνύματα όποτε θέλεις και κλείσε live συνεδρίες με βίντεο, τηλέφωνο ή chat. Αλλάζεις θεραπευτή οποτεδήποτε, χωρίς χρέωση.' },
];

const TESTIMONIALS = [
  { name: 'Άννα, 31', text: 'Δεν πίστευα ότι η online θεραπεία θα δούλευε για μένα. Το να μπορώ να γράψω στη θεραπεύτριά μου τη στιγμή που με πιάνει το άγχος άλλαξε τα πάντα.' },
  { name: 'Γιώργος, 44', text: 'Μετά από burnout δεν είχα χρόνο για ραντεβού. Εδώ κλείνω τη συνεδρία μου στις 21:00 από το σπίτι.' },
  { name: 'Ναταλία, 26', text: 'Άλλαξα θεραπευτή μία φορά και έγινε σε δύο μέρες, χωρίς αμηχανία και χωρίς επιπλέον κόστος.' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  useEffect(() => { api.get('/therapists').then((d) => setFeatured(d.therapists.slice(0, 3))).catch(() => {}); }, []);

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="pill">Πάνω από 4.500 αδειούχοι θεραπευτές</span>
            <h1>Η θεραπεία που χρειάζεσαι, <span>όποτε τη χρειάζεσαι</span></h1>
            <p style={{ fontSize: '1.15rem' }}>
              Συνδέσου με έναν αδειούχο ψυχοθεραπευτή μέσα σε 24 ώρες. Στείλε μηνύματα όποτε θέλεις,
              κάνε live συνεδρίες με βίντεο, τηλέφωνο ή chat — από όπου κι αν είσαι.
            </p>
            <div className="row">
              <Link className="btn" to="/join">Ξεκίνα τώρα</Link>
              <Link className="btn secondary" to="/how-it-works">Πώς λειτουργεί</Link>
            </div>
            <div className="stat-strip">
              <div className="stat"><b>24ω</b><span className="small muted">μέση αντιστοίχιση</span></div>
              <div className="stat"><b>4.9/5</b><span className="small muted">ικανοποίηση μελών</span></div>
              <div className="stat"><b>0€</b><span className="small muted">αλλαγή θεραπευτή</span></div>
              <div className="stat"><b>7 ημέρες</b><span className="small muted">δωρεάν δοκιμή</span></div>
            </div>
          </div>
          <div className="hero-art">
            <div className="card stack" style={{ maxWidth: 340 }}>
              <div className="row">
                <Avatar name="Δρ. Ελένη Παπαδοπούλου" />
                <div>
                  <b>Δρ. Ελένη Π.</b>
                  <div className="small muted">απαντά συνήθως σε 4 ώρες</div>
                </div>
              </div>
              <div className="bubble small">Πώς πέρασε η εβδομάδα σου; Δοκίμασες την άσκηση αναπνοής;</div>
              <div className="bubble mine small">Ναι! Με βοήθησε πολύ πριν την παρουσίαση.</div>
              <div className="small muted center">Κρυπτογραφημένη συνομιλία · 100% εμπιστευτική</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <h2 className="center">Πώς λειτουργεί</h2>
          <p className="center muted">Τρία βήματα από το «το σκέφτομαι» στο «το ξεκίνησα».</p>
          <div className="grid grid-3" style={{ marginTop: '2rem' }}>
            {STEPS.map((s, i) => (
              <div className="card" key={s.t}>
                <div className="step-num">{i + 1}</div>
                <h3>{s.t}</h3>
                <p className="small muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="spread">
            <h2>Γνώρισε μερικούς θεραπευτές μας</h2>
            <Link to="/therapists">Δες όλο τον κατάλογο →</Link>
          </div>
          <div className="grid grid-3" style={{ marginTop: '1.5rem' }}>
            {featured.map((t) => (
              <TherapistCard key={t.id} t={t} footer={<Link className="btn secondary small" to={`/therapists/${t.id}`}>Προφίλ</Link>} />
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <h2 className="center">Τι λένε τα μέλη μας</h2>
          <div className="grid grid-3" style={{ marginTop: '2rem' }}>
            {TESTIMONIALS.map((t) => (
              <div className="card" key={t.name}>
                <p className="quote small">{t.text}</p>
                <div className="small muted">— {t.name}</div>
              </div>
            ))}
          </div>
          <p className="center" style={{ marginTop: '2rem' }}><Link className="btn" to="/get-started">Βρες τον θεραπευτή σου</Link>
            <p className="small muted" style={{ marginTop: '1rem' }}>Είσαι ψυχολόγος ή ψυχοθεραπευτής; <Link to="/apply">Κάνε αίτηση συνεργασίας</Link>.</p></p>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2">
          <div>
            <h2>Θεραπεία για κάθε ανάγκη</h2>
            <ul className="small">
              <li><b>Ατομική θεραπεία</b> — άγχος, κατάθλιψη, τραύμα, αυτοεκτίμηση, ύπνος και άλλα.</li>
              <li><b>Θεραπεία ζεύγους</b> — επικοινωνία, εμπιστοσύνη, κρίσεις στη σχέση.</li>
              <li><b>Θεραπεία εφήβων (13-17)</b> — με γονική συναίνεση και εξειδικευμένους θεραπευτές.</li>
              <li><b>Groupinars</b> — ζωντανά διαδικτυακά σεμινάρια με ειδικούς, χωρίς επιπλέον κόστος.</li>
            </ul>
          </div>
          <div className="card stack">
            <h3>Κάθε συνδρομή περιλαμβάνει</h3>
            <ul className="small">
              <li>Απεριόριστη ανταλλαγή μηνυμάτων με τον θεραπευτή σου</li>
              <li>Εβδομαδιαίες live συνεδρίες 45 λεπτών</li>
              <li>Ψηφιακό ημερολόγιο και φύλλα εργασίας</li>
              <li>Αλλαγή θεραπευτή οποτεδήποτε — χωρίς χρέωση</li>
              <li>Ακύρωση συνδρομής όποτε θέλεις</li>
            </ul>
            <Link className="btn block" to="/pricing">Δες το κόστος</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
