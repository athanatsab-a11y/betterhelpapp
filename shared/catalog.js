// Shared catalogs: questionnaire, specialties, plans.

export const SPECIALTIES = [
  { key: 'anxiety', label: 'Άγχος' },
  { key: 'depression', label: 'Κατάθλιψη' },
  { key: 'stress', label: 'Στρες / Burnout' },
  { key: 'relationships', label: 'Σχέσεις' },
  { key: 'trauma', label: 'Τραύμα & PTSD' },
  { key: 'grief', label: 'Πένθος' },
  { key: 'self_esteem', label: 'Αυτοεκτίμηση' },
  { key: 'addiction', label: 'Εξαρτήσεις' },
  { key: 'eating', label: 'Διατροφικές διαταραχές' },
  { key: 'lgbtq', label: 'ΛΟΑΤΚΙ+ θέματα' },
  { key: 'parenting', label: 'Γονεϊκότητα' },
  { key: 'sleep', label: 'Ύπνος' },
  { key: 'anger', label: 'Διαχείριση θυμού' },
  { key: 'career', label: 'Καριέρα' },
  { key: 'adhd', label: 'ΔΕΠΥ' },
];

export const APPROACHES = [
  { key: 'cbt', label: 'Γνωσιακή-Συμπεριφορική (CBT)' },
  { key: 'psychodynamic', label: 'Ψυχοδυναμική' },
  { key: 'humanistic', label: 'Ανθρωπιστική' },
  { key: 'act', label: 'ACT' },
  { key: 'emdr', label: 'EMDR' },
  { key: 'solution', label: 'Εστιασμένη στη λύση' },
  { key: 'systemic', label: 'Συστημική / Οικογενειακή' },
  { key: 'mindfulness', label: 'Mindfulness' },
];

export const PLANS = [
  {
    key: 'standard',
    name: 'Standard',
    monthly_cents: 25600,
    tagline: 'Απεριόριστα μηνύματα + 1 live συνεδρία/εβδομάδα',
    features: [
      'Απεριόριστη ανταλλαγή μηνυμάτων με τον θεραπευτή',
      '1 live συνεδρία 45’ την εβδομάδα (video, τηλέφωνο ή chat)',
      'Ημερολόγιο & φύλλα εργασίας',
      'Αλλαγή θεραπευτή οποτεδήποτε, χωρίς χρέωση',
    ],
  },
  {
    key: 'plus',
    name: 'Plus',
    monthly_cents: 33600,
    tagline: 'Ό,τι και το Standard + 2 συνεδρίες/εβδομάδα',
    features: [
      'Όλα του Standard',
      '2 live συνεδρίες 45’ την εβδομάδα',
      'Προτεραιότητα στις απαντήσεις (έως 6 ώρες)',
      'Απεριόριστα groupinars',
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    monthly_cents: 41600,
    tagline: 'Εντατική υποστήριξη με 3 συνεδρίες/εβδομάδα',
    features: [
      'Όλα του Plus',
      '3 live συνεδρίες 45’ την εβδομάδα',
      'Εβδομαδιαία ανασκόπηση προόδου',
      'Σχέδιο θεραπείας με στόχους',
    ],
  },
];

export const PERIOD_MULTIPLIER = { weekly: 0.25, monthly: 1, quarterly: 2.7 };

export const QUESTIONNAIRE = [
  {
    id: 'service',
    title: 'Για ποιον ψάχνεις θεραπεία;',
    type: 'single',
    options: [
      { value: 'individual', label: 'Για μένα (ατομική)' },
      { value: 'couples', label: 'Για εμένα και τον/την σύντροφό μου' },
      { value: 'teen', label: 'Για τον έφηβο/η μου (13-17)' },
    ],
  },
  {
    id: 'age',
    title: 'Ποια είναι η ηλικία σου;',
    type: 'single',
    options: [
      { value: '13-17', label: '13-17' },
      { value: '18-24', label: '18-24' },
      { value: '25-34', label: '25-34' },
      { value: '35-44', label: '35-44' },
      { value: '45-54', label: '45-54' },
      { value: '55+', label: '55+' },
    ],
  },
  {
    id: 'gender',
    title: 'Πώς αυτοπροσδιορίζεσαι;',
    type: 'single',
    options: [
      { value: 'female', label: 'Γυναίκα' },
      { value: 'male', label: 'Άνδρας' },
      { value: 'nonbinary', label: 'Μη δυαδικό άτομο' },
      { value: 'other', label: 'Προτιμώ να μην απαντήσω' },
    ],
  },
  {
    id: 'topics',
    title: 'Τι σε φέρνει εδώ; (διάλεξε όσα ισχύουν)',
    type: 'multi',
    optionsFrom: 'specialties',
  },
  {
    id: 'sleep',
    title: 'Πώς είναι ο ύπνος σου τον τελευταίο μήνα;',
    type: 'single',
    options: [
      { value: 'good', label: 'Καλός' },
      { value: 'ok', label: 'Μέτριος' },
      { value: 'poor', label: 'Κακός' },
      { value: 'very_poor', label: 'Πολύ κακός' },
    ],
  },
  {
    id: 'mood',
    title: 'Πόσο συχνά νιώθεις πεσμένος/η ή χωρίς ελπίδα;',
    type: 'single',
    options: [
      { value: 'never', label: 'Ποτέ' },
      { value: 'sometimes', label: 'Μερικές φορές' },
      { value: 'often', label: 'Συχνά' },
      { value: 'always', label: 'Σχεδόν πάντα' },
    ],
  },
  {
    id: 'self_harm',
    title: 'Έχεις σκέψεις αυτοτραυματισμού;',
    type: 'single',
    critical: true,
    options: [
      { value: 'no', label: 'Όχι' },
      { value: 'past', label: 'Στο παρελθόν' },
      { value: 'yes', label: 'Ναι, πρόσφατα' },
    ],
  },
  {
    id: 'therapy_before',
    title: 'Έχεις κάνει ξανά ψυχοθεραπεία;',
    type: 'single',
    options: [
      { value: 'yes', label: 'Ναι' },
      { value: 'no', label: 'Όχι, είναι η πρώτη φορά' },
    ],
  },
  {
    id: 'therapist_gender',
    title: 'Προτιμάς συγκεκριμένο φύλο θεραπευτή;',
    type: 'single',
    options: [
      { value: 'any', label: 'Δεν έχω προτίμηση' },
      { value: 'female', label: 'Γυναίκα' },
      { value: 'male', label: 'Άνδρας' },
      { value: 'nonbinary', label: 'Μη δυαδικό άτομο' },
    ],
  },
  {
    id: 'approach',
    title: 'Τι στυλ θεραπείας σε εκφράζει;',
    type: 'multi',
    optionsFrom: 'approaches',
  },
  {
    id: 'language',
    title: 'Σε ποια γλώσσα θέλεις τις συνεδρίες;',
    type: 'single',
    options: [
      { value: 'el', label: 'Ελληνικά' },
      { value: 'en', label: 'Αγγλικά' },
      { value: 'de', label: 'Γερμανικά' },
    ],
  },
  {
    id: 'faith',
    title: 'Θέλεις θεραπεία με πνευματική/θρησκευτική διάσταση;',
    type: 'single',
    options: [
      { value: 'no', label: 'Όχι' },
      { value: 'yes', label: 'Ναι' },
    ],
  },
  {
    id: 'modality',
    title: 'Πώς προτιμάς να επικοινωνείς;',
    type: 'multi',
    options: [
      { value: 'messaging', label: 'Γραπτά μηνύματα' },
      { value: 'live_chat', label: 'Live chat' },
      { value: 'phone', label: 'Τηλέφωνο' },
      { value: 'video', label: 'Βιντεοκλήση' },
    ],
  },
  {
    id: 'urgency',
    title: 'Πόσο άμεσα θέλεις να ξεκινήσεις;',
    type: 'single',
    options: [
      { value: 'now', label: 'Άμεσα' },
      { value: 'week', label: 'Μέσα στην εβδομάδα' },
      { value: 'exploring', label: 'Απλώς εξερευνώ' },
    ],
  },
];

export function questionnaireWithOptions() {
  return QUESTIONNAIRE.map((q) => {
    if (q.optionsFrom === 'specialties') {
      return { ...q, options: SPECIALTIES.map((s) => ({ value: s.key, label: s.label })) };
    }
    if (q.optionsFrom === 'approaches') {
      return { ...q, options: APPROACHES.map((s) => ({ value: s.key, label: s.label })) };
    }
    return q;
  });
}

export function riskFromAnswers(a = {}) {
  if (a.self_harm === 'yes') return 'crisis';
  if (a.self_harm === 'past' || a.mood === 'always') return 'elevated';
  return 'low';
}

export function planPrice(planKey, period = 'monthly', discountPct = 0) {
  const plan = PLANS.find((p) => p.key === planKey) || PLANS[0];
  const base = Math.round(plan.monthly_cents * (PERIOD_MULTIPLIER[period] ?? 1));
  return Math.round(base * (1 - (discountPct || 0) / 100));
}
