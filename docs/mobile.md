# Εφαρμογή για κινητό (Capacitor)

Η ίδια εφαρμογή, μέσα σε native κέλυφος για **iOS και Android**. Δεν
ξαναγράφεται τίποτα: το `capacitor.config.json` δείχνει στο `client/dist`, και
το κέλυφος φορτώνει τα αρχεία τοπικά από τη συσκευή.

## Τι αλλάζει σε σχέση με το web

| | Web | Native |
|---|---|---|
| Πού ζουν τα αρχεία | στον server σου | μέσα στην εφαρμογή, στη συσκευή |
| Κλήσεις API | σχετικές (`/api/...`) | απόλυτες, στο `VITE_API_URL` |
| Ταυτοποίηση | httpOnly cookie | Bearer token (ή Supabase session) |
| Πρώτη οθόνη | ό,τι ζητήσει ο χρήστης | πάντα η εφαρμογή, όχι το δημόσιο site |

Γι' αυτό το build για κινητό **χρειάζεται** `VITE_API_URL`. Χωρίς αυτό η
εφαρμογή θα ψάχνει το API μέσα στη συσκευή και δεν θα βρει τίποτα.

## Στήσιμο

Στο `client/.env`:

```
VITE_API_URL=https://api.todomain.sou
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Στον server, δήλωσε ποια origins επιτρέπονται (τα origins του κελύφους
επιτρέπονται πάντα):

```
ALLOWED_ORIGINS=https://todomain.sou
```

## Δοκιμή πριν από τη δημοσίευση του server

Αν ο server τρέχει ακόμη τοπικά, το κινητό πρέπει να τον βρει στο δίκτυο:

| Πού δοκιμάζεις | `VITE_API_URL` |
|---|---|
| Android emulator | `http://10.0.2.2:3000` (έτσι βλέπει τον υπολογιστή σου) |
| iOS simulator | `http://localhost:3000` |
| Πραγματική συσκευή στο ίδιο Wi-Fi | `http://192.168.x.x:3000` (η IP του υπολογιστή σου) |

Το HTTP προς αυτές τις τοπικές διευθύνσεις είναι ήδη επιτρεπτό: στο Android με
`network_security_config.xml` και στο iOS με `NSAllowsLocalNetworking`. Προς τα
έξω, και στις δύο πλατφόρμες, επιτρέπεται μόνο HTTPS.

## Χτίσιμο και άνοιγμα

```bash
npm run mobile:sync       # build + αντιγραφή στα native projects
npm run mobile:android    # ανοίγει το Android Studio
npm run mobile:ios        # ανοίγει το Xcode (χρειάζεται Mac)
```

Από εκεί και πέρα δουλεύεις μέσα από Android Studio / Xcode: υπογραφή,
εικονίδια, υποβολή. Εναλλακτικά, cloud builds χωρίς Mac με το
[Ionic Appflow](https://ionic.io/appflow) ή GitHub Actions με macOS runner.

## Άδειες συσκευής

Είναι ήδη δηλωμένες, γιατί χωρίς αυτές δεν ξεκινούν οι βιντεοκλήσεις:

- **Android** (`AndroidManifest.xml`): `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`
- **iOS** (`Info.plist`): `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`
  με κείμενα στα ελληνικά — η Apple απορρίπτει εφαρμογές που ζητούν άδεια χωρίς
  εξήγηση.

Οι κλήσεις WebRTC δουλεύουν αυτούσιες: το `getUserMedia` υποστηρίζεται στο
WKWebView του iOS από την 14.3 και στο Android WebView.

## Πριν την υποβολή στα stores

1. **Εικονίδια και splash**: `npx @capacitor/assets generate` από ένα PNG 1024×1024.
2. **Κανόνας 4.2 της Apple**: η εφαρμογή δεν πρέπει να είναι σκέτο περιτύλιγμα
   ιστοσελίδας. Η δική μας δεν είναι — φορτώνει τοπικά αρχεία, χρησιμοποιεί
   κάμερα και μικρόφωνο, δουλεύει και χωρίς δίκτυο στο κέλυφός της. Μην αλλάξεις
   τη ρύθμιση ώστε να φορτώνει απομακρυσμένο URL: εκεί ακριβώς έρχονται οι
   απορρίψεις.
3. **Ειδοποιήσεις push**: επόμενο βήμα, χρειάζεται Firebase project (Android) και
   κλειδί APNs (iOS) — δες παρακάτω.
4. **Πολιτική απορρήτου**: υποχρεωτικός σύνδεσμος και στα δύο stores, και
   δήλωση δεδομένων υγείας στο App Privacy της Apple.

## Επόμενο βήμα: push notifications

```bash
npm i @capacitor/push-notifications --prefix client
```

Χρειάζονται: Firebase project με `google-services.json` (Android), κλειδί APNs
από τον Apple Developer λογαριασμό (iOS), ένας πίνακας με τα device tokens και
ένα endpoint που στέλνει την ειδοποίηση όταν φτάνει μήνυμα ή πλησιάζει συνεδρία.
Χωρίς τους λογαριασμούς σου δεν μπορεί να δοκιμαστεί, γι' αυτό δεν μπήκε ακόμη.
