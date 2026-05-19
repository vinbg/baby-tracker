# 🍼 Baby Tracker

A private, mobile-friendly baby diary for tracking feeding, diapers, sleep, daily notes, and feeding guidance.

The app is built for fast one-handed use on a phone: large tap targets, simple daily cards, and quick actions for common events.

## Features

- **Feeding diary** — log time, amount, duration, and notes.
- **Sleep tracker** — start/stop sleep sessions, see the active nap timer, daily total, longest sleep, and history.
- **Diaper tracker** — one-tap wet/dirty logging with daily counts.
- **Daily notes** — autosaved notes per day.
- **Calendar view** — choose a day and review history.
- **Feeding plan/recommendations** — configurable plan and forecast.
- **Authentication** — password login with bearer token API protection.
- **Mobile-first UI** — responsive React interface with light/dark theme.

## Stack

- Frontend: React 19, TypeScript, Vite, TanStack Query, Tailwind CSS v4
- Backend: Node.js, Hono, Drizzle ORM
- Database: PostgreSQL

## Local setup

Prerequisites:

- Node.js 22+
- pnpm
- PostgreSQL 16+

```bash
# 1) Create database
createdb baby_feeding

# 2) Configure API env
cp api/.env.example api/.env
# edit api/.env with your DATABASE_URL, AUTH_TOKEN, etc.

# 3) Install API deps and sync schema
cd api
pnpm install
pnpm db:push

# 4) Install web deps
cd ../web
pnpm install
```

Run locally in two terminals:

```bash
cd api && pnpm dev     # http://localhost:3101
cd web && pnpm dev     # http://localhost:5181
```

Open <http://localhost:5181>.

## Environment

Only examples are committed. Real `.env` files are ignored.

See [`api/.env.example`](api/.env.example).

## Documentation

- [Technical documentation](docs/TECHNICAL.md)
- [API reference](docs/API.md)
- [Deployment notes](docs/DEPLOYMENT.md)

## Privacy / secrets

This repository should contain code and documentation only:

- no real `.env` files
- no Cloudflare tunnel credentials
- no database dumps with baby diary data
- use `database/schema.sql` for schema-only reference
