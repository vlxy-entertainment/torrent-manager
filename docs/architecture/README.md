# torbox-app — Architecture Reference

## What this app is

`torbox-app` is a fork of the open-source **TorBox Manager** ([`jittarao/torbox-app`](https://github.com/jittarao/torbox-app), AGPL-3.0) — a Next.js 15 / React 19 power-user web UI for the [TorBox](https://torbox.app) debrid service. On top of the upstream torrent/usenet/web-download management UI, this fork adds a **custom CSV→Supabase ingestion pipeline** that allows a human operator to batch-upload video metadata into a shared Supabase database, feeding a larger multi-service video platform.

---

## Upstream / Custom legend

| Tag | Meaning |
|-----|---------|
| 🔵 **Upstream** | Original TorBox Manager code — torrents/usenet/webdl UI, Zustand state, i18n, shared components, PWA. |
| 🟢 **Custom** | Added for this platform — CSV ingestion pipeline, Supabase queue writes, Cloudflare/Docker deploy wiring, Sentry/PostHog instrumentation. |

Sections and endpoints throughout the docs carry one of these tags (or **mixed** where both apply).

---

## How this app fits the bigger system

A human operator uses this app to manage TorBox downloads and to upload CSV files for batch video ingestion. Upstream features proxy the TorBox API using a user-supplied API key. The custom pipeline parses uploaded CSVs and writes records into a shared Supabase project (VLXY), which downstream services consume to process and publish videos.

Key system boundaries:

- **Human operator** — uses this app's UI; the only actor that directly interacts with it.
- **TorBox API** (`api.torbox.app`) — external debrid service; all upstream route handlers proxy it with the user's API key. 🔵
- **Supabase (project VLXY)** — shared Postgres; this app **writes** `csv_processing_jobs` and `video_processing_queue`. 🟢
- **tiktok-uploader service** — downstream consumer that polls `video_processing_queue` and processes queued videos. 🟢
- **video-streaming** — the public frontend that serves processed videos; reads the `videos` table but never the queue tables. 🟢
- **Cloudflare / Docker** — deploy targets (see `06-deployment-and-infra.md`). 🟢
- **Sentry / PostHog** — error tracking and analytics; instrumented on client, server, and edge. 🟢

---

## Document index

| # | File | Description | Tag |
|---|------|-------------|-----|
| 1 | [01-system-context.md](./01-system-context.md) | This app's boundaries with TorBox API, Supabase, tiktok-uploader, video-streaming, and external services; C4 context diagram. | 🟢 |
| 2 | [02-frontend-architecture.md](./02-frontend-architecture.md) | Next.js 15 App Router structure, `app/[locale]` routing + next-intl i18n, components by feature, Zustand stores, hooks, PWA. | 🔵 |
| 3 | [03-api-routes.md](./03-api-routes.md) | Every Route Handler: torrents/usenet/webdl proxy routes and custom `csv/*` routes; endpoint table (method, params, TorBox vs. Supabase). | mixed |
| 4 | [04-csv-ingestion-pipeline.md](./04-csv-ingestion-pipeline.md) | Keystone doc — CSV upload → `process` → job queuing → `process-job/[jobId]` → `job-status/[jobId]` polling → Supabase tables; sequence diagram. | 🟢 |
| 5 | [05-integrations.md](./05-integrations.md) | TorBox API auth and endpoints used; Supabase tables/columns this app writes; Sentry and PostHog wiring; image-upload service. | mixed |
| 6 | [06-deployment-and-infra.md](./06-deployment-and-infra.md) | Cloudflare/OpenNext (`wrangler.jsonc`) and Docker (`Dockerfile`, `docker-compose.yml`, `Makefile`) deploy paths; env vars; `next.config.mjs`. | mixed |

---

## Reading order

**New to this repo?** Start with system context, then the keystone custom feature, then fill in the rest:

```
01-system-context.md        ← understand the overall picture first
04-csv-ingestion-pipeline.md ← the keystone: what makes this fork unique
03-api-routes.md            ← all server-side endpoints in one place
02-frontend-architecture.md ← UI structure, state, routing
05-integrations.md          ← external service details
06-deployment-and-infra.md  ← how it runs in production
```

Lead with **01** for context, then **04** (the custom pipeline that distinguishes this fork), then **03** and **02** for the full app map, and finally **05**/**06** for integration and ops details.

---

## Conventions

- **Mermaid diagrams** — used for C4 context (doc 01) and the ingestion sequence (doc 04); render on GitHub and are plain text for AI agents.
- **Source file paths** — each doc links the relevant `src/` files and config files by path.
- **Tables** — endpoints, env vars, components, and stores are presented as scannable tables, not prose lists.
- **🔵 / 🟢 tags** — every section and endpoint is labeled with the upstream/custom legend above.
- **Link, don't duplicate** — the upstream [`README.md`](../../README.md) and [`DOCKER.md`](../../DOCKER.md) at repo root are referenced by these docs, not reproduced here.
