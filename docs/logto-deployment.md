# Logto Deployment Guide

This repo already includes the SPA wiring for Logto. For a homelab deployment, the missing piece is the self-hosted Logto stack itself.

## What to use

Use the templates under [`deploy/logto/`](/home/leeway/projects/my-admin/deploy/logto) to run:

- Logto OSS
- PostgreSQL
- Caddy TLS termination for two HTTPS origins

This matches the current frontend flow:

- `VITE_LOGTO_ENDPOINT` points to the Logto service origin
- `VITE_LOGTO_APP_ID` is the SPA application client ID
- `VITE_APP_URL` is the exact public origin of the admin app

For local development in this repo, the Vite dev server uses `http://127.0.0.1:5173`.

## Homelab setup

1. Copy [`deploy/logto/.env.example`](/home/leeway/projects/my-admin/deploy/logto/.env.example) to `deploy/logto/.env`.
2. Fill in:
   - `LOGTO_ENDPOINT`
   - `LOGTO_ADMIN_ENDPOINT`
   - `AUTH_DOMAIN`
   - `ADMIN_DOMAIN`
   - `POSTGRES_*`
3. Start the stack from `deploy/logto`:

```bash
docker compose up -d
```

4. In Logto Console, create a **Single-page application** and register:
   - Redirect URI: `https://your-admin-domain/callback`
   - Post sign-out redirect URI: `https://your-admin-domain/`
5. Set the frontend env vars for this repo:

```env
VITE_LOGTO_ENDPOINT=https://your-logto-domain
VITE_LOGTO_APP_ID=your-logto-spa-app-id
VITE_APP_URL=https://your-admin-domain
```

## Notes

- The Logto OSS docs recommend a stable HTTPS endpoint and separate admin origin for production.
- Do not use the demo `docker compose` command from upstream Logto for production because it bundles an ephemeral Postgres instance.
- The official Logto image already includes official connectors, so the homelab stack does not need a separate connector download step.
- Caddy will obtain and renew certificates automatically as long as `AUTH_DOMAIN` and `ADMIN_DOMAIN` point to public DNS records that resolve to this host.

## Verification

After the stack is up, check:

- `https://your-logto-domain` loads
- `https://your-admin-domain` loads
- `/sign-in` redirects to Logto
- `/callback` completes the sign-in round trip
- sign-out returns to the admin app root

## Sources

- Logto React quick start: https://docs.logto.io/quick-starts/react
- Logto OSS deployment and configuration: https://docs.logto.io/logto-oss/deployment-and-configuration
- Logto OSS getting started: https://docs.logto.io/logto-oss/get-started-with-oss
- Logto CLI: https://docs.logto.io/logto-oss/using-cli
- Logto connector management: https://docs.logto.io/logto-oss/using-cli/manage-connectors
