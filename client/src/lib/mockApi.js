// Browser-only replica of the Express API, used by the static demo build
// (`npm run build:demo`). It keeps the exact same routes and response shapes as
// server/routes/*, backed by in-memory state seeded from shared/seed-data.js —
// so the real React app runs unchanged, with no server and no network.
import { THERAPISTS, WORKSHEETS, REVIEW_BODIES, GROUPINARS } from '../../../shared/seed-data.js';
import { questionnaireWithOptions, riskFromAnswers, SPECIALTIES, APPROACHES, PLANS, planPrice,
  ASSESSMENT, FREQ_SCALE, scoreAssessment } from '../../../shared/catalog.js';
import { scoreTherapists } from '../../../shared/matching-core.js';

const now = () => new Date().toISOString();
// Tolerant of both the stored csv strings and the arrays scoreTherapists returns.
const csv = (v) => (Array.isArray(v) ? v : String(v || '').split(',').filter(Boolean));
let seq = 0;
const nextId = () => ++seq;

/* ---------------- state ---------------- */

const db = { users: [], therapists: [], intakes: [], matches: [], rooms: [], messages: [],
  availability: [], sessions: [], journal: [], worksheets: [], assignments: [],
  groupinars: [], registrations: [], subscriptions: [], payments: [], aid: [],
  reviews: [], notifications: [], assessments: [] };

let session = null; // currently signed-in user id

function seed() {
  THERAPISTS.forEach((t, i) => {
    const user = { id: nextId(), email: `therapist${i + 1}@mindbridge.gr`, password: 'password123',
      role: 'therapist', display_name: t.name, nickname: t.name.split(' ')[0],
      timezone: 'Europe/Athens', notify_email: 1, notify_sms: 0, created_at: now() };
    db.users.push(user);
    const therapist = {
      id: i + 1, user_id: user.id, display_name: t.name, headline: t.headline,
      credentials: t.credentials, license_no: t.license, years_experience: t.years,
      gender: t.gender, languages: t.langs, specialties: t.spec, approaches: t.appr,
      faith_based: t.faith ? 1 : 0, lgbtq_friendly: t.lgbtq ?? 1, photo: null,
      rating: Math.round((4.4 + ((i * 7) % 6) / 10) * 10) / 10,
      reviews_count: 20 + ((i * 37) % 180), accepting_clients: 1, max_clients: 25,
      avg_response_hours: t.resp, status: 'approved', applied_at: null, reviewed_at: null, review_note: null,
      bio: `Είμαι ${t.credentials.toLowerCase()} με ${t.years} χρόνια κλινικής εμπειρίας. ` +
        `Δουλεύω κυρίως με ${t.headline.toLowerCase()} και πιστεύω ότι η θεραπεία είναι μια συνεργασία: ` +
        'εσύ φέρνεις την εμπειρία σου, εγώ τα εργαλεία και το πλαίσιο ασφάλειας. ' +
        'Στην πρώτη μας επαφή θα χαρτογραφήσουμε μαζί τι σε δυσκολεύει και θα ορίσουμε ρεαλιστικούς στόχους.',
    };
    db.therapists.push(therapist);

    for (let r = 0; r < 3; r++) {
      db.reviews.push({ id: nextId(), therapist_id: therapist.id, client_id: null,
        rating: r === 2 ? 4 : 5, body: REVIEW_BODIES[(i + r) % REVIEW_BODIES.length],
        author_label: 'Μέλος MindBridge', created_at: now() });
    }

    // Slots are generated relative to today so the demo never goes stale.
    for (let d = 1; d <= 14; d++) {
      for (const hour of [10, 15, 19]) {
        if ((d + hour + i) % 3 === 0) continue;
        const start = new Date();
        start.setDate(start.getDate() + d);
        start.setHours(hour, 0, 0, 0);
        db.availability.push({ id: nextId(), therapist_id: therapist.id,
          starts_at: start.toISOString(), duration_min: 45,
          modality: ['video', 'phone', 'live_chat'][(d + hour) % 3], booked: 0 });
      }
    }
  });

  WORKSHEETS.forEach((w, i) => db.worksheets.push({ id: i + 1, ...w }));

  GROUPINARS.forEach((g, i) => {
    const start = new Date();
    start.setDate(start.getDate() + 2 + i * 3);
    start.setHours(19, 0, 0, 0);
    db.groupinars.push({ id: i + 1, title: g.title, topic: g.topic, host_therapist_id: (i % THERAPISTS.length) + 1,
      starts_at: start.toISOString(), duration_min: 60, description: g.desc, capacity: 200,
      seeded_registrations: 40 + ((i * 23) % 120) });
  });

  // Demo member with an active match, mirroring server/seed.js.
  const demo = { id: nextId(), email: 'demo@mindbridge.gr', password: 'password123', role: 'client',
    display_name: 'Δήμητρα Ν.', nickname: 'Δήμητρα', timezone: 'Europe/Athens',
    notify_email: 1, notify_sms: 0, created_at: now() };
  db.users.push(demo);
  db.intakes.push({ id: nextId(), user_id: demo.id, anon_token: 'demo', service: 'individual', risk_level: 'low',
    created_at: now(), answers: { service: 'individual', age: '25-34', gender: 'female',
      topics: ['anxiety', 'stress', 'sleep'], sleep: 'poor', mood: 'sometimes', self_harm: 'no',
      therapy_before: 'no', therapist_gender: 'female', approach: ['cbt', 'mindfulness'],
      language: 'el', faith: 'no', modality: ['messaging', 'video'], urgency: 'now' } });
  const match = { id: nextId(), client_id: demo.id, therapist_id: 1, status: 'active', score: 92,
    reason: 'εξειδίκευση σε 3 από τα θέματά σου, μιλάει τη γλώσσα σου', started_at: now(), ended_at: null };
  db.matches.push(match);
  const room = { id: nextId(), match_id: match.id, created_at: now() };
  db.rooms.push(room);
  const therapistUserId = db.therapists[0].user_id;
  const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
  [
    [therapistUserId, 'Γεια σου Δήμητρα! Χαίρομαι που ξεκινάμε μαζί. Πες μου με δικά σου λόγια τι σε φέρνει εδώ.', 180],
    [demo.id, 'Γεια σας. Τους τελευταίους μήνες έχω πολύ άγχος στη δουλειά και δεν κοιμάμαι καλά.', 150],
    [therapistUserId, 'Σε ακούω. Πότε πρωτοπρόσεξες ότι ο ύπνος άλλαξε; Υπήρξε κάποιο γεγονός εκείνη την περίοδο;', 120],
  ].forEach(([sender, body, ago]) => {
    db.messages.push({ id: nextId(), room_id: room.id, sender_id: sender, body, kind: 'text',
      read_at: sender === demo.id ? now() : null, created_at: minutesAgo(ago) });
  });
  db.subscriptions.push({ id: nextId(), user_id: demo.id, plan: 'standard', billing_period: 'monthly',
    price_cents: 25600, discount_pct: 0, status: 'active',
    renews_at: new Date(Date.now() + 21 * 86400000).toISOString(), cancelled_at: null, created_at: now() });
  db.payments.push({ id: nextId(), user_id: demo.id, amount_cents: 25600,
    description: 'Συνδρομή standard (monthly)', status: 'paid', created_at: now() });

  // A couple of journal entries so the mood chart has something to draw.
  [[4, 'Καλύτερη μέρα', 'Δοκίμασα την άσκηση αναπνοής πριν τη σύσκεψη και βοήθησε.', 3],
   [2, 'Δύσκολο βράδυ', 'Ξύπνησα δύο φορές, σκεφτόμουν τη δουλειά.', 2],
   [3, 'Ουδέτερα', 'Τίποτα ιδιαίτερο σήμερα.', 1]].forEach(([mood, title, body, daysAgo]) => {
    db.journal.push({ id: nextId(), user_id: demo.id, title, body, mood, shared_with_therapist: 1,
      created_at: new Date(Date.now() - daysAgo * 86400000).toISOString() });
  });
  db.assignments.push({ id: nextId(), worksheet_id: 1, client_id: demo.id, assigned_by: therapistUserId,
    status: 'assigned', answers: null, assigned_at: now(), completed_at: null });
  db.notifications.push({ id: nextId(), user_id: demo.id, title: 'Νέο φύλλο εργασίας',
    body: 'Η Δρ. Ελένη Παπαδοπούλου σου ανέθεσε: Ημερολόγιο Σκέψεων (CBT)',
    link: '/app/worksheets', read_at: null, created_at: now() });

  const admin = { id: nextId(), email: 'admin@mindbridge.gr', password: 'password123', role: 'admin',
    display_name: 'Διαχειριστής', nickname: 'Admin', timezone: 'Europe/Athens', created_at: now() };
  db.users.push(admin);

  // One application waiting for review, so the admin screen has something real.
  const applicant = { id: nextId(), email: 'applicant@mindbridge.gr', password: 'password123', role: 'therapist',
    display_name: 'Κατερίνα Βλάχου', nickname: 'Κατερίνα', phone: '+30 210 0000000',
    timezone: 'Europe/Athens', created_at: now() };
  db.users.push(applicant);
  db.therapists.push({
    id: db.therapists.length + 1, user_id: applicant.id, display_name: applicant.display_name,
    headline: 'Άγχος και ψυχοσωματικά συμπτώματα',
    bio: 'Εργάζομαι με ενήλικες που βιώνουν άγχος με σωματικές εκδηλώσεις. Εκπαίδευση σε CBT και τεχνικές χαλάρωσης.',
    credentials: 'Ψυχολόγος, MSc Κλινική Ψυχολογία', license_no: 'GR-PSY-15320', years_experience: 6,
    gender: 'female', languages: 'el,en', specialties: 'anxiety,stress,sleep', approaches: 'cbt,mindfulness',
    faith_based: 0, lgbtq_friendly: 1, photo: null, rating: 0, reviews_count: 0, accepting_clients: 1,
    max_clients: 18, avg_response_hours: 10, status: 'pending',
    applied_at: new Date(Date.now() - 86400000).toISOString(), reviewed_at: null, review_note: null,
  });

  // The demo opens inside the product, signed in as the member; the demo bar
  // switches to the therapist portal or out to the public site.
  session = demo.id;
}

/* ---------------- helpers ---------------- */

const user = () => db.users.find((u) => u.id === session) || null;
const therapistOf = (userId) => db.therapists.find((t) => t.user_id === userId);
const activeMatch = (clientId) => db.matches.find((m) => m.client_id === clientId && m.status === 'active');
const roomOfMatch = (matchId) => db.rooms.find((r) => r.match_id === matchId);
const publicUser = (u) => (u ? { ...u, password: undefined } : null);

const notify = (userId, title, body, link) =>
  db.notifications.push({ id: nextId(), user_id: userId, title, body, link, read_at: null, created_at: now() });

const therapistRows = () => db.therapists.filter((t) => t.status === 'approved').map((t) => ({
  ...t, active_clients: db.matches.filter((m) => m.therapist_id === t.id && m.status === 'active').length,
}));

function publicTherapist(t) {
  return { id: t.id, display_name: t.display_name, headline: t.headline, bio: t.bio,
    credentials: t.credentials, license_no: t.license_no, years_experience: t.years_experience,
    gender: t.gender, languages: csv(t.languages), specialties: csv(t.specialties),
    approaches: csv(t.approaches), faith_based: !!t.faith_based, lgbtq_friendly: !!t.lgbtq_friendly,
    photo: t.photo, rating: t.rating, reviews_count: t.reviews_count,
    accepting_clients: !!t.accepting_clients, avg_response_hours: t.avg_response_hours,
    score: t.score, reason: t.reason };
}

function assignTherapist(clientId, therapistId, score, reason) {
  const current = activeMatch(clientId);
  if (current) { current.status = 'ended'; current.ended_at = now(); }
  const match = { id: nextId(), client_id: clientId, therapist_id: therapistId, status: 'active',
    score, reason, started_at: now(), ended_at: null };
  db.matches.push(match);
  const room = { id: nextId(), match_id: match.id, created_at: now() };
  db.rooms.push(room);
  const t = db.therapists.find((x) => x.id === therapistId);
  db.messages.push({ id: nextId(), room_id: room.id, sender_id: t.user_id, kind: 'text', read_at: null,
    body: `Γεια σου! Είμαι ο/η ${t.display_name}. Χαίρομαι που ξεκινάμε μαζί. Πες μου με δικά σου λόγια τι σε φέρνει εδώ και τι θα ήθελες να αλλάξει στη ζωή σου.`,
    created_at: now() });
  return { match_id: match.id, room_id: room.id, therapist_id: therapistId };
}

function messageWithSender(m) {
  const u = db.users.find((x) => x.id === m.sender_id);
  return { ...m, sender_name: u.display_name, sender_role: u.role };
}

/* ---------------- fake websocket ---------------- */

const sockets = new Set();
function pushSocket(payload) {
  for (const ws of sockets) ws._deliver(payload);
}

class DemoSocket {
  constructor() {
    this.readyState = 1;
    sockets.add(this);
    setTimeout(() => { this.onopen?.(); this._deliver({ type: 'ready' }); }, 0);
  }
  _deliver(payload) { this.onmessage?.({ data: JSON.stringify(payload) }); }
  send() { /* typing pings have no second participant in the demo */ }
  close() { sockets.delete(this); this.readyState = 3; this.onclose?.(); }
}

// The therapist "answers" a short while after the member writes, so the demo
// shows live delivery the same way the real WebSocket does.
const REPLIES = [
  'Σε ευχαριστώ που το μοιράστηκες. Πώς ένιωσες στο σώμα σου εκείνη τη στιγμή;',
  'Αυτό ακούγεται κουραστικό. Ας το δούμε μαζί στην επόμενη συνεδρία μας.',
  'Καλή παρατήρηση. Δοκίμασε αυτή την εβδομάδα να το σημειώνεις στο ημερολόγιο.',
  'Καταλαβαίνω. Τι θα ήταν το μικρότερο βήμα που θα σου φαινόταν εφικτό σήμερα;',
];
let replyIdx = 0;
function scheduleTherapistReply(room, senderId) {
  const match = db.matches.find((m) => m.id === room.match_id);
  const t = db.therapists.find((x) => x.id === match.therapist_id);
  if (t.user_id === senderId) return;
  setTimeout(() => {
    const msg = { id: nextId(), room_id: room.id, sender_id: t.user_id,
      body: REPLIES[replyIdx++ % REPLIES.length], kind: 'text', read_at: null, created_at: now() };
    db.messages.push(msg);
    notify(match.client_id, 'Νέο μήνυμα', `${t.display_name}: ${msg.body.slice(0, 80)}`, `/room/${room.id}`);
    pushSocket({ type: 'message', room_id: room.id, message: messageWithSender(msg) });
  }, 2600);
}

/* ---------------- routes ---------------- */

const ok = (data) => ({ status: 200, data });
const fail = (status, error) => ({ status, data: { error } });

function handle(method, path, body, query = {}) {
  const seg = path.split('/').filter(Boolean);
  const me = user();
  const auth = (fn) => (me ? fn(me) : fail(401, 'Απαιτείται σύνδεση'));

  /* auth */
  if (path === '/auth/me' && method === 'GET') {
    if (!me) return ok({ user: null });
    const extra = {};
    if (me.role === 'client') {
      extra.subscription = db.subscriptions.find((s) => s.user_id === me.id) || null;
      const m = activeMatch(me.id);
      if (m) {
        const t = db.therapists.find((x) => x.id === m.therapist_id);
        extra.match = { ...t, match_id: m.id, status: m.status, reason: m.reason,
          started_at: m.started_at, room_id: roomOfMatch(m.id).id };
      } else extra.match = null;
    }
    if (me.role === 'therapist') extra.therapist = therapistOf(me.id) || null;
    if (me.role === 'client') {
      const last = [...db.assessments].reverse().find((a) => a.user_id === me.id);
      extra.assessment = last ?? null;
    }
    extra.unread_notifications = db.notifications.filter((n) => n.user_id === me.id && !n.read_at).length;
    return ok({ user: publicUser(me), ...extra });
  }
  if (path === '/auth/login' && method === 'POST') {
    const u = db.users.find((x) => x.email === String(body.email || '').toLowerCase());
    if (!u || u.password !== body.password) return fail(401, 'Λάθος email ή κωδικός');
    session = u.id;
    return ok({ user: publicUser(u) });
  }
  if (path === '/auth/logout') { session = null; return ok({ ok: true }); }
  if (path === '/auth/register' && method === 'POST') {
    if (db.users.some((u) => u.email === String(body.email || '').toLowerCase())) {
      return fail(409, 'Υπάρχει ήδη λογαριασμός με αυτό το email');
    }
    if (String(body.password || '').length < 8) return fail(400, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
    const u = { id: nextId(), email: String(body.email).toLowerCase(), password: body.password, role: 'client',
      display_name: body.display_name, nickname: body.nickname || body.display_name.split(' ')[0],
      timezone: 'Europe/Athens', notify_email: 1, notify_sms: 0, created_at: now() };
    db.users.push(u);
    session = u.id;
    let matched = null;
    const intake = [...db.intakes].reverse().find((i) => i.anon_token === body.intake_token);
    if (intake) {
      intake.user_id = u.id;
      const best = scoreTherapists(therapistRows(), intake.answers, 1)[0];
      if (best) { assignTherapist(u.id, best.id, best.score, best.reason); matched = best.display_name; }
    }
    db.subscriptions.push({ id: nextId(), user_id: u.id, plan: body.plan || 'standard',
      billing_period: body.billing_period || 'monthly',
      price_cents: planPrice(body.plan || 'standard', body.billing_period || 'monthly'),
      discount_pct: 0, status: 'trialing', renews_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      cancelled_at: null, created_at: now() });
    return { status: 201, data: { user: publicUser(u), matched } };
  }
  if (path === '/auth/me' && method === 'PATCH') return auth((m) => { Object.assign(m, body); return ok({ user: publicUser(m) }); });
  if (path === '/auth/password') {
    return auth((m) => {
      if (m.password !== body.current) return fail(400, 'Ο τρέχων κωδικός δεν είναι σωστός');
      if (String(body.next || '').length < 8) return fail(400, 'Ο νέος κωδικός θέλει 8+ χαρακτήρες');
      m.password = body.next; return ok({ ok: true });
    });
  }

  if (path === '/auth/apply-therapist' && method === 'POST') {
    const b = body || {};
    const email = String(b.email || '').toLowerCase();
    if (!email || !b.password || !b.display_name || !b.credentials || !b.license_no) {
      return fail(400, 'Συμπλήρωσε όλα τα υποχρεωτικά πεδία');
    }
    if (String(b.password).length < 8) return fail(400, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
    if (!(b.specialties || []).length) return fail(400, 'Διάλεξε τουλάχιστον μία ειδίκευση');
    if (!(b.languages || []).length) return fail(400, 'Διάλεξε τουλάχιστον μία γλώσσα');
    if (db.users.some((u) => u.email === email)) return fail(409, 'Υπάρχει ήδη λογαριασμός με αυτό το email');
    if (db.therapists.some((t) => t.license_no === b.license_no)) return fail(409, 'Ο αριθμός άδειας χρησιμοποιείται ήδη');

    const u = { id: nextId(), email, password: b.password, role: 'therapist', display_name: b.display_name,
      nickname: b.display_name.split(' ')[0], phone: b.phone || null, timezone: 'Europe/Athens', created_at: now() };
    db.users.push(u);
    db.therapists.push({
      id: db.therapists.length + 1, user_id: u.id, display_name: u.display_name,
      headline: b.headline || '', bio: b.bio || '', credentials: b.credentials, license_no: b.license_no,
      years_experience: Number(b.years_experience) || 0, gender: b.gender || null,
      languages: (b.languages || []).join(','), specialties: (b.specialties || []).join(','),
      approaches: (b.approaches || []).join(','), faith_based: b.faith_based ? 1 : 0,
      lgbtq_friendly: b.lgbtq_friendly === false ? 0 : 1, photo: null, rating: 0, reviews_count: 0,
      accepting_clients: 1, max_clients: Number(b.max_clients) || 20,
      avg_response_hours: Number(b.avg_response_hours) || 12, status: 'pending',
      applied_at: now(), reviewed_at: null, review_note: null,
    });
    db.users.filter((x) => x.role === 'admin').forEach((a) =>
      notify(a.id, 'Νέα αίτηση θεραπευτή', `${b.display_name} — ${b.credentials}`, '/admin'));
    session = u.id;
    return { status: 201, data: { user: publicUser(u), status: 'pending' } };
  }

  if (path === '/assessment' && method === 'GET') {
    return auth((m) => {
      const mine = db.assessments.filter((a) => a.user_id === m.id).slice().reverse();
      return ok({ sections: ASSESSMENT, scale: FREQ_SCALE, history: mine, last: mine[0] ?? null });
    });
  }
  if (path === '/assessment' && method === 'POST') {
    return auth((m) => {
      const answers = body?.answers || {};
      const { scores, risk_level } = scoreAssessment(answers);
      const a = { id: nextId(), user_id: m.id, answers, scores, risk_level, created_at: now() };
      db.assessments.push(a);
      const match = activeMatch(m.id);
      if (match) {
        const t = db.therapists.find((x) => x.id === match.therapist_id);
        notify(t.user_id, 'Νέα αξιολόγηση γνωριμίας',
          `${risk_level === 'crisis' ? '⚠️ Χρειάζεται άμεση προσοχή — ' : ''}${m.display_name}: διάθεση ${scores.mood.total}/27, άγχος ${scores.anxiety.total}/21`,
          '/provider');
      }
      return { status: 201, data: { id: a.id, scores, risk_level, crisis: risk_level === 'crisis' } };
    });
  }

  if (path === '/admin/applications') {
    return auth((m) => {
      if (m.role !== 'admin') return fail(403, 'Δεν επιτρέπεται');
      const rank = { pending: 0, approved: 1, rejected: 2 };
      const rows = db.therapists.map((t) => {
        const u = db.users.find((x) => x.id === t.user_id);
        return { ...t, display_name: u.display_name, email: u.email, phone: u.phone };
      }).sort((a, b2) => rank[a.status] - rank[b2.status]);
      return ok({ applications: rows });
    });
  }
  if (seg[0] === 'admin' && seg[1] === 'applications' && method === 'POST') {
    return auth((m) => {
      if (m.role !== 'admin') return fail(403, 'Δεν επιτρέπεται');
      const t = db.therapists.find((x) => x.id === Number(seg[2]));
      if (!t) return fail(404, 'Δεν βρέθηκε');
      if (!['approved', 'rejected'].includes(body?.decision)) return fail(400, 'Άγνωστη απόφαση');
      t.status = body.decision; t.review_note = body.note || null; t.reviewed_at = now();
      notify(t.user_id,
        t.status === 'approved' ? 'Η αίτησή σου εγκρίθηκε' : 'Η αίτησή σου δεν εγκρίθηκε',
        t.status === 'approved' ? 'Το προφίλ σου είναι πλέον ενεργό και μπορείς να δέχεσαι μέλη.'
          : (body.note || 'Επικοινώνησε μαζί μας για διευκρινίσεις.'), '/provider');
      return ok({ therapist: t });
    });
  }

  /* catalog + matching */
  if (path === '/questionnaire') return ok({ questions: questionnaireWithOptions(), specialties: SPECIALTIES, approaches: APPROACHES, plans: PLANS });
  if (path === '/plans') return ok({ plans: PLANS });

  if (path === '/intake' && method === 'POST') {
    const answers = body.answers || {};
    const token = `anon-${nextId()}`;
    const risk = riskFromAnswers(answers);
    db.intakes.push({ id: nextId(), user_id: me?.id ?? null, anon_token: token,
      service: answers.service || 'individual', answers, risk_level: risk, created_at: now() });
    return ok({ intake_token: token, risk_level: risk, crisis: risk === 'crisis',
      matches: scoreTherapists(therapistRows(), answers, 5).map(publicTherapist) });
  }
  if (path === '/match' && method === 'POST') {
    return auth((m) => {
      const intake = [...db.intakes].reverse().find((i) => i.user_id === m.id);
      const answers = intake?.answers || {};
      const ranked = scoreTherapists(therapistRows(), answers, 50);
      let chosen;
      if (body.therapist_id) chosen = ranked.find((r) => r.id === body.therapist_id) || { id: body.therapist_id, score: 0, reason: 'επιλογή χρήστη' };
      else chosen = ranked.find((r) => r.id !== activeMatch(m.id)?.therapist_id);
      if (!chosen) return fail(409, 'Δεν υπάρχει διαθέσιμος θεραπευτής αυτή τη στιγμή');
      return ok(assignTherapist(m.id, chosen.id, chosen.score, body.reason || chosen.reason));
    });
  }

  if (path === '/therapists') {
    let rows = db.therapists.filter((t) => t.status === 'approved');
    if (query.specialty) rows = rows.filter((t) => csv(t.specialties).includes(query.specialty));
    if (query.language) rows = rows.filter((t) => csv(t.languages).includes(query.language));
    if (query.gender) rows = rows.filter((t) => t.gender === query.gender);
    if (query.q) {
      const needle = query.q.toLowerCase();
      rows = rows.filter((t) => `${t.display_name} ${t.headline} ${t.bio}`.toLowerCase().includes(needle));
    }
    return ok({ therapists: rows.map(publicTherapist) });
  }
  if (seg[0] === 'therapists' && seg[2] === 'slots') {
    return ok({ slots: db.availability
      .filter((s) => s.therapist_id === Number(seg[1]) && !s.booked && new Date(s.starts_at) > new Date())
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 60) });
  }
  if (seg[0] === 'therapists' && seg[2] === 'reviews' && method === 'POST') {
    return auth((m) => {
      const t = db.therapists.find((x) => x.id === Number(seg[1]));
      db.reviews.push({ id: nextId(), therapist_id: t.id, client_id: m.id, rating: Number(body.rating),
        body: body.body || '', author_label: m.nickname || 'Ανώνυμο μέλος', created_at: now() });
      const mine = db.reviews.filter((r) => r.therapist_id === t.id);
      t.rating = Math.round((mine.reduce((a, r) => a + r.rating, 0) / mine.length) * 10) / 10;
      t.reviews_count = mine.length;
      return { status: 201, data: { ok: true, rating: t.rating, reviews_count: t.reviews_count } };
    });
  }
  if (seg[0] === 'therapists' && seg.length === 2) {
    const t = db.therapists.find((x) => x.id === Number(seg[1]) && x.status === 'approved');
    if (!t) return fail(404, 'Δεν βρέθηκε');
    return ok({ therapist: publicTherapist(t),
      reviews: db.reviews.filter((r) => r.therapist_id === t.id).slice(-20).reverse() });
  }

  /* rooms + messages */
  if (path === '/rooms') {
    return auth((m) => {
      const rows = db.rooms.map((r) => {
        const match = db.matches.find((x) => x.id === r.match_id);
        const t = db.therapists.find((x) => x.id === match.therapist_id);
        const msgs = db.messages.filter((x) => x.room_id === r.id);
        const last = msgs[msgs.length - 1];
        const mine = m.role === 'therapist' ? t.user_id === m.id : match.client_id === m.id;
        if (!mine) return null;
        return { room_id: r.id, match_id: match.id, status: match.status,
          title: m.role === 'therapist' ? db.users.find((u) => u.id === match.client_id).display_name : t.display_name,
          photo: t.photo, last_message: last?.body ?? null, last_at: last?.created_at ?? null,
          unread: msgs.filter((x) => !x.read_at && x.sender_id !== m.id).length };
      }).filter(Boolean);
      return ok({ rooms: rows });
    });
  }
  if (seg[0] === 'rooms' && seg[2] === 'messages') {
    return auth((m) => {
      const room = db.rooms.find((r) => r.id === Number(seg[1]));
      if (!room) return fail(404, 'Το δωμάτιο δεν βρέθηκε');
      const match = db.matches.find((x) => x.id === room.match_id);
      const t = db.therapists.find((x) => x.id === match.therapist_id);
      if (match.client_id !== m.id && t.user_id !== m.id) return fail(404, 'Το δωμάτιο δεν βρέθηκε');
      const client = db.users.find((u) => u.id === match.client_id);
      const tUser = db.users.find((u) => u.id === t.user_id);
      const meta = { room_id: room.id, match_id: match.id, client_id: match.client_id, status: match.status,
        therapist_id: t.id, therapist_user_id: t.user_id, client_name: client.display_name,
        client_nickname: client.nickname, therapist_name: tUser.display_name,
        therapist_photo: t.photo, credentials: t.credentials };

      if (method === 'POST') {
        if (match.status !== 'active') return fail(409, 'Το δωμάτιο είναι κλειστό');
        const text = String(body.body || '').trim();
        if (!text) return fail(400, 'Το μήνυμα είναι κενό');
        const msg = { id: nextId(), room_id: room.id, sender_id: m.id, body: text, kind: 'text',
          read_at: null, created_at: now() };
        db.messages.push(msg);
        scheduleTherapistReply(room, m.id);
        return { status: 201, data: { message: messageWithSender(msg) } };
      }
      db.messages.filter((x) => x.room_id === room.id && x.sender_id !== m.id && !x.read_at)
        .forEach((x) => { x.read_at = now(); });
      return ok({ room: meta, messages: db.messages.filter((x) => x.room_id === room.id).map(messageWithSender) });
    });
  }

  /* sessions */
  if (path === '/sessions' && method === 'GET') {
    return auth((m) => {
      const rows = db.sessions.filter((s) => {
        const match = db.matches.find((x) => x.id === s.match_id);
        const t = db.therapists.find((x) => x.id === match.therapist_id);
        return m.role === 'therapist' ? t.user_id === m.id : match.client_id === m.id;
      }).map((s) => {
        const match = db.matches.find((x) => x.id === s.match_id);
        const t = db.therapists.find((x) => x.id === match.therapist_id);
        return { ...s, therapist_name: t.display_name,
          client_name: db.users.find((u) => u.id === match.client_id).display_name };
      }).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      return ok({ sessions: rows });
    });
  }
  if (path === '/sessions' && method === 'POST') {
    return auth((m) => {
      const match = activeMatch(m.id);
      if (!match) return fail(409, 'Δεν έχεις ενεργό θεραπευτή');
      const slot = db.availability.find((s) => s.id === body.slot_id && !s.booked);
      if (!slot) return fail(409, 'Το ραντεβού δεν είναι πια διαθέσιμο');
      if (slot.therapist_id !== match.therapist_id) return fail(403, 'Το ραντεβού ανήκει σε άλλον θεραπευτή');
      slot.booked = 1;
      const s = { id: nextId(), match_id: match.id, slot_id: slot.id, starts_at: slot.starts_at,
        duration_min: slot.duration_min, modality: body.modality || slot.modality, status: 'scheduled',
        join_code: Math.random().toString(16).slice(2, 10), notes: null, created_at: now() };
      db.sessions.push(s);
      return { status: 201, data: { session: s } };
    });
  }
  if (seg[0] === 'sessions' && method === 'PATCH') {
    return auth(() => {
      const s = db.sessions.find((x) => x.id === Number(seg[1]));
      if (!s) return fail(404, 'Η συνεδρία δεν βρέθηκε');
      if (body.status === 'cancelled' && s.slot_id) {
        const slot = db.availability.find((a) => a.id === s.slot_id);
        if (slot) slot.booked = 0;
      }
      if (body.status) s.status = body.status;
      if (body.notes !== undefined) s.notes = body.notes;
      return ok({ session: s });
    });
  }

  /* journal */
  if (path === '/journal' && method === 'GET') {
    return auth((m) => ok({ entries: db.journal.filter((j) => j.user_id === m.id).slice().reverse() }));
  }
  if (path === '/journal' && method === 'POST') {
    return auth((m) => {
      const entry = { id: nextId(), user_id: m.id, title: body.title || 'Χωρίς τίτλο', body: body.body || '',
        mood: body.mood ?? null, shared_with_therapist: body.shared_with_therapist ? 1 : 0, created_at: now() };
      db.journal.push(entry);
      return { status: 201, data: { entry } };
    });
  }
  if (seg[0] === 'journal' && method === 'DELETE') {
    return auth((m) => {
      const i = db.journal.findIndex((j) => j.id === Number(seg[1]) && j.user_id === m.id);
      if (i >= 0) db.journal.splice(i, 1);
      return ok({ ok: true });
    });
  }
  if (path === '/mood-trend') {
    return auth((m) => {
      const byDay = {};
      db.journal.filter((j) => j.user_id === m.id && j.mood != null).forEach((j) => {
        const d = j.created_at.slice(0, 10);
        (byDay[d] ||= []).push(j.mood);
      });
      return ok({ trend: Object.entries(byDay).sort()
        .map(([day, moods]) => ({ day, mood: moods.reduce((a, b) => a + b, 0) / moods.length })) });
    });
  }

  /* worksheets */
  if (path === '/worksheets') {
    return auth((m) => ok({
      library: db.worksheets,
      assignments: db.assignments.filter((a) => a.client_id === m.id).slice().reverse().map((a) => {
        const w = db.worksheets.find((x) => x.id === a.worksheet_id);
        return { ...a, title: w.title, slug: w.slug, category: w.category, description: w.description, fields: w.fields };
      }),
    }));
  }
  if (seg[0] === 'worksheets' && seg[2] === 'start') {
    return auth((m) => {
      const w = db.worksheets.find((x) => x.slug === seg[1]);
      if (!w) return fail(404, 'Δεν βρέθηκε');
      const a = { id: nextId(), worksheet_id: w.id, client_id: m.id, assigned_by: m.id,
        status: 'assigned', answers: null, assigned_at: now(), completed_at: null };
      db.assignments.push(a);
      return { status: 201, data: { assignment_id: a.id } };
    });
  }
  if (seg[0] === 'worksheet-assignments' && method === 'POST') {
    return auth((m) => {
      const a = db.assignments.find((x) => x.id === Number(seg[1]) && x.client_id === m.id);
      if (!a) return fail(404, 'Δεν βρέθηκε');
      a.answers = body.answers || {}; a.status = 'completed'; a.completed_at = now();
      return ok({ ok: true });
    });
  }

  /* groupinars */
  if (path === '/groupinars') {
    return auth((m) => ok({ groupinars: db.groupinars.map((g) => {
      const t = db.therapists.find((x) => x.id === g.host_therapist_id);
      const regs = db.registrations.filter((r) => r.groupinar_id === g.id);
      return { ...g, host_name: t?.display_name, registered: g.seeded_registrations + regs.length,
        is_registered: regs.some((r) => r.user_id === m.id) ? 1 : 0 };
    }) }));
  }
  if (seg[0] === 'groupinars' && seg[2] === 'register') {
    return auth((m) => {
      const id = Number(seg[1]);
      if (method === 'POST') {
        if (!db.registrations.some((r) => r.groupinar_id === id && r.user_id === m.id)) {
          db.registrations.push({ id: nextId(), groupinar_id: id, user_id: m.id, created_at: now() });
        }
      } else {
        const i = db.registrations.findIndex((r) => r.groupinar_id === id && r.user_id === m.id);
        if (i >= 0) db.registrations.splice(i, 1);
      }
      return ok({ ok: true });
    });
  }

  /* billing */
  if (path === '/subscription' && method === 'GET') {
    return auth((m) => ok({
      subscription: db.subscriptions.find((s) => s.user_id === m.id) || null,
      payments: db.payments.filter((p) => p.user_id === m.id).slice().reverse(),
      financial_aid: [...db.aid].reverse().find((a) => a.user_id === m.id) || null,
      plans: PLANS,
    }));
  }
  if (path === '/subscription' && method === 'POST') {
    return auth((m) => {
      const aid = [...db.aid].reverse().find((a) => a.user_id === m.id);
      const discount = aid?.discount_pct || 0;
      const price = planPrice(body.plan || 'standard', body.billing_period || 'monthly', discount);
      const days = body.billing_period === 'weekly' ? 7 : body.billing_period === 'quarterly' ? 90 : 30;
      let sub = db.subscriptions.find((s) => s.user_id === m.id);
      if (!sub) { sub = { id: nextId(), user_id: m.id, created_at: now() }; db.subscriptions.push(sub); }
      Object.assign(sub, { plan: body.plan || 'standard', billing_period: body.billing_period || 'monthly',
        price_cents: price, discount_pct: discount, status: 'active',
        renews_at: new Date(Date.now() + days * 86400000).toISOString(), cancelled_at: null });
      db.payments.push({ id: nextId(), user_id: m.id, amount_cents: price, status: 'paid', created_at: now(),
        description: `Συνδρομή ${sub.plan} (${sub.billing_period})${discount ? ` - έκπτωση ${discount}%` : ''}` });
      return ok({ subscription: sub, card_last4: String(body.card_number || '').replace(/\D/g, '').slice(-4) || null });
    });
  }
  if (seg[0] === 'subscription' && ['cancel', 'pause', 'resume'].includes(seg[1])) {
    return auth((m) => {
      const sub = db.subscriptions.find((s) => s.user_id === m.id);
      if (sub) {
        sub.status = { cancel: 'cancelled', pause: 'paused', resume: 'active' }[seg[1]];
        if (seg[1] === 'cancel') sub.cancelled_at = now();
      }
      return ok({ subscription: sub });
    });
  }
  if (path === '/financial-aid' && method === 'POST') {
    return auth((m) => {
      const perPerson = Number(body.monthly_income_cents || 0) / Math.max(1, Number(body.household_size || 1));
      const discount = perPerson < 60000 ? 40 : perPerson < 90000 ? 30 : perPerson < 130000 ? 20 : perPerson < 180000 ? 10 : 0;
      db.aid.push({ id: nextId(), user_id: m.id, monthly_income_cents: body.monthly_income_cents,
        household_size: body.household_size, employment: body.employment, status: 'approved',
        discount_pct: discount, created_at: now() });
      const sub = db.subscriptions.find((s) => s.user_id === m.id);
      if (sub) { sub.discount_pct = discount; sub.price_cents = planPrice(sub.plan, sub.billing_period, discount); }
      return ok({ discount_pct: discount, subscription: sub });
    });
  }

  /* notifications */
  if (path === '/notifications') {
    return auth((m) => ok({ notifications: db.notifications.filter((n) => n.user_id === m.id).slice().reverse() }));
  }
  if (path === '/notifications/read') {
    return auth((m) => { db.notifications.filter((n) => n.user_id === m.id).forEach((n) => { n.read_at = now(); }); return ok({ ok: true }); });
  }

  /* provider portal */
  if (path === '/provider/overview') {
    return auth((m) => {
      if (m.role !== 'therapist') return fail(403, 'Δεν επιτρέπεται');
      const t = therapistOf(m.id);
      if (t.status !== 'approved') return ok({ therapist: t, clients: [], upcoming: [] });
      const clients = db.matches.filter((x) => x.therapist_id === t.id && x.status === 'active').map((match) => {
        const c = db.users.find((u) => u.id === match.client_id);
        const room = roomOfMatch(match.id);
        const intake = [...db.intakes].reverse().find((i) => i.user_id === c.id);
        return { match_id: match.id, client_id: c.id, display_name: c.display_name, nickname: c.nickname,
          started_at: match.started_at, room_id: room.id,
          unread: db.messages.filter((x) => x.room_id === room.id && !x.read_at && x.sender_id !== m.id).length,
          risk_level: [...db.assessments].reverse().find((a) => a.user_id === c.id)?.risk_level ?? intake?.risk_level ?? null,
          has_assessment: db.assessments.some((a) => a.user_id === c.id) ? 1 : 0 };
      });
      const upcoming = db.sessions.filter((s) => {
        const match = db.matches.find((x) => x.id === s.match_id);
        return match.therapist_id === t.id && s.status === 'scheduled' && new Date(s.starts_at) > new Date();
      }).map((s) => ({ ...s, client_name: db.users.find((u) => u.id === db.matches.find((x) => x.id === s.match_id).client_id).display_name }));
      return ok({ therapist: t, clients, upcoming });
    });
  }
  if (path === '/provider/availability') {
    return auth((m) => {
      const t = therapistOf(m.id);
      if (method === 'POST') {
        const slot = { id: nextId(), therapist_id: t.id, starts_at: new Date(body.starts_at).toISOString(),
          duration_min: body.duration_min || 45, modality: body.modality || 'video', booked: 0 };
        db.availability.push(slot);
        return { status: 201, data: { slot } };
      }
      return ok({ slots: db.availability.filter((s) => s.therapist_id === t.id && new Date(s.starts_at) > new Date())
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)) });
    });
  }
  if (seg[0] === 'provider' && seg[1] === 'availability' && method === 'DELETE') {
    return auth(() => {
      const i = db.availability.findIndex((s) => s.id === Number(seg[2]) && !s.booked);
      if (i >= 0) db.availability.splice(i, 1);
      return ok({ ok: true });
    });
  }
  if (path === '/provider/profile' && method === 'PATCH') {
    return auth((m) => { Object.assign(therapistOf(m.id), body); return ok({ therapist: therapistOf(m.id) }); });
  }
  if (path === '/provider/assign-worksheet' && method === 'POST') {
    return auth((m) => {
      const w = db.worksheets.find((x) => x.slug === body.slug);
      if (!w) return fail(404, 'Το φύλλο εργασίας δεν βρέθηκε');
      db.assignments.push({ id: nextId(), worksheet_id: w.id, client_id: body.client_id, assigned_by: m.id,
        status: 'assigned', answers: null, assigned_at: now(), completed_at: null });
      notify(body.client_id, 'Νέο φύλλο εργασίας', `${m.display_name} σου ανέθεσε: ${w.title}`, '/app/worksheets');
      return { status: 201, data: { ok: true } };
    });
  }
  if (seg[0] === 'provider' && seg[1] === 'clients') {
    return auth(() => {
      const c = db.users.find((u) => u.id === Number(seg[2]));
      if (!c) return fail(404, 'Δεν βρέθηκε');
      const intake = [...db.intakes].reverse().find((i) => i.user_id === c.id) || null;
      return ok({
        client: { id: c.id, display_name: c.display_name, nickname: c.nickname, timezone: c.timezone, created_at: c.created_at },
        intake,
        journal: db.journal.filter((j) => j.user_id === c.id && j.shared_with_therapist).slice().reverse(),
        assessments: db.assessments.filter((a) => a.user_id === c.id).slice().reverse(),
        worksheets: db.assignments.filter((a) => a.client_id === c.id).slice().reverse()
          .map((a) => ({ ...a, title: db.worksheets.find((w) => w.id === a.worksheet_id).title })),
      });
    });
  }

  return fail(404, 'Not found');
}

/* ---------------- installation ---------------- */

export function installMockApi() {
  seed();
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('/api/')) return realFetch(input, init);
    const path = url.slice(url.indexOf('/api/') + 4).split('?')[0];
    const query = Object.fromEntries(new URLSearchParams(url.split('?')[1] || ''));
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body ? JSON.parse(init.body) : undefined;

    let result;
    try { result = handle(method, path, body, query); }
    catch (err) { result = { status: 500, data: { error: String(err.message || err) } }; }

    await new Promise((r) => setTimeout(r, 90)); // a touch of latency, like the real API
    return new Response(JSON.stringify(result.data), {
      status: result.status, headers: { 'Content-Type': 'application/json' },
    });
  };

  window.WebSocket = DemoSocket;
}
