import { db } from './db.js';
import { hashPassword } from './auth.js';
import { THERAPISTS, WORKSHEETS, REVIEW_BODIES, GROUPINARS } from '../shared/seed-data.js';


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
