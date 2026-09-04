// Seed content shared by the API seeder (server/seed.js) and the browser-only
// demo build (client/src/lib/mockApi.js). Pure data, no dependencies.

export const THERAPISTS = [
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

export const WORKSHEETS = [
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

export const REVIEW_BODIES = [
  'Ένιωσα από την πρώτη στιγμή ότι με ακούει πραγματικά. Απαντά πάντα μέσα στη μέρα.',
  'Μου έδωσε συγκεκριμένα εργαλεία, όχι γενικές συμβουλές. Έχω δει μεγάλη διαφορά σε 2 μήνες.',
  'Πολύ ζεστή προσέγγιση, χωρίς κρίση. Το συνιστώ ανεπιφύλακτα.',
  'Οι συνεδρίες με βίντεο είναι πολύ βολικές και ποτέ δεν ένιωσα βιασύνη.',
  'Με βοήθησε να καταλάβω μοτίβα που κουβαλούσα χρόνια.',
];

export const GROUPINARS = [
  { title: 'Διαχείριση άγχους στην καθημερινότητα', topic: 'anxiety', desc: 'Πρακτικές τεχνικές αναπνοής και γνωσιακής αναδόμησης.' },
  { title: 'Πώς να θέτεις όρια χωρίς ενοχές', topic: 'relationships', desc: 'Ασκήσεις διεκδικητικής επικοινωνίας.' },
  { title: 'Ύπνος: επαναφορά της ρουτίνας', topic: 'sleep', desc: 'Υγιεινή ύπνου βασισμένη στο CBT-I.' },
  { title: 'Burnout: αναγνώριση και ανάκαμψη', topic: 'stress', desc: 'Σημάδια εξουθένωσης και σχέδιο επανένταξης.' },
  { title: 'Αυτοσυμπόνια για τελειομανείς', topic: 'self_esteem', desc: 'Από την αυτοκριτική στην αυτοφροντίδα.' },
  { title: 'Πένθος: ζώντας με την απώλεια', topic: 'grief', desc: 'Ανοιχτή ομάδα υποστήριξης με συντονιστή.' },
];
