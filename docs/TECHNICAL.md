# Technical documentation

## Architecture

Baby Tracker is a small full-stack app split into two packages:

```text
api/   Hono API, Drizzle schema, PostgreSQL access
web/   React/Vite mobile-first UI
```

The web app calls the API through `/api/*`. In development, Vite proxies API calls to the backend. In production, run the API and serve/proxy the web app behind the same origin.

## Data model

Drizzle schema lives in `api/src/schema.ts`.

### `feedings`

Stores feeding events for a local day.

- `day` — local date (`YYYY-MM-DD`)
- `fed_at` — exact timestamp
- `amount_ml`
- `duration_min`
- `note`

### `diapers`

Stores diaper events.

- `day`
- `logged_at`
- `kind` — `wet` or `dirty`
- `note`

### `sleep_sessions`

Stores sleep entries with start and end timestamps.

- `day` — local day the sleep started
- `start_at`
- `end_at` — sleep end timestamp
- `note`

### `day_notes`

One daily note row per day.

### `settings`

Single-row feeding plan settings, id `1`.

### `auth_users`

Created on API startup if missing. Stores scrypt password hashes.

## Sleep module UX

The sleep module is intentionally simple and phone-friendly:

- Pick **Начало** and **Край** with large time controls.
- Tap **Добави сън** to save the entry.
- Daily stats show total sleep, number of sessions, longest session, and average session.
- History rows show start/end and duration; records can be deleted.

## Schema updates

Drizzle is the source of truth:

```bash
cd api
pnpm db:push
```

`database/schema.sql` is schema-only reference for bootstrapping or review. Do not commit data dumps.

## Authentication

`POST /api/login` validates the configured username against `auth_users.password_hash` and returns `AUTH_TOKEN`. Protected API routes require:

```http
Authorization: Bearer <AUTH_TOKEN>
```

The frontend stores the token in localStorage and clears it on `401`.

## Build checks

```bash
cd api && pnpm exec tsc --noEmit
cd web && pnpm build
```
