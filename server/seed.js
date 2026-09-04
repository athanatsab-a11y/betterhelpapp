import { db } from './db.js';
import { hashPassword } from './auth.js';

const THERAPISTS = [
  { name: 'Δρ. Ελένη Παπαδοπούλου', gender: 'female', headline: 'Άγχος, πανικός και burnout', credentials: 'Ψυχολόγος, MSc Γνωσιακή-Συμπεριφορική Θεραπεία', license: 'GR-PSY-10421', years: 12, langs: 'el,en', spec: 'anxiety,stress,sleep,self_esteem', appr: 'cbt,mindfulness,act', resp: 4 },
  { name: 'Νίκος Αντωνίου', gender: 'male', headline: 'Κατάθλιψη και μεταβάσεις ζωής', credentials: 'Ψυχοθεραπευτής, MSc Κλινική Ψυχολογία', license: 'GR-PSY-11876', years: 9, langs: 'el', spec: 'depression,career,self_esteem,grief', appr: 'psychodynamic,humanistic', resp: 10 },
  { name: 'Μαρία Κωνσταντίνου', gender: 'female', headline: 'Σχέσεις και θεραπεία ζεύγους', credentials: 'Συστημική Ψυχοθεραπεύτρια', license: 'GR-PSY-09233', years: 15, langs: 'el,en', spec: 'relationships,parenting,anger', appr: 'systemic,solution', resp: 8 },
  { name: 'Δρ. Άλκης Βασιλείου', gender: 'male', headline: 'Τραύμα, PTSD και EMDR', credentials: 'Ψυχίατρος-Ψυχοθεραπευτής', license: 'GR-MD-40122', years: 18, langs: 'el,en,de', spec: 'trauma,anxiety,depression', appr: 'emdr,cbt', resp: 12 },
  { name: 'Ιωάννα Δημητρίου', gender: 'female', headline: 'ΛΟΑΤΚΙ+ ταυτότητα και αυτοεκτίμηση', credentials: 'Ψυχολόγος, MSc Συμβουλευτική', license: 'GR-PSY-12990', years: 7, langs: 'el,en', spec: 'lgbtq,self_esteem,anxiety,relationships', appr: 'humanistic,act', resp: 6, lgbtq: 1 },
  { name: 'Στέφανος Ρήγας', gender: 'male', headline: 'Εξαρτήσεις και έλεγχος παρορμήσεων', credentials: 'Ψυχολόγος, Εξειδίκευση στις Εξαρτήσεις', license: 'GR-PSY-08877', years: 14, langs: 'el', spec: 'addiction,anger,stress', appr: 'cbt,solution', resp: 9 },
  { name: 'Χριστίνα Λάμπρου', gender: 'female', headline: 'Διατροφικές διαταραχές και εικόνα σώματος', credentials: 'Ψυχολόγος, MSc Διατροφικές Διαταραχές', license: 'GR-PSY-13455', years: 8, langs: 'el,en', spec: 'eating,self_esteem,anxiety', appr: 'cbt,mindfulness', resp: 7 },
  { name: 'Πέτρος Μαυρίδης', gender: 'male', headline: 'ΔΕΠΥ ενηλίκων και οργάνωση ζωής', credentials: 'Ψυχολόγος, MSc Νευροψυχολογία', license: 'GR-PSY-14021', years: 6, langs: 'el,en', spec: 'adhd,career,stress', appr: 'cbt,solution', resp: 5 },
  { name: 'Αγγελική Σωτηρίου', gender: 'female', headline: 'Πένθος και απώλεια', credentials: 'Ψυχοθεραπεύτρια, Εξειδίκευση στο Πένθος', license: 'GR-PSY-10088', years: 20, langs: 'el', spec: 'grief,depression,trauma', appr: 'humanistic,psychodynamic', resp: 14, faith: 1 },
  { name: 'Λευτέρης Κατσαρός', gender: 'male', headline: 'Γονεϊκότητα και εφηβεία', credentials: 'Ψυχολόγος Παιδιού & Εφήβου', license: 'GR-PSY-11500', years: 11, langs: 'el,en', spec: 'parenting,anger,relationships', appr: 'systemic,cbt', resp: 8 },
  { name: 'Δάφνη Αλεξίου', gender: 'nonbinary', headline: 'Ταυτότητα, άγχος και mindfulness', credentials: 'Ψυχολόγος, MSc Mindfulness-Based Therapy', license: 'GR-PSY-14877', years: 5, langs: 'el,en', spec: 'lgbtq,anxiety,sleep,self_esteem', appr: 'mindfulness,act,humanistic', resp: 3, lgbtq: 1 },
  { name: 'Sarah Whitmore', gender: 'female', headline: 'English-speaking therapy for expats', credentials: 'Counselling Psychologist, BPS', license: 'UK-BPS-77120', years: 13, langs: 'en,de', spec: 'anxiety,depression,career,relationships', appr: 'cbt,humanistic', resp: 6 },
];

const WORKSHEETS = [
  {
    slug: 'thought-record', title: 'Ημερολόγιο Σκέψεων (CBT)', category: 'Άγχος',
    description: 'Κατάγραψε μια δύσκολη στιγμή και αναγνώρισε τις αυτόματες σκέψεις σου.',
    fields: [
      { key: 'situation', label: 'Τι συνέβη;', type: 'textarea' },
      { key: 'emotion', label: 'Τι ένιωσες;', type: 'text' },
      { key: 'intensity', label: 'Ένταση συναισθήματος (0-100)', type: 'number' },
      { key: 'thought', label: 'Ποια σκέψη πέρασε από το μυαλό σου;', type: 'textarea' },
      { key: 'evidence_for', label: 'Στοιχεία υπέρ αυτής της σκέψης', type: 'textarea' },
      { key: 'evidence_against', label: 'Στοιχεία κατά αυτής της σκέψης', type: 'textarea' },
      { key: 'alternative', label: 'Μια πιο ισορροπημένη σκέψη', type: 'textarea' },
    ],
  },
  {
    slug: 'gratitude', title: 'Ημερολόγιο Ευγνωμοσύνης', category: 'Διάθεση',
    description: 'Τρία πράγματα για τα οποία είσαι ευγνώμων σήμερα.',
    fields: [
      { key: 'one', label: '1.', type: 'text' },
      { key: 'two', label: '2.', type: 'text' },
      { key: 'three', label: '3.', type: 'text' },
      { key: 'why', label: 'Γιατί έχουν σημασία για σένα;', type: 'textarea' },
    ],
  },
  {
    slug: 'sleep-diary', title: 'Ημερολόγιο Ύπνου', category: 'Ύπνος',
    description: 'Παρακολούθησε τη ρουτίνα του ύπνου σου για μία εβδομάδα.',
    fields: [
      { key: 'bedtime', label: 'Ώρα κατάκλισης', type: 'text' },
      { key: 'wake', label: 'Ώρα αφύπνισης', type: 'text' },
      { key: 'awakenings', label: 'Αφυπνίσεις μέσα στη νύχτα', type: 'number' },
      { key: 'quality', label: 'Ποιότητα ύπνου (1-5)', type: 'number' },
      { key: 'caffeine', label: 'Καφεΐνη/αλκοόλ μετά τις 16:00;', type: 'select', options: ['Όχι', 'Ναι'] },
    ],
  },
  {
    slug: 'values', title: 'Πυξίδα Αξιών (ACT)', category: 'Στόχοι',
    description: 'Ξεκαθάρισε τι έχει πραγματικά σημασία για σένα.',
    fields: [
      { key: 'domain', label: 'Τομέας ζωής', type: 'select', options: ['Σχέσεις', 'Καριέρα', 'Υγεία', 'Προσωπική ανάπτυξη', 'Κοινότητα'] },
      { key: 'value', label: 'Ποια αξία σου είναι σημαντική εδώ;', type: 'text' },
      { key: 'gap', label: 'Πόσο κοντά ζεις σε αυτή την αξία (0-10);', type: 'number' },
      { key: 'action', label: 'Ένα μικρό βήμα αυτή την εβδομάδα', type: 'textarea' },
    ],
  },
  {
    slug: 'boundaries', title: 'Όρια στις Σχέσεις', category: 'Σχέσεις',
    description: 'Αναγνώρισε πού χρειάζεσαι πιο ξεκάθαρα όρια.',
    fields: [
      { key: 'person', label: 'Σε ποια σχέση;', type: 'text' },
      { key: 'feeling', label: 'Τι σε ενοχλεί;', type: 'textarea' },
      { key: 'need', label: 'Τι χρειάζεσαι αντ’ αυτού;', type: 'textarea' },
      { key: 'phrase', label: 'Πώς θα το διατυπώσεις;', type: 'textarea' },
    ],
  },
  {
    slug: 'panic-plan', title: 'Σχέδιο Κρίσης Πανικού', category: 'Άγχος',
    description: 'Ένα έτοιμο σχέδιο για τις δύσκολες στιγμές.',
    fields: [
      { key: 'signs', label: 'Πρώιμα σημάδια', type: 'textarea' },
      { key: 'grounding', label: 'Τεχνική γείωσης που με βοηθά', type: 'textarea' },
      { key: 'people', label: 'Ποιον μπορώ να καλέσω;', type: 'text' },
      { key: 'phrase', label: 'Φράση που με ηρεμεί', type: 'text' },
    ],
  },
];

const REVIEW_BODIES = [
  'Ένιωσα από την πρώτη στιγμή ότι με ακούει πραγματικά. Απαντά πάντα μέσα στη μέρα.',
  'Μου έδωσε συγκεκριμένα εργαλεία, όχι γενικές συμβουλές. Έχω δει μεγάλη διαφορά σε 2 μήνες.',
  'Πολύ ζεστή προσέγγιση, χωρίς κρίση. Το συνιστώ ανεπιφύλακτα.',
  'Οι συνεδρίες με βίντεο είναι πολύ βολικές και ποτέ δεν ένιωσα βιασύνη.',
  'Με βοήθησε να καταλάβω μοτίβα που κουβαλούσα χρόνια.',
];

const GROUPINARS = [
  { title: 'Διαχείριση άγχους στην καθημερινότητα', topic: 'anxiety', desc: 'Πρακτικές τεχνικές αναπνοής και γνωσιακής αναδόμησης.' },
  { title: 'Πώς να θέτεις όρια χωρίς ενοχές', topic: 'relationships', desc: 'Ασκήσεις διεκδικητικής επικοινωνίας.' },
  { title: 'Ύπνος: επαναφορά της ρουτίνας', topic: 'sleep', desc: 'Υγιεινή ύπνου βασισμένη στο CBT-I.' },
  { title: 'Burnout: αναγνώριση και ανάκαμψη', topic: 'stress', desc: 'Σημάδια εξουθένωσης και σχέδιο επανένταξης.' },
  { title: 'Αυτοσυμπόνια για τελειομανείς', topic: 'self_esteem', desc: 'Από την αυτοκριτική στην αυτοφροντίδα.' },
  { title: 'Πένθος: ζώντας με την απώλεια', topic: 'grief', desc: 'Ανοιχτή ομάδα υποστήριξης με συντονιστή.' },
];

export function ensureSeed() {
  const { c } = db.prepare('SELECT COUNT(*) c FROM users').get();
  if (c > 0) return;
  seed();
}

export function seed() {
  const insertUser = db.prepare(
    'INSERT INTO users (email, password_hash, role, display_name, nickname) VALUES (?,?,?,?,?)'
  );
  const insertTherapist = db.prepare(`
    INSERT INTO therapists (user_id, headline, bio, credentials, license_no, years_experience, gender,
      languages, specialties, approaches, faith_based, lgbtq_friendly, photo, rating, reviews_count, avg_response_hours)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const pw = hashPassword('password123');

  db.transaction(() => {
    THERAPISTS.forEach((t, i) => {
      const email = `therapist${i + 1}@mindbridge.gr`;
      const uid = insertUser.run(email, pw, 'therapist', t.name, t.name.split(' ')[0]).lastInsertRowid;
      const bio = `Είμαι ${t.credentials.toLowerCase()} με ${t.years} χρόνια κλινικής εμπειρίας. ` +
        `Δουλεύω κυρίως με ${t.headline.toLowerCase()} και πιστεύω ότι η θεραπεία είναι μια συνεργασία: ` +
        'εσύ φέρνεις την εμπειρία σου, εγώ τα εργαλεία και το πλαίσιο ασφάλειας. ' +
        'Στην πρώτη μας επαφή θα χαρτογραφήσουμε μαζί τι σε δυσκολεύει και θα ορίσουμε ρεαλιστικούς στόχους.';
      const rating = Math.round((4.4 + Math.random() * 0.6) * 10) / 10;
      const reviews = 20 + Math.floor(Math.random() * 180);
      const tid = insertTherapist.run(
        uid, t.headline, bio, t.credentials, t.license, t.years, t.gender,
        t.langs, t.spec, t.appr, t.faith ? 1 : 0, t.lgbtq ?? 1, null, rating, reviews, t.resp
      ).lastInsertRowid;

      // Reviews
      for (let r = 0; r < 3; r++) {
        db.prepare('INSERT INTO reviews (therapist_id, rating, body, author_label) VALUES (?,?,?,?)')
          .run(tid, 5 - (r === 2 ? 1 : 0), REVIEW_BODIES[(i + r) % REVIEW_BODIES.length], `Μέλος MindBridge`);
      }

      // Availability: next 14 days, three slots a day.
      const now = new Date();
      for (let d = 1; d <= 14; d++) {
        for (const hour of [10, 15, 19]) {
          if ((d + hour + i) % 3 === 0) continue; // some gaps
          const start = new Date(now);
          start.setDate(now.getDate() + d);
          start.setHours(hour, 0, 0, 0);
          db.prepare('INSERT INTO availability (therapist_id, starts_at, duration_min, modality) VALUES (?,?,?,?)')
            .run(tid, start.toISOString(), 45, ['video', 'phone', 'live_chat'][(d + hour) % 3]);
        }
      }
    });

    for (const w of WORKSHEETS) {
      db.prepare('INSERT INTO worksheets (slug, title, category, description, fields) VALUES (?,?,?,?,?)')
        .run(w.slug, w.title, w.category, w.description, JSON.stringify(w.fields));
    }

    GROUPINARS.forEach((g, i) => {
      const start = new Date();
      start.setDate(start.getDate() + 2 + i * 3);
      start.setHours(19, 0, 0, 0);
      db.prepare('INSERT INTO groupinars (title, topic, host_therapist_id, starts_at, duration_min, description) VALUES (?,?,?,?,?,?)')
        .run(g.title, g.topic, (i % THERAPISTS.length) + 1, start.toISOString(), 60, g.desc);
    });

    // Demo client with an active match, so the app is explorable immediately.
    const demoId = insertUser.run('demo@mindbridge.gr', pw, 'client', 'Δήμητρα Ν.', 'Δήμητρα').lastInsertRowid;
    db.prepare("INSERT INTO intakes (user_id, anon_token, service, answers, risk_level) VALUES (?,?,?,?,'low')")
      .run(demoId, 'demo', 'individual', JSON.stringify({
        service: 'individual', age: '25-34', gender: 'female',
        topics: ['anxiety', 'stress', 'sleep'], sleep: 'poor', mood: 'sometimes',
        self_harm: 'no', therapy_before: 'no', therapist_gender: 'female',
        approach: ['cbt', 'mindfulness'], language: 'el', faith: 'no',
        modality: ['messaging', 'video'], urgency: 'now',
      }));
    const matchId = db.prepare('INSERT INTO matches (client_id, therapist_id, score, reason) VALUES (?,?,?,?)')
      .run(demoId, 1, 92, 'εξειδίκευση σε 3 από τα θέματά σου, μιλάει τη γλώσσα σου').lastInsertRowid;
    const roomId = db.prepare('INSERT INTO rooms (match_id) VALUES (?)').run(matchId).lastInsertRowid;
    const therapistUser = db.prepare('SELECT user_id FROM therapists WHERE id = 1').get().user_id;
    const convo = [
      [therapistUser, 'Γεια σου Δήμητρα! Χαίρομαι που ξεκινάμε μαζί. Πες μου με δικά σου λόγια τι σε φέρνει εδώ.'],
      [demoId, 'Γεια σας. Τους τελευταίους μήνες έχω πολύ άγχος στη δουλειά και δεν κοιμάμαι καλά.'],
      [therapistUser, 'Σε ακούω. Πότε πρωτοπρόσεξες ότι ο ύπνος άλλαξε; Υπήρξε κάποιο γεγονός εκείνη την περίοδο;'],
    ];
    for (const [sender, body] of convo) {
      db.prepare('INSERT INTO messages (room_id, sender_id, body) VALUES (?,?,?)').run(roomId, sender, body);
    }
    db.prepare("INSERT INTO subscriptions (user_id, plan, billing_period, price_cents, status, renews_at) VALUES (?,'standard','monthly',25600,'active',datetime('now','+21 days'))")
      .run(demoId);
    db.prepare('INSERT INTO payments (user_id, amount_cents, description) VALUES (?,?,?)')
      .run(demoId, 25600, 'Συνδρομή standard (monthly)');

    insertUser.run('admin@mindbridge.gr', pw, 'admin', 'Διαχειριστής', 'Admin');
  })();

  console.log('Seed ready: 12 θεραπευτές, demo@mindbridge.gr / therapist1@mindbridge.gr — κωδικός password123');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  db.exec('DELETE FROM users; DELETE FROM worksheets; DELETE FROM groupinars;');
  seed();
}
