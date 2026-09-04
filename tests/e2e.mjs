// End-to-end smoke test of the whole member + therapist journey.
const BASE = 'http://localhost:3000/api';
const jars = {};
let failures = 0;

async function call(who, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(jars[who] ? { Cookie: jars[who] } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) jars[who] = setCookie.split(';')[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
const get = (w, p) => call(w, 'GET', p);
const post = (w, p, b) => call(w, 'POST', p, b);
const patch = (w, p, b) => call(w, 'PATCH', p, b);

function check(name, cond, extra = '') {
  console.log(`${cond ? '✅' : '❌'} ${name}${cond ? '' : ' — ' + extra}`);
  if (!cond) failures++;
}

const email = `e2e_${Date.now()}@test.gr`;

// 1. Questionnaire + matching
const qs = await get('anon', '/questionnaire');
check('Ερωτηματολόγιο φορτώνει', qs.data.questions?.length >= 10);

const intake = await post('anon', '/intake', { answers: {
  service: 'individual', age: '25-34', gender: 'female', topics: ['trauma', 'anxiety'],
  sleep: 'poor', mood: 'often', self_harm: 'no', therapy_before: 'no',
  therapist_gender: 'any', approach: ['emdr'], language: 'el', faith: 'no',
  modality: ['video'], urgency: 'now',
}});
check('Αντιστοίχιση επιστρέφει θεραπευτές', intake.data.matches?.length > 0);
check('Πρώτη πρόταση ειδικεύεται σε τραύμα', intake.data.matches[0].specialties.includes('trauma'), JSON.stringify(intake.data.matches[0].specialties));

const crisis = await post('anon', '/intake', { answers: { self_harm: 'yes', topics: [], language: 'el' } });
check('Ανίχνευση κρίσης', crisis.data.risk_level === 'crisis' && crisis.data.crisis === true);

// 2. Registration claims the intake and auto-matches
const reg = await post('client', '/auth/register', {
  email, password: 'password123', display_name: 'E2E Χρήστης', intake_token: intake.data.intake_token,
});
check('Εγγραφή', reg.status === 201, JSON.stringify(reg.data));
check('Αυτόματη αντιστοίχιση στην εγγραφή', !!reg.data.matched, JSON.stringify(reg.data));

const dup = await post('anon2', '/auth/register', { email, password: 'password123', display_name: 'x' });
check('Απόρριψη διπλού email', dup.status === 409);

const me = await get('client', '/auth/me');
check('Το /me δίνει ενεργό match', !!me.data.match?.room_id, JSON.stringify(me.data.match));
check('Δημιουργήθηκε συνδρομή σε trial', me.data.subscription?.status === 'trialing');
const roomId = me.data.match.room_id;
const therapistId = me.data.match.id;

// 3. Messaging
const msgs = await get('client', `/rooms/${roomId}/messages`);
check('Welcome μήνυμα θεραπευτή', msgs.data.messages.length >= 1);
const sent = await post('client', `/rooms/${roomId}/messages`, { body: 'Γεια σας, θα ήθελα βοήθεια με το άγχος.' });
check('Αποστολή μηνύματος', sent.status === 201);

// Therapist logs in and sees it
const therapistEmail = `therapist${therapistId}@mindbridge.gr`;
const tlogin = await post('therapist', '/auth/login', { email: therapistEmail, password: 'password123' });
check('Σύνδεση θεραπευτή', tlogin.status === 200, JSON.stringify(tlogin.data));
const overview = await get('therapist', '/provider/overview');
const clientRow = overview.data.clients?.find((c) => c.room_id === roomId);
check('Ο πελάτης εμφανίζεται στον θεραπευτή', !!clientRow, JSON.stringify(overview.data.clients));
check('Μετρητής αδιάβαστων', clientRow?.unread >= 1, String(clientRow?.unread));
const treply = await post('therapist', `/rooms/${roomId}/messages`, { body: 'Καλώς ήρθες, πες μου περισσότερα.' });
check('Απάντηση θεραπευτή', treply.status === 201);

const outsider = await post('outsider', '/auth/login', { email: 'demo@mindbridge.gr', password: 'password123' });
const forbidden = await get('outsider', `/rooms/${roomId}/messages`);
check('Απαγόρευση πρόσβασης σε ξένο δωμάτιο', forbidden.status === 404, String(forbidden.status));

// 4. Session booking
const slots = await get('client', `/therapists/${therapistId}/slots`);
check('Διαθέσιμα slots', slots.data.slots.length > 0);
const booked = await post('client', '/sessions', { slot_id: slots.data.slots[0].id });
check('Κράτηση συνεδρίας', booked.status === 201, JSON.stringify(booked.data));
const doubleBook = await post('outsider', '/sessions', { slot_id: slots.data.slots[0].id });
check('Το ίδιο slot δεν ξανακλείνεται', doubleBook.status >= 400);
const cancelled = await patch('client', `/sessions/${booked.data.session.id}`, { status: 'cancelled' });
check('Ακύρωση συνεδρίας', cancelled.data.session.status === 'cancelled');
const slotsAfter = await get('client', `/therapists/${therapistId}/slots`);
check('Το slot ελευθερώθηκε', slotsAfter.data.slots.some((s) => s.id === slots.data.slots[0].id));

// 5. Journal + worksheets
await post('client', '/journal', { title: 'Πρώτη μέρα', body: 'Ένιωσα καλύτερα.', mood: 4, shared_with_therapist: true });
const journal = await get('client', '/journal');
check('Καταχώρηση ημερολογίου', journal.data.entries.length === 1);
const trend = await get('client', '/mood-trend');
check('Τάση διάθεσης', trend.data.trend.length === 1);

const assign = await post('therapist', '/provider/assign-worksheet', { client_id: me.data.user.id, slug: 'thought-record' });
check('Ανάθεση φύλλου εργασίας', assign.status === 201, JSON.stringify(assign.data));
const ws = await get('client', '/worksheets');
check('Φύλλο εργασίας ορατό στον πελάτη', ws.data.assignments.length >= 1);
const submitted = await post('client', `/worksheet-assignments/${ws.data.assignments[0].id}`, { answers: { situation: 'Παρουσίαση' } });
check('Υποβολή φύλλου εργασίας', submitted.status === 200);

const clientFile = await get('therapist', `/provider/clients/${me.data.user.id}`);
check('Φάκελος πελάτη με intake', !!clientFile.data.intake);
check('Κοινοποιημένο ημερολόγιο ορατό', clientFile.data.journal.length === 1);

// 6. Groupinars
const gr = await get('client', '/groupinars');
check('Λίστα groupinars', gr.data.groupinars.length > 0);
await post('client', `/groupinars/${gr.data.groupinars[0].id}/register`);
const gr2 = await get('client', '/groupinars');
check('Δήλωση σε groupinar', !!gr2.data.groupinars[0].is_registered);

// 7. Billing + financial aid
const aid = await post('client', '/financial-aid', { monthly_income_cents: 100000, household_size: 2, employment: 'student' });
check('Οικονομική ενίσχυση 40%', aid.data.discount_pct === 40, String(aid.data.discount_pct));
const checkout = await post('client', '/subscription', { plan: 'plus', billing_period: 'monthly', card_number: '4242424242424242' });
check('Ενεργοποίηση συνδρομής με έκπτωση', checkout.data.subscription.status === 'active' && checkout.data.subscription.price_cents === Math.round(33600 * 0.6), JSON.stringify(checkout.data.subscription));
check('Δεν αποθηκεύεται η κάρτα, μόνο τα 4 τελευταία', checkout.data.card_last4 === '4242');
const billing = await get('client', '/subscription');
check('Ιστορικό πληρωμών', billing.data.payments.length >= 1);
await post('client', '/subscription/cancel');
const afterCancel = await get('client', '/subscription');
check('Ακύρωση συνδρομής', afterCancel.data.subscription.status === 'cancelled');

// 8. Switch therapist
const sw = await post('client', '/match', { reason: 'Δεν ταιριάξαμε' });
check('Αλλαγή θεραπευτή', sw.status === 200 && sw.data.therapist_id !== therapistId, JSON.stringify(sw.data));
const rooms = await get('client', '/rooms');
check('Το παλιό δωμάτιο διατηρείται στο ιστορικό', rooms.data.rooms.length === 2, String(rooms.data.rooms.length));
const oldRoomPost = await post('client', `/rooms/${roomId}/messages`, { body: 'κλειστό;' });
check('Το κλειστό δωμάτιο δεν δέχεται μηνύματα', oldRoomPost.status === 409, String(oldRoomPost.status));

// 9. Reviews + notifications + account
const rev = await post('client', `/therapists/${therapistId}/reviews`, { rating: 5, body: 'Πολύ βοηθητική.' });
check('Καταχώρηση κριτικής', rev.status === 201);
const notif = await get('client', '/notifications');
check('Ειδοποιήσεις', notif.data.notifications.length >= 1);
const upd = await patch('client', '/auth/me', { nickname: 'Ε.' });
check('Ενημέρωση προφίλ', upd.data.user.nickname === 'Ε.');
const badPw = await post('client', '/auth/password', { current: 'wrong', next: 'newpassword123' });
check('Απόρριψη λάθος τρέχοντος κωδικού', badPw.status === 400);
const okPw = await post('client', '/auth/password', { current: 'password123', next: 'newpassword123' });
check('Αλλαγή κωδικού', okPw.status === 200);
const relogin = await post('client2', '/auth/login', { email, password: 'newpassword123' });
check('Σύνδεση με νέο κωδικό', relogin.status === 200);

// 10. Provider profile + availability
const prof = await patch('therapist', '/provider/profile', { headline: 'Νέος τίτλος', avg_response_hours: 5 });
check('Ενημέρωση προφίλ θεραπευτή', prof.data.therapist.headline === 'Νέος τίτλος');
const newSlot = await post('therapist', '/provider/availability', { starts_at: new Date(Date.now() + 3 * 86400000).toISOString(), modality: 'phone' });
check('Προσθήκη διαθεσιμότητας', newSlot.status === 201);

// 11. Auth guards
const anon = await get('anonX', '/journal');
check('Προστασία endpoint χωρίς σύνδεση', anon.status === 401);
const clientOnProvider = await get('client', '/provider/overview');
check('Πελάτης δεν βλέπει provider API', clientOnProvider.status === 403, String(clientOnProvider.status));

console.log(failures ? `\n${failures} έλεγχοι απέτυχαν` : '\nΌλοι οι έλεγχοι πέρασαν');
process.exit(failures ? 1 : 0);
