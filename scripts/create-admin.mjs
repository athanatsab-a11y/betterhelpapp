// Δημιουργεί (ή αναβαθμίζει) έναν λογαριασμό διαχειριστή στην τρέχουσα βάση.
//   npm run create:admin -- admin@example.com "Όνομα Επώνυμο" [κωδικός]
// Με Supabase Auth ο κωδικός ορίζεται στο Supabase· εδώ αρκεί το email και το
// auth id, που συνδέεται αυτόματα με την πρώτη σύνδεση.
import { sql, initDb } from '../server/db/index.js';
import { hashPassword, supabaseAuthEnabled } from '../server/auth.js';

const [email, name, password] = process.argv.slice(2);
if (!email || !name) {
  console.error('Χρήση: npm run create:admin -- <email> "<όνομα>" [κωδικός]');
  process.exit(1);
}

await initDb();
const existing = await sql.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);

if (existing) {
  await sql.run("UPDATE users SET role = 'admin' WHERE id = ?", [existing.id]);
  console.log(`Ο λογαριασμός ${email} έγινε διαχειριστής.`);
} else {
  if (!supabaseAuthEnabled && !password) {
    console.error('Χωρίς Supabase Auth χρειάζεται και κωδικός: npm run create:admin -- <email> "<όνομα>" <κωδικός>');
    process.exit(1);
  }
  await sql.run(
    "INSERT INTO users (email, password_hash, role, display_name, nickname) VALUES (?,?,'admin',?,?)",
    [email.toLowerCase(), password ? hashPassword(password) : null, name, name.split(' ')[0]]
  );
  console.log(`Δημιουργήθηκε διαχειριστής: ${email}`);
  if (supabaseAuthEnabled) {
    console.log('Δημιούργησε τον ίδιο χρήστη και στο Supabase Auth (Authentication → Users) με το ίδιο email.');
  }
}

await sql.close();
