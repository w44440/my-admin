# Logto Deployment Guide

This project uses Logto for authentication. The app is a SPA, so deployment has two parts:

1. Configure a Logto application for the frontend.
2. Deploy the frontend with the correct Logto environment variables.

If you self-host Logto OSS, there is a third part:

3. Deploy the Logto service itself behind a stable HTTPS endpoint.

## Recommended path

Use Logto Cloud unless you specifically need to self-host identity. Logto's OSS docs recommend Cloud as the quickest way to get started, and the React quick start is the same either way: create an app, configure redirect URIs, then wire the SDK into your SPA.

## Frontend environment

The app reads these variables:

- `VITE_LOGTO_ENDPOINT`
- `VITE_LOGTO_APP_ID`
- `VITE_APP_URL`

For local development in this repo, use the exact origin you run the app on. The current Vite dev server uses `http://127.0.0.1:5173`.

Example `.env.local`:

```env
VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
VITE_LOGTO_APP_ID=your-logto-spa-app-id
VITE_APP_URL=http://127.0.0.1:5173
```

## Path A: Logto Cloud

### 1. Create a Logto application

In Logto Console, create a new application and choose a **Single-page application** style app for this frontend.

### 2. Register redirect URIs

Add the callback URL(s) that the SPA will use:

- Local development: `http://127.0.0.1:5173/callback`
- Production: `https://your-admin-domain.com/callback`

These must match the value passed to `signIn()` in the app.

### 3. Register post sign-out redirect URIs

Add the URLs Logto is allowed to send users back to after sign-out:

- Local development: `http://127.0.0.1:5173/`
- Production: `https://your-admin-domain.com/`

The app calls `signOut(appUrl)`, so the value in `VITE_APP_URL` must match one of the allowed post sign-out redirect URIs.

### 4. Configure the frontend

Set the three environment variables above in your deployment platform.

### 5. Build and deploy

Run:

```bash
pnpm install
pnpm build
```

Deploy the generated `dist/` folder to your static host.

### 6. Verify the login flow

Open `/sign-in` and confirm:

- the login button is enabled only when Logto env vars are present
- clicking it redirects to Logto
- Logto returns to `/callback`
- sign-out returns to the app root

## Path B: Self-host Logto OSS

Use this path if you need control over identity data, custom infrastructure, or a private deployment.

### 1. Prepare infrastructure

Provision at least:

- PostgreSQL
- Docker
- HTTPS termination in front of Logto

Logto's OSS docs recommend stronger production infrastructure than the quick-start demo. Do not use the demo `docker compose` command for production because it bundles an ephemeral Postgres instance.

### 2. Decide the public endpoints

You need two stable URLs:

- `ENDPOINT` for the Logto service
- `ADMIN_ENDPOINT` for the Logto Admin Console

Keep them consistent across restarts and replicas.

### 3. Set Logto environment variables

At minimum, set:

- `DB_URL` - PostgreSQL DSN
- `ENDPOINT` - public Logto service URL
- `ADMIN_ENDPOINT` - public Admin Console URL

Common production settings:

- `TRUST_PROXY_HEADER=1` if Logto sits behind a reverse proxy
- `DATABASE_STATEMENT_TIMEOUT=DISABLE_TIMEOUT` if you use PgBouncer or RDS Proxy

Example container launch:

```bash
docker run \
  --name logto \
  -p 3001:3001 \
  -p 3002:3002 \
  -e TRUST_PROXY_HEADER=1 \
  -e ENDPOINT=https://auth.your-domain.com \
  -e ADMIN_ENDPOINT=https://auth-admin.your-domain.com \
  -e DB_URL=postgres://username:password@postgres-host:5432/logto \
  ghcr.io/logto-io/logto:latest
```

### 4. Put HTTPS in front

Logto's Admin Console requires a secure context. If you use a custom domain or an IP address over plain HTTP, the browser can fail to load the console.

If you terminate TLS at Nginx, proxy both ports to the container and forward headers correctly.

### 5. Verify the Logto console

Open the Admin Console URL and confirm it loads before you wire the frontend to it.

## Project-specific deploy checklist

Before shipping this app, make sure:

- `VITE_LOGTO_ENDPOINT` points to your Logto tenant or self-hosted endpoint
- `VITE_LOGTO_APP_ID` is the SPA application's client ID
- `VITE_APP_URL` is the exact public origin of the admin app
- `/callback` is registered as a redirect URI in Logto
- `/` is registered as a post sign-out redirect URI in Logto
- your production host serves HTTPS

## Common failures

- `oidc.invalid_redirect_uri`: the redirect URI in Logto does not exactly match the URL passed by the app.
- Sign-in fails behind a proxy: set `TRUST_PROXY_HEADER=1` on the Logto side.
- Admin Console does not load on a custom domain or bare IP: use HTTPS and a valid `ENDPOINT`/`ADMIN_ENDPOINT`.

## Sources

- Logto React quick start: https://docs.logto.io/quick-starts/react
- Logto OSS deployment and configuration: https://docs.logto.io/logto-oss/deployment-and-configuration
- Logto OSS getting started: https://docs.logto.io/logto-oss/get-started-with-oss
- Logto configuration: https://docs.logto.io/concepts/core-service/configuration
- Logto sign-out: https://docs.logto.io/end-user-flows/sign-out
- Logto application data structure: https://docs.logto.io/integrate-logto/application-data-structure
