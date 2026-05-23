# Project Deployment Guide

This repo is a Vite + React **Admin Console** with Logto-based authentication. For a homelab deployment, the full setup has four parts:

- the frontend static site for `lw40.top`
- the Logto public endpoint at `auth.lw40.top`
- the Logto admin endpoint at `logto.lw40.top`
- the ingress layer built from Cloudflare Tunnel and local Caddy routing

Recommended public origins for `lw40.top`:

- Admin Console: `https://lw40.top`
- Logto endpoint: `https://auth.lw40.top`
- Logto admin endpoint: `https://logto.lw40.top`

These public hostnames can be exposed through Cloudflare Tunnel instead of direct public ingress to the host.

## Current default mode

The current frontend defaults to **public preview mode**.

- The root route `/` is a public entry page.
- No Logto configuration is required by default.
- Protected routes only require login when `VITE_REQUIRE_AUTH=true` is set at build or preview time.
- If `VITE_REQUIRE_AUTH=true` is enabled without valid Logto settings, the app stays on the public entry page and shows a configuration warning instead of silently allowing access.

This makes the app usable in two modes with the same codebase:

- public preview mode for temporary local hosting
- Logto-protected mode for the later homelab deployment

## What to use

Use the app itself plus the templates under [`deploy/logto/`](/Users/leeway/projects/my-admin/deploy/logto) to run:

- the frontend build output from this repo
- Logto OSS
- PostgreSQL
- Caddy as the local origin router
- Cloudflare Tunnel as the public ingress layer

This matches the current frontend flow:

- `VITE_LOGTO_ENDPOINT` points to the Logto service origin
- `VITE_LOGTO_APP_ID` is the SPA application client ID
- `VITE_APP_URL` is the exact public origin of the admin app

For local development in this repo, the Vite dev server uses `http://127.0.0.1:5173`.

## Local preview mode

For the current temporary deployment, the simplest path is to run the frontend only and skip Logto, Caddy, and Cloudflare Tunnel entirely.

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` only if you want to be explicit:

```env
VITE_REQUIRE_AUTH=false
```

If `.env.local` is missing, the app still defaults to preview mode because `VITE_REQUIRE_AUTH` is only enabled when set to `true`.

3. Preview the app locally:

```bash
pnpm preview
```

If you need LAN access from another device on the same network, run:

```bash
pnpm preview
```

The `preview` script now runs `pnpm build` first and then starts `vite preview --host 0.0.0.0`, so `dist/` does not need to exist in advance.

## Recommended architecture

The simplest production layout for this project is:

```text
Browser
  -> https://lw40.top
  -> Cloudflare Edge
  -> Cloudflare Tunnel
  -> local Caddy
  -> frontend static files

Browser
  -> https://auth.lw40.top
  -> Cloudflare Edge
  -> Cloudflare Tunnel
  -> local Caddy
  -> Logto public endpoint

Browser
  -> https://logto.lw40.top
  -> Cloudflare Edge
  -> Cloudflare Tunnel
  -> local Caddy
  -> Logto admin endpoint
```

This keeps the whole **Admin Console** deployment on one routing model:

- all public traffic enters from Cloudflare Tunnel
- all local HTTP traffic lands on Caddy
- Caddy routes by hostname to either the frontend site or Logto

## Frontend deployment

This project is a static SPA build. It does not need a dedicated Node.js production server.

Build the frontend with:

```bash
pnpm install
pnpm build
```

This produces the static site in `dist/`.

Do not use `pnpm preview` as the production server. Vite documents `preview` as a local preview tool, not a production deployment target.

### Frontend environment variables

The frontend supports two deployment modes.

Public preview mode:

```env
VITE_REQUIRE_AUTH=false
```

Logto-protected mode:

```env
VITE_REQUIRE_AUTH=true
VITE_LOGTO_ENDPOINT=https://auth.lw40.top
VITE_LOGTO_APP_ID=your-logto-spa-app-id
VITE_APP_URL=https://lw40.top
```

These values are baked into the static build at build time. If you change the auth mode or public domains later, rebuild the frontend.

### Frontend hosting behind Caddy

Deploy the build output to a fixed directory on the host, for example:

```text
/srv/my-admin/dist
```

If `lw40.top` is also served by the same Caddy instance, add a site block for the frontend SPA:

```caddy
lw40.top {
    root * /srv/my-admin/dist
    encode gzip zstd
    try_files {path} /index.html
    file_server
}
```

`try_files {path} /index.html` is important because this project uses client-side routing. Without it, refreshing routes like `/dashboard` or `/users` will return `404`.

## Cloudflare Tunnel routing

If `lw40.top` is exposed through Cloudflare Tunnel, route each public hostname to the matching local service:

- `lw40.top` -> the deployed admin frontend service
- `auth.lw40.top` -> this Logto stack's public endpoint service
- `logto.lw40.top` -> this Logto stack's admin endpoint service

For the templates under [`deploy/logto/`](/Users/leeway/projects/my-admin/deploy/logto), the two Logto hostnames should both forward to the machine running Caddy. Caddy will then dispatch by `Host` header:

- `auth.lw40.top` -> `logto:3001`
- `logto.lw40.top` -> `logto:3002`

This means the host does not need direct public inbound traffic as long as the tunnel can reach the local origin service.

### Cloudflare Tunnel configuration

For a locally managed tunnel, `cloudflared` typically reads `config.yml` from one of these locations:

- macOS and Linux user scope: `~/.cloudflared/config.yml`
- system scope: `/etc/cloudflared/config.yml`

At minimum, define:

- `tunnel`: the tunnel UUID
- `credentials-file`: the JSON credentials file for that tunnel
- `ingress`: hostname-to-origin mappings

Example `cloudflared` config for this setup:

```yaml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /etc/cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  - hostname: lw40.top
    service: http://127.0.0.1:8080

  - hostname: auth.lw40.top
    service: http://127.0.0.1:80

  - hostname: logto.lw40.top
    service: http://127.0.0.1:80

  - service: http_status:404
```

In this example:

- `lw40.top` points to the deployed **Admin Console** origin on local port `8080`
- `auth.lw40.top` and `logto.lw40.top` both point to local Caddy on port `80`
- Caddy then dispatches `auth.lw40.top` to `logto:3001`
- Caddy then dispatches `logto.lw40.top` to `logto:3002`

If your **Admin Console** is also served by the same Caddy instance, you can instead map all three hostnames to `http://127.0.0.1:80` and let Caddy route them by `Host` header.

Example of that simplified variant:

```yaml
tunnel: YOUR_TUNNEL_UUID
credentials-file: /etc/cloudflared/YOUR_TUNNEL_UUID.json

ingress:
  - hostname: lw40.top
    service: http://127.0.0.1:80

  - hostname: auth.lw40.top
    service: http://127.0.0.1:80

  - hostname: logto.lw40.top
    service: http://127.0.0.1:80

  - service: http_status:404
```

The final catch-all rule is required so unmatched requests do not fall through unexpectedly.

Useful validation commands before installing the service:

```bash
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://auth.lw40.top
```

After validation, run the tunnel with your usual service management method, for example a system service managed by `cloudflared service install`.

### TLS boundary

With Cloudflare Tunnel in front:

- Public HTTPS is terminated at Cloudflare Edge.
- Tunnel traffic is carried from Cloudflare to `cloudflared`.
- The local origin behind the tunnel can be plain HTTP, for example `http://caddy:80`.
- Caddy can then proxy over plain HTTP to `logto:3001` and `logto:3002`.

A typical path is:

```text
Browser
  -> https://auth.lw40.top
  -> Cloudflare Edge
  -> Cloudflare Tunnel
  -> http://caddy:80
  -> http://logto:3001
```

In this setup, Caddy is mainly the local hostname router and reverse proxy. It does not need to be the public TLS terminator.

### Public URLs vs local origin URLs

Keep these two categories separate:

- Public URLs: the real HTTPS origins seen by browsers and used by OIDC settings.
- Local origin URLs: the internal HTTP targets used by Cloudflare Tunnel or reverse proxies.

Public URLs in this repo should stay as:

- `LOGTO_ENDPOINT=https://auth.lw40.top`
- `LOGTO_ADMIN_ENDPOINT=https://logto.lw40.top`
- `VITE_LOGTO_ENDPOINT=https://auth.lw40.top`
- `VITE_APP_URL=https://lw40.top`

Local origin URLs belong only in infrastructure config, for example:

- Cloudflare Tunnel origin -> `http://caddy:80`
- Caddy upstream -> `http://logto:3001`
- Caddy upstream -> `http://logto:3002`

Do not put local origin URLs such as `http://logto:3001` into frontend env vars, Logto public endpoints, or callback configuration.

## Homelab setup

1. Build and place the frontend static files:

```bash
pnpm install
pnpm build
```

   Place the generated `dist/` at the directory served by Caddy, for example `/srv/my-admin/dist`.

2. Copy [`deploy/logto/.env.example`](/Users/leeway/projects/my-admin/deploy/logto/.env.example) to `deploy/logto/.env`.
3. Fill in:
   - `APP_DOMAIN`
   - `LOGTO_ENDPOINT`
   - `LOGTO_ADMIN_ENDPOINT`
   - `AUTH_DOMAIN`
   - `ADMIN_DOMAIN`
   - `POSTGRES_*`
   Example for `lw40.top`:

```env
APP_DOMAIN=lw40.top
LOGTO_ENDPOINT=https://auth.lw40.top
LOGTO_ADMIN_ENDPOINT=https://logto.lw40.top
AUTH_DOMAIN=auth.lw40.top
ADMIN_DOMAIN=logto.lw40.top
POSTGRES_DB=logto
POSTGRES_USER=logto
POSTGRES_PASSWORD=change-me
```

4. Start the Logto stack from `deploy/logto`:

```bash
docker compose up -d
```

   The compose file mounts `../../dist` into the Caddy container at `/srv/my-admin/dist`, so the frontend build must exist before starting the stack.

5. Configure Caddy so it serves:
   - `lw40.top` -> frontend static files
   - `auth.lw40.top` -> `logto:3001`
   - `logto.lw40.top` -> `logto:3002`
6. Configure Cloudflare Tunnel so it sends the same hostnames to the matching local origin.
7. In Logto Console, create a **Single-page application** and register:
   - Redirect URI: `https://lw40.top/callback`
   - Post sign-out redirect URI: `https://lw40.top/`
8. Set the frontend env vars for this repo before the next frontend build:

```env
VITE_REQUIRE_AUTH=true
VITE_LOGTO_ENDPOINT=https://auth.lw40.top
VITE_LOGTO_APP_ID=your-logto-spa-app-id
VITE_APP_URL=https://lw40.top
```

## Notes

- The frontend now has a public entry page at `/`, so a login page can exist without requiring Logto to be active.
- Authentication is controlled by the build-time flag `VITE_REQUIRE_AUTH`. The default behavior without this flag is public preview mode.
- This project is a static frontend build, so production hosting should serve built files from `dist/` rather than running `vite preview`.
- The Logto OSS docs recommend a stable HTTPS endpoint and separate admin origin for production.
- Do not use the demo `docker compose` command from upstream Logto for production because it bundles an ephemeral Postgres instance.
- The official Logto image already includes official connectors, so the homelab stack does not need a separate connector download step.
- With direct public exposure, Caddy can obtain and renew certificates automatically as long as `AUTH_DOMAIN` and `ADMIN_DOMAIN` resolve to this host.
- With Cloudflare Tunnel, treat the tunnel as the public entrypoint and keep the local origin wiring consistent with the hostname rules instead of relying on direct public ingress to this host.
- If Cloudflare Tunnel is used instead of direct exposure, keep the tunnel hostname rules aligned with `AUTH_DOMAIN`, `ADMIN_DOMAIN`, and the admin app domain.
- If `lw40.top` is also placed behind the same Caddy instance, the overall pattern becomes `Cloudflare Tunnel -> Caddy -> target service` for all three hostnames.

## Risks and common misconfigurations

- If `VITE_REQUIRE_AUTH=true` is enabled but the frontend is built without `VITE_LOGTO_ENDPOINT` or `VITE_LOGTO_APP_ID`, the app will not enter the protected pages until those values are provided and the frontend is rebuilt.
- If you expect the app to require login but forget to set `VITE_REQUIRE_AUTH=true`, it will continue to run in public preview mode by default.
- If the frontend is deployed without SPA fallback routing in Caddy, direct navigation or refresh on routes like `/dashboard` will fail with `404`.
- If the frontend is rebuilt with stale `VITE_*` values, the deployed **Admin Console** may still redirect to old domains even though Cloudflare and Caddy have already been updated.
- If a Cloudflare Tunnel hostname points to the wrong local origin, the request may still reach your host but land on the wrong service. This usually shows up as the admin domain opening the wrong page or Logto endpoints returning unexpected content.
- If public URLs and local origin URLs are mixed up, OIDC login will fail. Typical mistakes are setting `VITE_LOGTO_ENDPOINT=http://logto:3001` or registering callback URLs with local HTTP addresses instead of the public HTTPS domain.
- If `lw40.top`, `auth.lw40.top`, and `logto.lw40.top` are not all aligned between Cloudflare hostname rules, Caddy host routing, and Logto env vars, sign-in may redirect to a different origin than the one that started the flow.
- If Caddy is used as the shared local origin router, it must have an explicit route for every hostname you send to it. Sending `lw40.top` to Caddy without adding a matching site block will result in failed or misrouted requests.
- If the final `http_status:404` ingress rule is omitted from `cloudflared` config, unmatched traffic handling becomes harder to reason about and mistakes are less obvious during debugging.
- If your Admin Console local origin port changes, remember to update the Tunnel `service:` target as well. The public hostname does not change automatically when the local origin moves.
- If you later switch from Cloudflare Tunnel to direct public exposure, revisit the TLS setup. In that model, Caddy may need to resume certificate management and public HTTPS termination.

## Verification

For local preview mode, check:

- `/` loads the public entry page
- entering the preview opens `/dashboard` without requiring login
- rebuilding is not required unless frontend env vars change

For the homelab stack, check:

- `https://auth.lw40.top` loads
- `https://lw40.top` loads
- refreshing `https://lw40.top/dashboard` still loads the frontend app instead of returning `404`
- `/sign-in` redirects to Logto
- `/callback` completes the sign-in round trip
- sign-out returns to the admin app root

## Sources

- Vite build: https://vite.dev/guide/build
- Vite static deployment: https://vite.dev/guide/static-deploy.html
- Logto React quick start: https://docs.logto.io/quick-starts/react
- Logto OSS deployment and configuration: https://docs.logto.io/logto-oss/deployment-and-configuration
- Logto OSS getting started: https://docs.logto.io/logto-oss/get-started-with-oss
- Logto CLI: https://docs.logto.io/logto-oss/using-cli
- Logto connector management: https://docs.logto.io/logto-oss/using-cli/manage-connectors
- Cloudflare Tunnel overview: https://developers.cloudflare.com/tunnel/
- Cloudflare Tunnel configuration: https://developers.cloudflare.com/tunnel/configuration/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Tunnel routing: https://developers.cloudflare.com/tunnel/routing/
