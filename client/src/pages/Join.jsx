import { Link } from 'react-router-dom';

// The fork in the road: everyone who signs up says first who they are.
export default function Join() {
  return (
    <main className="container section stack" style={{ maxWidth: 900 }}>
      <div className="center stack">
        <h1>Καλώς ήρθες στο MindBridge</h1>
        <p className="muted">Πες μας πρώτα ποιος είσαι, για να σου δείξουμε τη σωστή διαδρομή.</p>
      </div>

      <div className="grid grid-2">
        <article className="card stack role-card">
          <span className="pill">Ψάχνω θεραπεία</span>
          <h2>Είμαι πελάτης</h2>
          <p className="small muted">
            Απαντάς σε ένα σύντομο ερωτηματολόγιο, σε συνδέουμε με αδειούχο θεραπευτή που ταιριάζει στις
            ανάγκες σου και ξεκινάς μέσα σε 24 ώρες.
          </p>
          <ul className="small">
            <li>Ερωτηματολόγιο αντιστοίχισης (3 λεπτά)</li>
            <li>Αυτόματη σύνδεση με τον καταλληλότερο θεραπευτή</li>
            <li>Ερωτηματολόγιο γνωριμίας πριν την πρώτη επαφή</li>
            <li>Πρώτη εβδομάδα δωρεάν</li>
          </ul>
          <Link className="btn block" to="/get-started">Ξεκίνα ως πελάτης</Link>
        </article>

        <article className="card stack role-card">
          <span className="pill warn">Θέλω να συνεργαστώ</span>
          <h2>Είμαι θεραπευτής</h2>
          <p className="small muted">
            Υποβάλλεις αίτηση με τα διαπιστευτήριά σου. Η ομάδα μας ελέγχει την άδεια άσκησης
            επαγγέλματος και, μόλις εγκριθείς, δέχεσαι μέλη που ταιριάζουν στην εξειδίκευσή σου.
          </p>
          <ul className="small">
            <li>Έλεγχος άδειας και τίτλων σπουδών</li>
            <li>Ορίζεις μόνος/η σου διαθεσιμότητα και φόρτο</li>
            <li>Εργαλεία: δωμάτιο, συνεδρίες, φύλλα εργασίας</li>
            <li>Πληρωμή ανά μήνα, χωρίς κόστος εγγραφής</li>
          </ul>
          <Link className="btn secondary block" to="/apply">Κάνε αίτηση ως θεραπευτής</Link>
        </article>
      </div>

      <p className="center small muted">Έχεις ήδη λογαριασμό; <Link to="/login">Σύνδεση</Link></p>
    </main>
  );
}
