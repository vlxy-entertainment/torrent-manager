# 05 — Integrations

Covers every external service this app depends on: the upstream TorBox APIs and the custom additions (Supabase, image upload, Sentry, PostHog).

Legend: 🔵 Upstream (unchanged from TorBox Manager) · 🟢 Custom (added for this fork)

---

## 1. TorBox API 🔵

**Source:** [`src/components/constants.js`](../../src/components/constants.js)

### Base URLs and version

| Constant          | Value                          | Used for                  |
|-------------------|--------------------------------|---------------------------|
| `API_BASE`        | `https://api.torbox.app`       | All data + control calls  |
| `API_SEARCH_BASE` | `https://search-api.torbox.app`| Torrent / Usenet search   |
| `API_VERSION`     | `v1`                           | Path prefix on every call |

All data-plane requests are prefixed `${API_BASE}/${API_VERSION}/api/...`.

### Authentication

Every proxied request adds `Authorization: Bearer <apiKey>`.  
The key originates in the browser (localStorage) and is forwarded to Next.js proxy routes via the `x-api-key` request header; the proxy then inserts it as the Bearer token before calling TorBox. The key is never stored server-side.

See [03-api-routes.md](03-api-routes.md) for the full proxy-route inventory.

### Key endpoints per asset type

| Asset type | Operation  | TorBox endpoint                                   |
|------------|------------|---------------------------------------------------|
| Torrents   | List       | `GET /api/torrents/mylist`                        |
| Torrents   | Create     | `POST /api/torrents/createtorrent`                |
| Torrents   | Control    | `POST /api/torrents/controltorrent`               |
| Torrents   | Download   | `GET /api/torrents/requestdl`                     |
| Torrents   | Export     | `GET /api/torrents/exportdata`                    |
| Torrents   | Queued     | `GET /api/queued/getqueued?type=torrent`          |
| Torrents   | Ctrl queue | `POST /api/queued/controlqueued`                  |
| Torrents   | Search     | `GET <SEARCH_BASE>/torrents/search/<query>`       |
| Torrents   | IMDB srch  | `GET <SEARCH_BASE>/torrents/imdb:<id>`            |
| Web DL     | List       | `GET /api/webdl/mylist`                           |
| Web DL     | Create     | `POST /api/webdl/createwebdownload`               |
| Web DL     | Control    | `POST /api/webdl/controlwebdownload`              |
| Web DL     | Download   | `GET /api/webdl/requestdl`                        |
| Web DL     | Queued     | `GET /api/queued/getqueued?type=webdl`            |
| Usenet     | List       | `GET /api/usenet/mylist`                          |
| Usenet     | Create     | `POST /api/usenet/createusenetdownload`           |
| Usenet     | Control    | `POST /api/usenet/controlusenetdownload`          |
| Usenet     | Download   | `GET /api/usenet/requestdl`                       |
| Usenet     | Queued     | `GET /api/queued/getqueued?type=usenet`           |
| Usenet     | Search     | `GET <SEARCH_BASE>/usenet/search/<query>`         |
| Usenet     | IMDB srch  | `GET <SEARCH_BASE>/usenet/imdb:<id>`              |

---

## 2. Supabase 🟢

**Sources:**
- [`src/utils/supabase/server.js`](../../src/utils/supabase/server.js) — client factory
- [`src/utils/supabase/index.js`](../../src/utils/supabase/index.js) — public barrel

### Client factory

`createSupabaseServerClient()` constructs a raw `@supabase/supabase-js` client using two environment variables:

| Variable                   | Role                                           |
|----------------------------|------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (safe to expose)                   |
| `SUPABASE_SECRET_KEY`      | **Service-role secret** — admin, server-only   |

Auth options disable session management, appropriate for server-to-server use:

```js
auth: { autoRefreshToken: false, persistSession: false }
```

The barrel `src/utils/supabase/index.js` re-exports the factory as `createSupabaseClient` for convenience — all call sites import from `@/utils/supabase`.

**Security:** `SUPABASE_SECRET_KEY` is the service-role key. It bypasses row-level security. It must never be sent to the browser or included in any client bundle.

### Tables touched

| Table                   | Operations         | Where                                        |
|-------------------------|--------------------|----------------------------------------------|
| `csv_processing_jobs`   | SELECT, UPDATE     | `src/app/api/csv/process-job/[jobId]/route.js` |
| `video_processing_queue`| INSERT             | `src/app/api/csv/process-job/[jobId]/route.js` |

All Supabase access is confined to server-side API routes. See [04-csv-ingestion-pipeline.md](04-csv-ingestion-pipeline.md) for the full data flow.

---

## 3. Image Upload Service 🟢

**Source:** [`src/app/api/csv/process-job/[jobId]/route.js`](../../src/app/api/csv/process-job/[jobId]/route.js)

### Configuration

| Variable               | Purpose                          |
|------------------------|----------------------------------|
| `IMAGE_UPLOAD_ENDPOINT`| Base URL of the upload service   |

### Contract

```
POST ${IMAGE_UPLOAD_ENDPOINT}/api/upload/tiktok
Content-Type: multipart/form-data

Body field: file  (image blob — JPEG, PNG, GIF, or WebP)
```

**Response:**

```json
{ "success": true, "url": "https://..." }
```

On success `url` is stored as `thumbnail_url` in `video_processing_queue`. If the upload fails the row is still inserted with `thumbnail_url: null`; the failure is logged as a per-row warning, not a fatal error.

Before upload the route validates image content by inspecting magic bytes (FF D8 FF for JPEG, 89 50 4E 47 for PNG, 47 49 46 38 for GIF, RIFF…WEBP for WebP). Files that fail validation are skipped without upload.

---

## 4. Sentry 🟢

**Sources:**
- [`sentry.client.config.ts`](../../sentry.client.config.ts)
- [`sentry.server.config.ts`](../../sentry.server.config.ts)
- [`sentry.edge.config.ts`](../../sentry.edge.config.ts)

### DSN and org

```
DSN: https://7350595443a6a2817f8f7a54ff6ebf6b@o4508884378714112.ingest.de.sentry.io/4508884380024912
Org ID: o4508884378714112  (EU ingest — ingest.de.sentry.io)
Project ID: 4508884380024912
```

### Per-runtime configuration

| Setting                    | Client       | Server | Edge  |
|----------------------------|:------------:|:------:|:-----:|
| `tracesSampleRate`         | `1`          | `1`    | `1`   |
| `replaysSessionSampleRate` | `0.1`        | —      | —     |
| `replaysOnErrorSampleRate` | `1.0`        | —      | —     |
| `replayIntegration`        | yes          | —      | —     |
| `debug`                    | `false`      | `false`| `false`|

All three runtimes share the same DSN. Session Replay is client-only; server and edge configs are minimal (traces + error capture). `tracesSampleRate: 1` means 100% of traces are sent — appropriate for low-traffic use but should be reduced for high volume.

---

## 5. PostHog 🟢

**Sources:**
- [`src/app/[locale]/providers.js`](../../src/app/[locale]/providers.js) — initialization and page-view capture
- [`src/utils/sa.js`](../../src/utils/sa.js) — `phEvent` helper

### Initialization

`PostHogProvider` (a `'use client'` component wrapping the app tree) calls `posthog.init()` on mount:

| Option             | Value / Source                                           |
|--------------------|----------------------------------------------------------|
| Key                | `process.env.NEXT_PUBLIC_POSTHOG_KEY`                   |
| `api_host`         | `NEXT_PUBLIC_POSTHOG_HOST` or `https://us.i.posthog.com`|
| `person_profiles`  | `'identified_only'` — no anonymous profile creation      |
| `capture_pageview` | `false` — automatic pageview capture is disabled         |

### Manual pageview capture

`PostHogPageView` (wrapped in `<Suspense>`) fires `posthog.capture('$pageview', { $current_url })` whenever `pathname` or `searchParams` changes. This replaces the disabled automatic capture and correctly handles Next.js client-side navigation.

### `phEvent` helper

```js
// src/utils/sa.js
export const phEvent = (eventName, optionalProps = {}) => {
  if (process.env.NODE_ENV !== 'production') return;
  if (posthog) {
    posthog.capture(eventName, optionalProps);
  }
};
```

The guard `process.env.NODE_ENV !== 'production'` is a **no-op early return** — events are captured only in production. Development and test environments emit nothing, preventing noise in the PostHog dashboard.
