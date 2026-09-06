import { sql, initDb } from './db/index.js';
import { hashPassword } from './auth.js';
import { THERAPISTS, WORKSHEETS, REVIEW_BODIES, GROUPINARS } from '../shared/seed-data.js';

// Τα demo δεδομένα (και οι λογαριασμοί με κοινό κωδικό) μπαίνουν μόνο εκεί που
// τα θέλουμε: τοπική ανάπτυξη και tests. Σε production χρειάζεται ρητό SEED_DEMO=1.
export async function ensureSeed() {
  const allowed = process.env.SEED_DEMO === '1' || process.env.NODE_ENV !== 'production';
  if (!allowed) return;
  const { c } = await sql.get('SELECT COUNT(*) AS c FROM users');
  if (Number(c) > 0) return;
  await seed();
}

export async function seed() {
  const pw = hashPassword('password123');
  const insertUser = (email, role, name, nickname, phone = null) =>
    sql.insert(
      'INSERT INTO users (email, password_hash, role, display_name, nickname, phone) VALUES (?,?,?,?,?,?)',
      [email, pw, role, name, nickname, phone]
    );

  for (const [i, t] of THERAPISTS.entries()) {
    const userId = await insertUser(`therapist${i + 1}@mindbridge.gr`, 'therapist', t.name, t.name.split(' ')[0]);
    const bio = `Είμαι ${t.credentials.toLowerCase()} με ${t.years} χρόνια κλινικής εμπειρίας. ` +
      `Δουλεύω κυρίως με ${t.headline.toLowerCase()} και πιστεύω ότι η θεραπεία είναι μια συνεργασία: ` +
      'εσύ φέρνεις την εμπειρία σου, εγώ τα εργαλεία και το πλαίσιο ασφάλειας. ' +
      'Στην πρώτη μας επαφή θα χαρτογραφήσουμε μαζί τι σε δυσκολεύει και θα ορίσουμε ρεαλιστικούς στόχους.';
    const rating = Math.round((4.4 + ((i * 7) % 6) / 10) * 10) / 10;
    const therapistId = await sql.insert(`
      INSERT INTO therapists (user_id, headline, bio, credentials, license_no, years_experience, gender,
        languages, specialties, approaches, faith_based, lgbtq_friendly, photo, rating, reviews_count,
        avg_response_hours, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'approved')
    `, [userId, t.headline, bio, t.credentials, t.license, t.years, t.gender, t.langs, t.spec, t.appr,
        t.faith ? 1 : 0, t.lgbtq ?? 1, null, rating, 20 + ((i * 37) % 180), t.resp]);

    for (let r = 0; r < 3; r++) {
      await sql.run('INSERT INTO reviews (therapist_id, rating, body, author_label) VALUES (?,?,?,?)',
        [therapistId, r === 2 ? 4 : 5, REVIEW_BODIES[(i + r) % REVIEW_BODIES.length], 'Μέλος MindBridge']);
    }

    // Two weeks of slots, generated relative to today with a few gaps.
    for (let d = 1; d <= 14; d++) {
      for (const hour of [10, 15, 19]) {
        if ((d + hour + i) % 3 === 0) continue;
        const start = new Date();
        start.setDate(start.getDate() + d);
        start.setHours(hour, 0, 0, 0);
        await sql.run('INSERT INTO availability (therapist_id, starts_at, duration_min, modality) VALUES (?,?,?,?)',
          [therapistId, start.toISOString(), 45, ['video', 'phone', 'live_chat'][(d + hour) % 3]]);
      }
    }
  }

  for (const w of WORKSHEETS) {
    await sql.run('INSERT INTO worksheets (slug, title, category, description, fields) VALUES (?,?,?,?,?)',
      [w.slug, w.title, w.category, w.description, JSON.stringify(w.fields)]);
  }

  for (const [i, g] of GROUPINARS.entries()) {
    const start = new Date();
    start.setDate(start.getDate() + 2 + i * 3);
    start.setHours(19, 0, 0, 0);
    await sql.run(
      'INSERT INTO groupinars (title, topic, host_therapist_id, starts_at, duration_min, description) VALUES (?,?,?,?,?,?)',
      [g.title, g.topic, (i % THERAPISTS.length) + 1, start.toISOString(), 60, g.desc]
    );
  }

  // Demo member with an active match, so the app is explorable immediately.
  const demoId = await insertUser('demo@mindbridge.gr', 'client', 'Δήμητρα Ν.', 'Δήμητρα');
  await sql.run("INSERT INTO intakes (user_id, anon_token, service, answers, risk_level) VALUES (?,?,?,?,'low')", [
    demoId, 'demo', 'individual', JSON.stringify({
      service: 'individual', age: '25-34', gender: 'female',
      topics: ['anxiety', 'stress', 'sleep'], sleep: 'poor', mood: 'sometimes',
      self_harm: 'no', therapy_before: 'no', therapist_gender: 'female',
      approach: ['cbt', 'mindfulness'], language: 'el', faith: 'no',
      modality: ['messaging', 'video'], urgency: 'now',
    }),
  ]);
  const matchId = await sql.insert('INSERT INTO matches (client_id, therapist_id, score, reason) VALUES (?,?,?,?)',
    [demoId, 1, 92, 'εξειδίκευση σε 3 από τα θέματά σου, μιλάει τη γλώσσα σου']);
  const roomId = await sql.insert('INSERT INTO rooms (match_id) VALUES (?)', [matchId]);
  const therapistUser = await sql.get('SELECT user_id FROM therapists WHERE id = 1');
  const conversation = [
    [therapistUser.user_id, 'Γεια σου Δήμητρα! Χαίρομαι που ξεκινάμε μαζί. Πες μου με δικά σου λόγια τι σε φέρνει εδώ.'],
    [demoId, 'Γεια σας. Τους τελευταίους μήνες έχω πολύ άγχος στη δουλειά και δεν κοιμάμαι καλά.'],
    [therapistUser.user_id, 'Σε ακούω. Πότε πρωτοπρόσεξες ότι ο ύπνος άλλαξε; Υπήρξε κάποιο γεγονός εκείνη την περίοδο;'],
  ];
  for (const [sender, body] of conversation) {
    await sql.run('INSERT INTO messages (room_id, sender_id, body) VALUES (?,?,?)', [roomId, sender, body]);
  }
  await sql.run(
    "INSERT INTO subscriptions (user_id, plan, billing_period, price_cents, status, renews_at) VALUES (?,'standard','monthly',25600,'active',datetime('now','+21 days'))",
    [demoId]
  );
  await sql.run('INSERT INTO payments (user_id, amount_cents, description) VALUES (?,?,?)',
    [demoId, 25600, 'Συνδρομή standard (monthly)']);

  await insertUser('admin@mindbridge.gr', 'admin', 'Διαχειριστής', 'Admin');

  // One application waiting for review, so the admin screen has something real.
  const applicantId = await insertUser('applicant@mindbridge.gr', 'therapist', 'Κατερίνα Βλάχου', 'Κατερίνα');
  await sql.run(`
    INSERT INTO therapists (user_id, headline, bio, credentials, license_no, years_experience, gender,
      languages, specialties, approaches, faith_based, lgbtq_friendly, rating, reviews_count,
      max_clients, avg_response_hours, status, applied_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,0,1,0,0,?,?, 'pending', datetime('now','-1 day'))
  `, [applicantId, 'Άγχος και ψυχοσωματικά συμπτώματα',
      'Εργάζομαι με ενήλικες που βιώνουν άγχος με σωματικές εκδηλώσεις. Εκπαίδευση σε CBT και τεχνικές χαλάρωσης.',
      'Ψυχολόγος, MSc Κλινική Ψυχολογία', 'GR-PSY-15320', 6, 'female', 'el,en', 'anxiety,stress,sleep',
      'cbt,mindfulness', 18, 10]);

  console.log('Seed ready: 12 θεραπευτές, demo@mindbridge.gr / therapist1@mindbridge.gr — κωδικός password123');
}

// `npm run seed` wipes and re-seeds; the server only ever calls ensureSeed().
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  await initDb();
  for (const table of ['notifications', 'reviews', 'payments', 'financial_aid', 'subscriptions',
    'groupinar_registrations', 'groupinars', 'worksheet_assignments', 'worksheets', 'assessments',
    'journal_entries', 'sessions', 'availability', 'messages', 'rooms', 'matches', 'intakes',
    'therapists', 'users']) {
    await sql.run(`DELETE FROM ${table}`);
  }
  await seed();
  await sql.close();
}
