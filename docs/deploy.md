# Δημοσίευση της εφαρμογής

Η εφαρμογή είναι **μία διεργασία Node**: ο Express σερβίρει το API, το WebSocket
και το χτισμένο frontend. Η βάση και η ταυτοποίηση ζουν στο Supabase. Άρα
χρειάζεσαι δύο πράγματα: ένα Supabase project και έναν χώρο να τρέχει το Node.

## 0. Τι πρέπει να ξέρεις πριν ανοίξεις σε πραγματικό κόσμο

Το προϊόν είναι λειτουργικό, αλλά τρία κομμάτια είναι **προσομοίωση** και πρέπει
να αντικατασταθούν πριν δεχτείς πελάτες:

| Τι | Τι υπάρχει τώρα | Τι χρειάζεται |
|---|---|---|
| Πληρωμές | mock checkout, καμία χρέωση | Stripe (ή άλλος πάροχος) με webhooks για ανανεώσεις και ακυρώσεις |
| Email / SMS | ειδοποιήσεις μόνο μέσα στην εφαρμογή | Supabase Auth emails + πάροχος (Resend, Postmark) για υπενθυμίσεις |

Οι **βιντεοκλήσεις είναι πραγματικές** (WebRTC, peer-to-peer). Για δίκτυα με
αυστηρό NAT — τυπικά εταιρικά — χρειάζεται TURN server, αλλιώς ένα μικρό ποσοστό
κλήσεων δεν συνδέεται: όρισε `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`
(coturn σε δικό σου VPS, ή υπηρεσία όπως Cloudflare Calls / Twilio / Metered).

Και τα νομικά, που δεν είναι προαιρετικά για υπηρεσία ψυχικής υγείας στην ΕΕ:
όροι χρήσης, πολιτική απορρήτου, DPA με το Supabase και κάθε άλλον επεξεργαστή,
ρητή συγκατάθεση για δεδομένα υγείας, διαδικασία διαγραφής δεδομένων, έλεγχος
αδειών των θεραπευτών, ασφάλιση επαγγελματικής ευθύνης και σαφής διαδικασία για
περιστατικά κινδύνου. Το demo το δηλώνει ρητά ότι δεν είναι πραγματική υπηρεσία —
αυτή η δήλωση πρέπει να φύγει μόνο όταν όλα τα παραπάνω υπάρχουν.

## 1. Supabase

Ακολούθησε το [`docs/supabase.md`](supabase.md): project, `db:migrate`,
ρυθμίσεις Auth. Κράτα πρόχειρα:

- `DATABASE_URL` (pooler, θύρα 6543)
- `SUPABASE_URL`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## 2. Πού θα τρέχει

### Επιλογή A — Render / Railway / Fly.io (το πιο γρήγορο)

Δώσε το repo και ρύθμισε:

```
Build command:  npm ci && npm run build
Start command:  npm start
Health check:   /api/health
```

Μεταβλητές περιβάλλοντος:

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres.<ref>:<password>@...pooler.supabase.com:6543/postgres
SUPABASE_URL=https://<ref>.supabase.co
JWT_SECRET=<τυχαία συμβολοσειρά, μόνο αν δεν χρησιμοποιείς Supabase Auth>
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Οι δύο `VITE_*` πρέπει να υπάρχουν **τη στιγμή του build** — το Vite τις ψήνει
μέσα στο frontend. Αν τις προσθέσεις μετά, χρειάζεται νέο build.

### Επιλογή B — Docker (δικός σου server ή οποιοδήποτε container platform)

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=<anon key> \
  -t mindbridge .

docker run -d --name mindbridge -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL='postgresql://...' \
  -e SUPABASE_URL='https://<ref>.supabase.co' \
  mindbridge
```

Το image δεν περιέχει καθόλου SQLite: σε production η βάση είναι πάντα το
Supabase. Μπροστά του βάλε Caddy ή Nginx για TLS — **η HTTPS δεν είναι
προαιρετική**: χωρίς αυτήν δεν εγκαθίσταται η εφαρμογή στο κινητό (PWA), δεν
δουλεύει ο service worker και τα cookies δεν είναι ασφαλή.

## 3. Μετά την πρώτη εκκίνηση

1. **Migrations** (αν δεν τα έτρεξες ήδη): `DATABASE_URL=... npm run db:migrate`
2. **Λογαριασμός διαχειριστή** — δικός σου, με δικό σου κωδικό:
   ```bash
   DATABASE_URL=... npm run create:admin -- eσυ@example.com "Το Όνομά σου" '<δυνατός κωδικός>'
   ```
   Με Supabase Auth, δημιούργησε τον ίδιο χρήστη και στο Authentication → Users.
3. **Supabase → Authentication → URL Configuration**: βάλε το domain σου σε Site
   URL και Redirect URLs, αλλιώς δεν δουλεύει η επαναφορά κωδικού.
4. **Θεραπευτές**: κάθε αίτηση από το `/apply` περιμένει έγκριση στο `/admin`.
   Χωρίς εγκεκριμένο θεραπευτή, η αντιστοίχιση δεν έχει τι να προτείνει.
5. **Έλεγχος**: άνοιξε το domain, κάνε μια εγγραφή, δες ότι φτάνει το email
   επιβεβαίωσης και ότι το `/api/health` απαντά.

Τα demo δεδομένα (12 θεραπευτές, `password123`) **δεν** δημιουργούνται όταν
`NODE_ENV=production`. Αν τα θέλεις σε staging, βάλε `SEED_DEMO=1`.

## 4. Ενημερώσεις

Κάθε νέα έκδοση: `git pull && npm ci && npm run build && restart`. Τα migrations
είναι ξεχωριστά και τρέχουν μόνα τους μία φορά (`npm run db:migrate`).

## 5. Αντίγραφα ασφαλείας

Το Supabase κρατά αυτόματα backups στα πληρωμένα πλάνα — επιβεβαίωσε τη
συχνότητα και δοκίμασε **μία φορά** την επαναφορά. Για δικό σου αντίγραφο:

```bash
pg_dump "$DATABASE_URL" -Fc -f mindbridge-$(date +%F).dump
```
