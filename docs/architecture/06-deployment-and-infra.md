# 06 — Deployment & Infrastructure

Covers the build pipeline, Cloudflare/OpenNext worker deployment, Docker self-hosting, environment variables, and PWA service-worker registration.
Source files: [`next.config.mjs`](../../next.config.mjs) · [`wrangler.jsonc`](../../wrangler.jsonc) · [`Dockerfile`](../../Dockerfile) · [`docker-compose.yml`](../../docker-compose.yml) · [`Makefile`](../../Makefile) · [`.env.example`](../../.env.example) · [`package.json`](../../package.json) · [`DOCKER.md`](../../DOCKER.md)

---

## 1. Build 🔵

### `next.config.mjs`

The config is wrapped by three plugins applied in order:

```
withSentryConfig( withNextIntl( withPWA(nextConfig) ) )
```

| Setting | Value | Purpose |
|---|---|---|
| `output` | `'standalone'` | Bundles only the files needed to run; required for Docker and OpenNext |
| `eslint.ignoreDuringBuilds` | `true` | Skips ESLint during `next build` to speed up CI/Docker builds |
| `typescript.ignoreBuildErrors` | `true` | Skips TypeScript type-checking during builds |
| `experimental.serverActions.bodySizeLimit` | `'50mb'` | 🟢 Raised from the 1 MB default to handle CSV upload Server Actions |

**Plugin wrappers (applied at build time):**

- **`withSentryConfig`** — uploads source maps to Sentry (`org: torbox-manager`, `project: javascript-nextjs`); enables React component annotations and tree-shakes Sentry logger statements in production. Configured to be silent outside CI.
- **`withNextIntl`** — `next-intl` plugin for i18n routing/message loading.
- **`withPWA`** — generates service-worker assets into `public/`; disabled in `development` (see [§5 PWA](#5-pwa-)).

### `package.json` scripts

| Script | Command | Notes |
|---|---|---|
| `dev` | `next dev --turbopack -p 4000` | Development server on port 4000 with Turbopack |
| `build` | `next build` | Production build; outputs `.next/standalone/` |
| `start` | `next start -p 4000` | Serves the production build on port 4000 |
| `docker:build` | `docker build -t torbox-app .` | Build Docker image |
| `docker:up` | `docker compose up -d` | Start containers in background |
| `docker:down` | `docker compose down` | Stop and remove containers |
| `docker:restart` | `./scripts/restart-compose.sh` | Rebuild and restart (required after `.env` changes) |
| `docker:logs` | `docker compose logs -f` | Tail container logs |

---

## 2. Cloudflare / OpenNext 🟢

The project ships a [`wrangler.jsonc`](../../wrangler.jsonc) for deploying to Cloudflare Workers via **OpenNext**.

| Field | Value | Meaning |
|---|---|---|
| `name` | `torrent-manager` | Cloudflare Worker name |
| `main` | `.open-next/worker.js` | Entry point produced by OpenNext's `build` step |
| `compatibility_date` | `2026-01-01` | Workers runtime pinning date |
| `compatibility_flags` | `["nodejs_compat"]` | Enables Node.js-compatible APIs in the Workers runtime |
| `assets.directory` | `.open-next/assets` | Static assets directory emitted by OpenNext |
| `assets.binding` | `ASSETS` | Binding name used by the worker to serve static files |

**Build flow for Cloudflare:**

1. `next build` produces `.next/standalone/` (`output: 'standalone'`).
2. OpenNext (`open-next build`) transforms the standalone output into `.open-next/` — the worker entrypoint and assets directory that `wrangler.jsonc` references.
3. `wrangler deploy` publishes the worker and uploads the assets.

---

## 3. Docker 🟢

See [`DOCKER.md`](../../DOCKER.md) for the full operational guide (restart scripts, production resource limits, troubleshooting).

### `Dockerfile` — multi-stage build

| Stage | Base image | Purpose |
|---|---|---|
| `base` | `node:24.10.0-alpine` | Shared Alpine base |
| `deps` | `base` | Install dependencies (pnpm preferred; `libc6-compat` added for Alpine compatibility) |
| `builder` | `base` | Run `npm run build`; sets `NEXT_TELEMETRY_DISABLED=1`, `ESLINT_NO_DEV_ERRORS=true`, `SKIP_ENV_VALIDATION=true` |
| `runner` | `base` | Production image — copies only the standalone output |

**Runner stage details:**

- Copies `.next/standalone/` (the standalone server), `.next/static/`, and `public/`.
- Creates a non-root system user/group (`nextjs:nodejs`, uid/gid 1001) and runs as that user.
- Exposes **port 4000**; sets `PORT=4000` and `HOSTNAME="0.0.0.0"`.
- Entrypoint: `node server.js` (the standalone Next.js server).

### `docker-compose.yml`

| Setting | Value |
|---|---|
| Port mapping | `4000:4000` |
| Env file | `.env` (merged with inline `NODE_ENV=production`, `PORT=4000`) |
| Restart policy | `unless-stopped` |
| Healthcheck | `wget --spider http://localhost:4000` every 30s, 3 retries, 40s start period |

### `Makefile` targets

| Target | Action |
|---|---|
| `build` | `docker compose build` |
| `up` | `docker compose up -d` |
| `down` | `docker compose down` |
| `restart` / `restart-env` | `./scripts/restart-compose.sh` — rebuild + restart (use after `.env` changes) |
| `logs` | `docker compose logs -f` |
| `rebuild` | Force rebuild without cache, then restart |

---

## 4. Environment Variables

> **Note:** `.env.example` is intentionally minimal — it documents only the three application-specific variables. `DOCKER.md` is the authoritative source for the full variable list including PostHog, Sentry, and runtime vars. `NEXT_PUBLIC_APP_URL` is not in either file but is referenced directly in the CSV API routes with a `http://localhost:4000` fallback.

### `NEXT_PUBLIC_*` variables are baked in at build time. Changing them requires a full image rebuild (`make restart` or `make rebuild`). Server-side variables are read at runtime but a restart is still recommended.

| Variable | Public/Secret | Purpose | Documented in |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL — used by client-side Supabase calls | `.env.example` · `DOCKER.md` |
| `SUPABASE_SECRET_KEY` | Secret | Supabase service-role key — server-side only, never exposed to browser | `.env.example` · `DOCKER.md` |
| `IMAGE_UPLOAD_ENDPOINT` | Secret | URL of the image upload service used by server API routes | `.env.example` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public | PostHog project API key — initialised in `providers.js` | `DOCKER.md` |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public | PostHog ingestion host (defaults to `https://us.i.posthog.com`) | `DOCKER.md` |
| `NEXT_PUBLIC_APP_URL` | Public | Absolute base URL used to construct self-referencing API calls in CSV routes (defaults to `http://localhost:4000`) | code (`src/app/api/csv/`) |
| `SENTRY_DSN` | Secret | Sentry data source name for error reporting | `DOCKER.md` |
| `PORT` | Runtime | HTTP listen port (defaults to `4000`) | `DOCKER.md` |
| `NODE_ENV` | Runtime | Node environment (`production` set in Dockerfile and `docker-compose.yml`) | `DOCKER.md` |

---

## 5. PWA 🔵

`next-pwa` is configured in `next.config.mjs`:

```js
withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})
```

- In production, `next build` generates a service worker and writes it to `public/` (`dest: 'public'`).
- `register: true` — the SW is auto-registered by the injected client script.
- `skipWaiting: true` — new SW versions activate immediately without waiting for existing clients to close.
- Disabled entirely in development to avoid stale-cache interference.

For how the service worker interacts with the frontend (manifest, offline support), see [02-frontend-architecture.md](./02-frontend-architecture.md).
