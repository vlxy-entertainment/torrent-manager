# Architecture Documentation — Design Spec (torbox-app)

**Date:** 2026-06-09
**Status:** Approved (design); pending implementation plan
**Topic:** A focused set of architecture/reference docs for the torbox-app

## Purpose

`torbox-app` is a fork of the open-source **TorBox Manager** (`jittarao/torbox-app`,
AGPL-3.0) — a power-user Next.js web UI for the TorBox debrid service — extended with
a **custom CSV→Supabase ingestion pipeline** that feeds a larger video platform. There
is no maintained description of how the app is built, what was added on top of upstream,
or how it connects to the rest of the system.

Produce a **comprehensive reference** that lets *other people and AI agents* understand
everything about this app: its structure, the TorBox API integration, the custom
ingestion pipeline, and deployment — and clearly distinguish **upstream** code from
**custom** additions.

Reference depth: concrete file paths, endpoint/env tables, and diagrams — not
line-by-line walkthroughs.

## Audience

- Engineers/architects new to this repo or to the wider platform.
- AI coding agents that need an accurate, loadable map before making changes. This
  drives the focused-docs structure (load one topic, not a monolith) and the use of
  plain-text Mermaid diagrams and scannable tables.

## The bigger system (context this app lives in)

This app is one of several pieces sharing a single Supabase project (VLXY). The docs
describe **this app's boundary** with each, not the internals of the other repos.

- **Human operator** — uses this app's UI to manage TorBox downloads and to upload CSVs
  for batch ingestion.
- **TorBox API** — external debrid/seedbox service; the upstream features proxy it using
  a user-supplied API key.
- **Supabase (project VLXY)** — shared Postgres. This app **writes** the ingestion
  queue tables (`csv_processing_jobs`, `video_processing_queue`).
- **tiktok-uploader service** — downstream consumer that processes the queued videos.
- **video-streaming** — the public frontend that ultimately serves the processed videos
  (reads `videos` and related tables; never reads the queue tables).
- **External services** — Cloudflare (Workers/OpenNext deploy target), Docker (alt
  deploy), Sentry (error tracking), PostHog (analytics).

## Upstream vs. custom

The docs label every section/endpoint with a legend:

- 🔵 **Upstream** — original TorBox Manager code (torrents/usenet/webdl UI, state, i18n).
- 🟢 **Custom** — added for this platform (CSV ingestion pipeline, Supabase queue, the
  Cloudflare/Docker deploy wiring).

## Structure

A new `docs/architecture/` folder **in this repo**, one Markdown file per concern, plus
a `README.md` index with a recommended reading order and the upstream/custom legend.

### Document set

| # | File | Covers | Mostly |
|---|------|--------|--------|
| — | `README.md` | What the app is (TorBox Manager fork + custom ingestion), doc index, reading order, upstream/custom legend | — |
| 1 | `01-system-context.md` | This app's boundary: human operator → TorBox API → Supabase shared DB (`csv_processing_jobs`, `video_processing_queue`) → downstream tiktok-uploader & video-streaming; external services (Sentry, PostHog, Cloudflare). **C4 context diagram.** | 🟢 Custom |
| 2 | `02-frontend-architecture.md` | Next.js 15 App Router layout; `app/[locale]` routing + i18n (next-intl); components by feature (downloads, search, ArchivedDownloads, LinkHistory, shared); Zustand state (`torrentsStore`, `uploaderStore`, `searchStore`, incl. the `store/` vs `stores/` split); hooks, utils; PWA | 🔵 Upstream |
| 3 | `03-api-routes.md` | All Route Handlers: `torrents`/`usenet`/`webdl` (route/control/download/search/export) proxying the TorBox API, and the custom `csv/*` routes. Endpoint table: method, params, what each calls (TorBox vs Supabase) | mixed |
| 4 | `04-csv-ingestion-pipeline.md` | **Keystone doc:** CSV upload → `process` → job queuing → `process-job/[jobId]` → `job-status/[jobId]` polling → Supabase `csv_processing_jobs` + `video_processing_queue`, and how it seeds the platform. **Sequence diagram.** | 🟢 Custom |
| 5 | `05-integrations.md` | TorBox API integration (API-key auth, endpoints used); Supabase tables/columns this app touches; third-party (Sentry, PostHog) | mixed |
| 6 | `06-deployment-and-infra.md` | Both deploy paths — Cloudflare (`wrangler.jsonc`, OpenNext) and Docker (`Dockerfile`, `docker-compose.yml`, `Makefile`) — env vars (`.env.example`), `next.config.mjs`. Links `DOCKER.md` | mixed |

The keystone is **#4** (CSV→Supabase pipeline) — the depth focus, since it connects this
app to the rest of the platform.

## Conventions for the docs

- **Mermaid diagrams** (context, ingestion sequence) — render on GitHub, plain text for agents.
- Each doc opens with a one-line "what this covers" and links source files by path.
- **Tables** for endpoints, env vars, components, and stores — scannable.
- **🔵 Upstream / 🟢 Custom** tags throughout.
- **Link, don't duplicate:** existing `README.md` and `DOCKER.md` are referenced.
- Grounded in **current code**; the stack is primarily JavaScript (`.js`/`.mjs`) with some
  TypeScript config (Sentry, `next-env.d.ts`).

## Sources of truth (used while writing)

- The codebase (`src/`, config files) — primary.
- Supabase table/column usage is **derived from this app's own queries** (the `migrations/`
  folder is empty and live Supabase access is restricted).
- `README.md` (upstream) and `DOCKER.md` for context.

## Out of scope

- Internals of the other system repos (tiktok-uploader, video-streaming) and the TorBox
  service itself — described only at this app's boundary.
- Any code changes to the app. This effort produces documentation only.
- Rewriting existing docs; they are linked or left as-is.
- A full upstream-vs-fork diff; the docs tag what is custom but do not enumerate every
  upstream line changed.

## Success criteria

- A reader (human or agent) can, from `docs/architecture/`, answer: what this app is,
  what's upstream vs custom, how the TorBox-proxying routes work, how the CSV ingestion
  pipeline feeds Supabase and the wider platform, and how it deploys — without reading the
  source first.
- Every Route Handler, env var, and external integration is listed with its source file.
- All diagrams render and reflect the current code.
