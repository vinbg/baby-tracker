# Baby Tracker — macOS setup

This guide sets up the Baby Tracker app on a macOS machine with PostgreSQL, the API, web frontend, and optional Cloudflare Tunnel.

No secrets or real diary data are required from the repository. Create local `.env` files from examples and keep tunnel credentials outside git.

## Prerequisites

```bash
brew install node@22 pnpm postgresql@16 cloudflare/cloudflare/cloudflared
corepack enable || true
brew services start postgresql@16
```

## Database

```bash
createdb baby_feeding
cd api
cp .env.example .env
# edit DATABASE_URL and auth values
pnpm install
pnpm db:push
```

Alternatively, review `database/schema.sql` for a schema-only bootstrap. Do not restore or commit personal data dumps unless you explicitly intend to move private data between trusted machines.

## API

```bash
cd api
pnpm dev
```

Default local API: `http://localhost:3101`.

## Web

```bash
cd web
pnpm install
pnpm dev
```

Default local web: `http://localhost:5181`.

## Production service notes

`launchagents/` contains local macOS LaunchAgent examples. Before loading them:

1. Update paths to the actual project location.
2. Confirm `.env` exists locally on the target machine.
3. Confirm PostgreSQL is running.
4. Build or run the web app according to the chosen deployment mode.

## Cloudflare Tunnel

Use `cloudflared/config.yml.template` as a template only. Real credential JSON files and certs are ignored by git.

Typical flow on a trusted machine:

```bash
mkdir -p ~/.cloudflared
# place tunnel credential JSON in ~/.cloudflared manually
# render config from the template with the correct local paths
cloudflared tunnel ingress validate
cloudflared tunnel run <tunnel-name>
```

Run only one connector setup per intended tunnel unless you deliberately want multiple connectors.

## Smoke checks

```bash
cd api && pnpm exec tsc --noEmit
cd web && pnpm build
```

Then open the deployed URL or `http://localhost:5181` and verify login, feeding, diaper, sleep, and notes flows.
