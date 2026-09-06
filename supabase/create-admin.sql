-- Δημιουργία λογαριασμού διαχειριστή χωρίς κανένα εργαλείο στον υπολογιστή σου.
--
-- ΒΗΜΑ 1 — Στο Supabase: Authentication → Users → Add user
--          Βάλε το email σου και έναν δυνατό κωδικό, και τσέκαρε
--          «Auto Confirm User» ώστε να μη χρειαστεί επιβεβαίωση.
--
-- ΒΗΜΑ 2 — SQL Editor: άλλαξε τα δύο στοιχεία παρακάτω και τρέξε το.
--          Συνδέει τον λογαριασμό του Supabase με προφίλ διαχειριστή.

insert into users (email, auth_id, role, display_name, nickname)
select
  u.email,
  u.id,
  'admin',
  'Το Όνομά σου',          -- <<< άλλαξέ το
  'Όνομα'                   -- <<< και αυτό
from auth.users u
where u.email = 'esy@example.com'   -- <<< το email που έβαλες στο βήμα 1
on conflict (email) do update
  set role = 'admin',
      auth_id = excluded.auth_id;

-- Έλεγχος: πρέπει να δεις μία γραμμή με role = admin
select id, email, role, display_name from users where role = 'admin';
