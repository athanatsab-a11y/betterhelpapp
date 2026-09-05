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

// Κάθε προσέγγιση συνοδεύεται από μια περιγραφή σε καθημερινή γλώσσα: ο κόσμος
// που ψάχνει θεραπεία δεν ξέρει τι σημαίνει «ACT» ή «ψυχοδυναμική».
export const APPROACHES = [
  {
    key: 'cbt', label: 'Γνωσιακή-Συμπεριφορική (CBT)',
    hint: 'Δουλεύετε πάνω σε σκέψεις και συνήθειες που σε δυσκολεύουν, με πρακτικές ασκήσεις και στόχους. Συνήθως φαίνονται αποτελέσματα σχετικά γρήγορα.',
  },
  {
    key: 'psychodynamic', label: 'Ψυχοδυναμική',
    hint: 'Ψάχνετε από πού προέρχονται όσα σε ταλαιπωρούν — παιδικά χρόνια, σχέσεις, μοτίβα που επαναλαμβάνονται. Πιο βαθιά και πιο αργή δουλειά.',
  },
  {
    key: 'humanistic', label: 'Ανθρωπιστική (προσωποκεντρική)',
    hint: 'Ζεστή συζήτηση χωρίς κριτική, με έμφαση στο πώς νιώθεις εσύ και στο τι θέλεις. Ο θεραπευτής ακούει περισσότερο απ’ ό,τι καθοδηγεί.',
  },
  {
    key: 'act', label: 'Αποδοχής & Δέσμευσης (ACT)',
    hint: 'Μαθαίνεις να μη δίνεις μάχη με τις δύσκολες σκέψεις και τα συναισθήματα, και να κάνεις πράγματα που έχουν αξία για σένα παρόλα αυτά.',
  },
  {
    key: 'emdr', label: 'EMDR (επεξεργασία τραύματος)',
    hint: 'Ειδική τεχνική για δύσκολες ή τραυματικές μνήμες: τις ξαναφέρνεις με καθοδήγηση, ώστε να πάψουν να σε επηρεάζουν το ίδιο έντονα.',
  },
  {
    key: 'solution', label: 'Εστιασμένη στη λύση',
    hint: 'Λίγες συνεδρίες, με το βλέμμα μπροστά: τι θες να πετύχεις και τι ήδη σου δουλεύει, αντί για ανάλυση του παρελθόντος.',
  },
  {
    key: 'systemic', label: 'Συστημική / Οικογενειακή',
    hint: 'Βλέπει το θέμα μέσα στις σχέσεις σου — οικογένεια, ζευγάρι, δουλειά — και όχι σαν κάτι που συμβαίνει μόνο μέσα σου.',
  },
  {
    key: 'mindfulness', label: 'Mindfulness (ενσυνειδητότητα)',
    hint: 'Ασκήσεις αναπνοής και προσοχής που ηρεμούν το σώμα και σε βοηθούν να μένεις στο τώρα αντί να σε παρασέρνουν οι σκέψεις.',
  },
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
    subtitle: 'Δεν χρειάζεται να ξέρεις όρους — διάβασε τι κάνει η καθεμία και διάλεξε ό,τι σου ταιριάζει.',
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
      return {
        ...q,
        options: [
          ...APPROACHES.map((s) => ({ value: s.key, label: s.label, hint: s.hint })),
          {
            value: 'unsure',
            label: 'Δεν ξέρω — προτείνετέ μου εσείς',
            hint: 'Απόλυτα φυσιολογικό. Θα σου προτείνουμε θεραπευτές με βάση τα υπόλοιπα που μας είπες.',
            exclusive: true,
          },
        ],
      };
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

/* ---------------- Κλινική γνωριμία (screening, όχι διάγνωση) ---------------- */

export const FREQ_SCALE = [
  { value: 0, label: 'Καθόλου' },
  { value: 1, label: 'Μερικές μέρες' },
  { value: 2, label: 'Πάνω από τις μισές μέρες' },
  { value: 3, label: 'Σχεδόν κάθε μέρα' },
];

// Πόσο συχνά σε ενόχλησαν τα παρακάτω τις τελευταίες 2 εβδομάδες;
export const ASSESSMENT = [
  {
    id: 'mood',
    title: 'Διάθεση',
    intro: 'Τις τελευταίες 2 εβδομάδες, πόσο συχνά σε ενόχλησαν τα παρακάτω;',
    scale: 'freq',
    max: 27,
    items: [
      { key: 'interest', label: 'Λίγο ενδιαφέρον ή ευχαρίστηση από πράγματα που συνήθως σου αρέσουν' },
      { key: 'down', label: 'Πεσμένη διάθεση, μελαγχολία ή αίσθημα απελπισίας' },
      { key: 'sleep', label: 'Δυσκολία στον ύπνο ή υπερβολικός ύπνος' },
      { key: 'energy', label: 'Κόπωση ή έλλειψη ενέργειας' },
      { key: 'appetite', label: 'Αλλαγές στην όρεξη — έφαγες πολύ λιγότερο ή πολύ περισσότερο' },
      { key: 'self_worth', label: 'Αίσθημα αποτυχίας ή ότι απογοήτευσες τον εαυτό σου και τους δικούς σου' },
      { key: 'concentration', label: 'Δυσκολία συγκέντρωσης σε πράγματα όπως δουλειά, διάβασμα ή τηλεόραση' },
      { key: 'psychomotor', label: 'Κινήσεις ή ομιλία πολύ πιο αργές — ή, αντίθετα, έντονη ανησυχία' },
      { key: 'self_harm', label: 'Σκέψεις ότι θα ήταν καλύτερα να μην υπάρχεις ή ότι θα έβλαπτες τον εαυτό σου', critical: true },
    ],
    bands: [
      { upTo: 4, label: 'Ελάχιστα συμπτώματα' },
      { upTo: 9, label: 'Ήπια συμπτώματα' },
      { upTo: 14, label: 'Μέτρια συμπτώματα' },
      { upTo: 19, label: 'Μέτρια προς σοβαρά συμπτώματα' },
      { upTo: 27, label: 'Σοβαρά συμπτώματα' },
    ],
  },
  {
    id: 'anxiety',
    title: 'Άγχος',
    intro: 'Τις τελευταίες 2 εβδομάδες, πόσο συχνά σε ενόχλησαν τα παρακάτω;',
    scale: 'freq',
    max: 21,
    items: [
      { key: 'nervous', label: 'Νευρικότητα, ένταση ή αίσθημα ότι είσαι στην τσίτα' },
      { key: 'worry_control', label: 'Αδυναμία να σταματήσεις ή να ελέγξεις την ανησυχία' },
      { key: 'worry_much', label: 'Υπερβολική ανησυχία για διάφορα πράγματα' },
      { key: 'relax', label: 'Δυσκολία να χαλαρώσεις' },
      { key: 'restless', label: 'Τόση ανησυχία που δυσκολεύεσαι να καθίσεις ήσυχα' },
      { key: 'irritable', label: 'Ευερεθιστότητα ή εκνευρισμός με το παραμικρό' },
      { key: 'fear', label: 'Φόβος ότι κάτι κακό πρόκειται να συμβεί' },
    ],
    bands: [
      { upTo: 4, label: 'Ελάχιστο άγχος' },
      { upTo: 9, label: 'Ήπιο άγχος' },
      { upTo: 14, label: 'Μέτριο άγχος' },
      { upTo: 21, label: 'Σοβαρό άγχος' },
    ],
  },
  {
    id: 'context',
    title: 'Ιστορικό & πλαίσιο',
    intro: 'Λίγα πράγματα που βοηθούν τον θεραπευτή σου να σε γνωρίσει.',
    scale: 'choice',
    items: [
      {
        key: 'therapy_history', label: 'Έχεις κάνει ξανά ψυχοθεραπεία;',
        options: ['Ποτέ', 'Ναι, στο παρελθόν', 'Ναι, αυτή τη στιγμή'],
      },
      {
        key: 'medication', label: 'Παίρνεις φαρμακευτική αγωγή για την ψυχική σου υγεία;',
        options: ['Όχι', 'Ναι', 'Το σκέφτομαι'],
      },
      {
        key: 'physical_health', label: 'Υπάρχει σωματικό πρόβλημα υγείας που επηρεάζει την καθημερινότητά σου;',
        options: ['Όχι', 'Ναι, ήπιο', 'Ναι, σημαντικό'],
      },
      {
        key: 'substances', label: 'Πόσο συχνά χρησιμοποιείς αλκοόλ ή άλλες ουσίες για να διαχειριστείς τα συναισθήματά σου;',
        options: ['Ποτέ', 'Σπάνια', 'Εβδομαδιαία', 'Καθημερινά'],
      },
      {
        key: 'support', label: 'Πόσο υποστηρικτικό είναι το περιβάλλον σου (οικογένεια, φίλοι);',
        options: ['Καθόλου', 'Λίγο', 'Αρκετά', 'Πολύ'],
      },
      {
        key: 'impact', label: 'Πόσο δύσκολα σε κάνουν αυτά να λειτουργήσεις στην καθημερινότητα;',
        options: ['Καθόλου δύσκολα', 'Λίγο δύσκολα', 'Πολύ δύσκολα', 'Εξαιρετικά δύσκολα'],
      },
    ],
  },
  {
    id: 'goals',
    title: 'Στόχοι',
    intro: 'Με δικά σου λόγια — αυτά τα διαβάζει ο θεραπευτής σου πριν την πρώτη επαφή.',
    scale: 'text',
    items: [
      { key: 'reason', label: 'Τι σε έφερε εδώ τώρα;', type: 'textarea' },
      { key: 'change', label: 'Τι θα ήθελες να είναι διαφορετικό σε 3 μήνες;', type: 'textarea' },
      { key: 'tried', label: 'Τι έχεις ήδη δοκιμάσει και τι βοήθησε (ή δεν βοήθησε);', type: 'textarea' },
      { key: 'strengths', label: 'Τι σε βοηθάει να αντέχεις στις δύσκολες μέρες;', type: 'text' },
    ],
  },
];

export function scoreAssessment(answers = {}) {
  const scores = {};
  for (const section of ASSESSMENT) {
    if (section.scale !== 'freq') continue;
    const total = section.items.reduce((sum, item) => sum + (Number(answers[item.key]) || 0), 0);
    const band = section.bands.find((b) => total <= b.upTo) || section.bands.at(-1);
    scores[section.id] = { total, max: section.max, label: band.label };
  }
  const selfHarm = Number(answers.self_harm) || 0;
  const risk = selfHarm >= 2 ? 'crisis'
    : selfHarm === 1 || (scores.mood?.total ?? 0) >= 15 || (scores.anxiety?.total ?? 0) >= 15 ? 'elevated'
    : 'low';
  return { scores, risk_level: risk };
}

/* ---------------- Αίτηση θεραπευτή ---------------- */

export const THERAPIST_APPLICATION_LANGUAGES = [
  { key: 'el', label: 'Ελληνικά' },
  { key: 'en', label: 'Αγγλικά' },
  { key: 'de', label: 'Γερμανικά' },
];
