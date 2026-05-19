-- Schema-only bootstrap for the baby tracker database.
-- Drizzle is the source of truth; prefer `cd api && pnpm db:push` for updates.

CREATE TABLE IF NOT EXISTS day_notes (
  day date PRIMARY KEY,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedings (
  id serial PRIMARY KEY,
  day date NOT NULL,
  fed_at timestamptz NOT NULL,
  amount_ml integer NOT NULL,
  duration_min integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS feedings_day_fed_at_idx
  ON feedings (day, fed_at, id);

CREATE TABLE IF NOT EXISTS diapers (
  id serial PRIMARY KEY,
  day date NOT NULL,
  logged_at timestamptz NOT NULL,
  kind text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS diapers_day_logged_at_idx
  ON diapers (day, logged_at, id);

CREATE TABLE IF NOT EXISTS sleep_sessions (
  id serial PRIMARY KEY,
  day date NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sleep_sessions_day_start_idx
  ON sleep_sessions (day, start_at, id);

CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1,
  target_feeds_per_day integer,
  target_per_feed_ml integer,
  interval_hours integer,
  wake_time text,
  bedtime_feed_time text,
  last_feed_time text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_users (
  username text PRIMARY KEY,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
