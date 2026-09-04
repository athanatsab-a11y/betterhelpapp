// Local SQLite schema. The Supabase Postgres equivalent lives in
// supabase/migrations/ and is applied with the Supabase CLI or psql.
export const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  auth_id TEXT UNIQUE,                           -- Supabase auth.users.id
  password_hash TEXT,                            -- only for the legacy/local auth mode
  role TEXT NOT NULL DEFAULT 'client',           -- client | therapist | admin
  display_name TEXT NOT NULL,
  nickname TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'Europe/Athens',
  locale TEXT DEFAULT 'el',
  emergency_contact TEXT,
  notify_email INTEGER DEFAULT 1,
  notify_sms INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS therapists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  bio TEXT,
  credentials TEXT,                              -- "Ψυχολόγος, MSc CBT"
  license_no TEXT,
  years_experience INTEGER DEFAULT 0,
  gender TEXT,                                   -- female | male | nonbinary
  languages TEXT DEFAULT 'el',                   -- csv
  specialties TEXT DEFAULT '',                   -- csv of specialty keys
  approaches TEXT DEFAULT '',                    -- csv: cbt,psychodynamic,...
  faith_based INTEGER DEFAULT 0,
  lgbtq_friendly INTEGER DEFAULT 1,
  photo TEXT,
  rating REAL DEFAULT 5,
  reviews_count INTEGER DEFAULT 0,
  accepting_clients INTEGER DEFAULT 1,
  max_clients INTEGER DEFAULT 25,
  avg_response_hours INTEGER DEFAULT 8
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers TEXT NOT NULL,                         -- json
  scores TEXT NOT NULL,                          -- json {mood, anxiety, ...}
  risk_level TEXT DEFAULT 'low',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS intakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  anon_token TEXT,                               -- for pre-signup questionnaires
  service TEXT DEFAULT 'individual',             -- individual | couples | teen
  answers TEXT NOT NULL,                         -- json
  risk_level TEXT DEFAULT 'low',                 -- low | elevated | crisis
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',         -- active | ended
  score REAL DEFAULT 0,
  reason TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  kind TEXT DEFAULT 'text',                      -- text | system | worksheet | attachment
  meta TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,                       -- ISO
  duration_min INTEGER DEFAULT 45,
  modality TEXT DEFAULT 'video',                 -- video | phone | live_chat
  booked INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  slot_id INTEGER REFERENCES availability(id) ON DELETE SET NULL,
  starts_at TEXT NOT NULL,
  duration_min INTEGER DEFAULT 45,
  modality TEXT DEFAULT 'video',
  status TEXT DEFAULT 'scheduled',               -- scheduled | completed | cancelled | no_show
  join_code TEXT,
  notes TEXT,                                    -- therapist private notes
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  body TEXT,
  mood INTEGER,                                  -- 1..5
  shared_with_therapist INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS worksheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  fields TEXT NOT NULL                           -- json array of {key,label,type,options?}
);

CREATE TABLE IF NOT EXISTS worksheet_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worksheet_id INTEGER NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'assigned',                -- assigned | completed
  answers TEXT,
  assigned_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS groupinars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  topic TEXT,
  host_therapist_id INTEGER REFERENCES therapists(id) ON DELETE SET NULL,
  starts_at TEXT NOT NULL,
  duration_min INTEGER DEFAULT 60,
  description TEXT,
  capacity INTEGER DEFAULT 200
);

CREATE TABLE IF NOT EXISTS groupinar_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  groupinar_id INTEGER NOT NULL REFERENCES groupinars(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(groupinar_id, user_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'standard',         -- standard | plus | premium
  billing_period TEXT DEFAULT 'monthly',         -- weekly | monthly | quarterly
  price_cents INTEGER NOT NULL,
  discount_pct INTEGER DEFAULT 0,                -- financial aid
  status TEXT DEFAULT 'trialing',                -- trialing | active | paused | cancelled
  renews_at TEXT,
  cancelled_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'paid',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_aid (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_income_cents INTEGER,
  household_size INTEGER,
  employment TEXT,
  status TEXT DEFAULT 'approved',
  discount_pct INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL,
  body TEXT,
  author_label TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id, id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, id);
CREATE INDEX IF NOT EXISTS idx_matches_client ON matches(client_id, status);
CREATE INDEX IF NOT EXISTS idx_avail_therapist ON availability(therapist_id, starts_at);
`;
