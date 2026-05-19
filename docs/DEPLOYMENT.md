# Deployment notes

## Process layout

Recommended production layout:

- PostgreSQL database
- API process: `cd api && pnpm start`
- Web process/static server: `cd web && pnpm build`, then serve `web/dist`
- Reverse proxy or tunnel routes the public hostname to the web server and proxies `/api/*` to the API.

## Local service files

`launchagents/` contains macOS LaunchAgent examples for the local machine. Review paths before using them elsewhere.

## Cloudflare Tunnel

`cloudflared/config.yml.template` is safe to commit as a template. Real tunnel credential JSON files are ignored by git and must not be committed.

## Secrets checklist

Before pushing or deploying, confirm these are not committed:

- `api/.env`
- root `.env`
- `cloudflared/*.json`
- Cloudflare certs
- database dumps containing real diary data

Use `api/.env.example` as the public configuration template.
