# 03 — API Route Handlers

Covers every Next.js route handler under `src/app/api/`, their HTTP methods, query/body parameters, and downstream calls. Upstream proxy routes forward requests to TorBox; csv routes write to Supabase.

---

## 1. Auth & Base URLs

Defined in [`src/components/constants.js`](../../src/components/constants.js):

| Constant | Value |
|---|---|
| `API_BASE` | `https://api.torbox.app` |
| `API_SEARCH_BASE` | `https://search-api.torbox.app` |
| `API_VERSION` | `v1` |

**Key-forwarding pattern.** The browser stores the user's TorBox API key in `localStorage` and sends it on every request as the `x-api-key` request header. Each proxy route handler reads it from `headers().get('x-api-key')` (or `request.headers.get('x-api-key')`) and forwards it to TorBox as `Authorization: Bearer <key>`. The key never lives in server-side config — it originates in the browser and is echoed through.

All proxy calls also include `User-Agent: TorBoxManager/1.0`.

---

## 2. Endpoint Reference

### 🔵 Torrents

| Method | App Path | File | Reads (headers / params / body) | Calls (TorBox) |
|---|---|---|---|---|
| GET | `/api/torrents` | [`src/app/api/torrents/route.js`](../../src/app/api/torrents/route.js) | `x-api-key`, `bypass-cache` header | `GET ${API_BASE}/v1/api/torrents/mylist?limit=10000` + `GET ${API_BASE}/v1/api/queued/getqueued?type=torrent` (parallel); merges both arrays |
| POST | `/api/torrents` | same | `x-api-key`, multipart `formData` | `POST ${API_BASE}/v1/api/torrents/createtorrent` |
| DELETE | `/api/torrents` | same | `x-api-key`, JSON body `{ id }` | `POST ${API_BASE}/v1/api/torrents/controltorrent` with `{ torrent_id: id, operation: "delete" }` |
| GET | `/api/torrents/download` | [`src/app/api/torrents/download/route.js`](../../src/app/api/torrents/download/route.js) | `x-api-key`, query `torrent_id` (required), `file_id`, `zip_link` | `GET ${API_BASE}/v1/api/torrents/requestdl?token=…&torrent_id=…[&file_id=…][&zip_link=…]` |
| POST | `/api/torrents/control` | [`src/app/api/torrents/control/route.js`](../../src/app/api/torrents/control/route.js) | `x-api-key`, JSON body `{ torrent_id, operation }` | `POST ${API_BASE}/v1/api/torrents/controltorrent` |
| POST | `/api/torrents/controlqueued` | [`src/app/api/torrents/controlqueued/route.js`](../../src/app/api/torrents/controlqueued/route.js) | `x-api-key`, JSON body `{ queued_id, operation, type }` | `POST ${API_BASE}/v1/api/queued/controlqueued` |
| GET | `/api/torrents/search` | [`src/app/api/torrents/search/route.js`](../../src/app/api/torrents/search/route.js) | `x-api-key`, query `query` (URL-encoded), `search_user_engines` | Regular: `GET ${API_SEARCH_BASE}/torrents/search/<query>?metadata=true&check_cache=true&search_user_engines=…`; IMDB prefix (`imdb:<id>`): `GET ${API_SEARCH_BASE}/torrents/imdb:<id>?…` |
| GET | `/api/torrents/export` | [`src/app/api/torrents/export/route.js`](../../src/app/api/torrents/export/route.js) | `x-api-key` (header or `api_key` query param), `torrent_id` (required), `type` (`magnet` or `torrent`) | `GET ${API_BASE}/v1/api/torrents/exportdata?torrent_id=…&type=…`; returns JSON for magnet, streams `.torrent` binary for torrent |

---

### 🔵 Usenet

| Method | App Path | File | Reads | Calls (TorBox) |
|---|---|---|---|---|
| GET | `/api/usenet` | [`src/app/api/usenet/route.js`](../../src/app/api/usenet/route.js) | `x-api-key`, `bypass-cache` header | `GET ${API_BASE}/v1/api/usenet/mylist` + `GET ${API_BASE}/v1/api/queued/getqueued?type=usenet` (parallel); merges both arrays |
| POST | `/api/usenet` | same | `x-api-key`, multipart `formData` | `POST ${API_BASE}/v1/api/usenet/createusenetdownload` |
| DELETE | `/api/usenet` | same | `x-api-key`, JSON body `{ id }` | `POST ${API_BASE}/v1/api/usenet/controlusenetdownload` with `{ usenet_id: id, operation: "delete" }` |
| GET | `/api/usenet/download` | [`src/app/api/usenet/download/route.js`](../../src/app/api/usenet/download/route.js) | `x-api-key`, query `usenet_id` (required), `file_id`, `zip_link` | `GET ${API_BASE}/v1/api/usenet/requestdl?token=…&usenet_id=…[&file_id=…][&zip_link=…]` |
| POST | `/api/usenet/control` | [`src/app/api/usenet/control/route.js`](../../src/app/api/usenet/control/route.js) | JSON body `{ apiKey, action, id }` (key in body, not header) | `POST ${API_BASE}/v1/api/usenet/controlusenetdownload` with `{ usenet_id: id, operation: action }` |
| GET | `/api/usenet/search` | [`src/app/api/usenet/search/route.js`](../../src/app/api/usenet/search/route.js) | `x-api-key`, query `query`, `search_user_engines` | Regular: `GET ${API_SEARCH_BASE}/usenet/search/<query>?metadata=true&check_cache=true&search_user_engines=…`; IMDB prefix: `GET ${API_SEARCH_BASE}/usenet/imdb:<id>?…` |

---

### 🔵 Web Downloads (webdl)

| Method | App Path | File | Reads | Calls (TorBox) |
|---|---|---|---|---|
| GET | `/api/webdl` | [`src/app/api/webdl/route.js`](../../src/app/api/webdl/route.js) | `x-api-key`, `bypass-cache` header | `GET ${API_BASE}/v1/api/webdl/mylist` + `GET ${API_BASE}/v1/api/queued/getqueued?type=webdl` (parallel); merges both arrays |
| POST | `/api/webdl` | same | `x-api-key`, multipart `formData` | `POST ${API_BASE}/v1/api/webdl/createwebdownload` |
| DELETE | `/api/webdl` | same | `x-api-key`, JSON body `{ id }` | `POST ${API_BASE}/v1/api/webdl/controlwebdownload` with `{ webdl_id: id, operation: "delete" }` |
| GET | `/api/webdl/download` | [`src/app/api/webdl/download/route.js`](../../src/app/api/webdl/download/route.js) | `x-api-key`, query `web_id` (required), `file_id`, `zip_link` | `GET ${API_BASE}/v1/api/webdl/requestdl?token=…&web_id=…[&file_id=…][&zip_link=…]` |
| POST | `/api/webdl/control` | [`src/app/api/webdl/control/route.js`](../../src/app/api/webdl/control/route.js) | JSON body `{ apiKey, action, id }` (key in body, not header) | `POST ${API_BASE}/v1/api/webdl/controlwebdownload` with `{ web_id: id, operation: action }` |

---

### 🟢 CSV Ingestion

These are the only routes that touch Supabase. See [`04-csv-ingestion-pipeline.md`](./04-csv-ingestion-pipeline.md) for the full deep dive.

| Method | App Path | File | Reads | Calls (Supabase) |
|---|---|---|---|---|
| POST | `/api/csv/process` | [`src/app/api/csv/process/route.js`](../../src/app/api/csv/process/route.js) | `x-api-key` header, multipart `file` (CSV) | Inserts one row into `csv_processing_jobs` (`status: "pending"`, stores raw CSV text and API key); fires a non-blocking background fetch to `/api/csv/process-job/<jobId>`; returns `{ jobId, status: "queued", totalRows }` |
| POST | `/api/csv/process-job/[jobId]` | [`src/app/api/csv/process-job/[jobId]/route.js`](../../src/app/api/csv/process-job/%5BjobId%5D/route.js) | URL param `jobId` | Reads job from `csv_processing_jobs`; fetches live torrent list via internal `/api/torrents`; parses CSV rows; for each row inserts into `video_processing_queue` (with resolved `torrent_id`, `file_id`, thumbnail URL); writes progress back to `csv_processing_jobs`; updates final `status` to `completed` or `failed` |
| GET | `/api/csv/job-status/[jobId]` | [`src/app/api/csv/job-status/[jobId]/route.js`](../../src/app/api/csv/job-status/%5BjobId%5D/route.js) | URL param `jobId` | SELECT from `csv_processing_jobs` where `id = jobId`; returns `{ id, status, totalRows, processedRows, progress, results, errors, createdAt, updatedAt }` |

---

## 3. Patterns & Notes

**Thin proxy pattern.** Every torrents/usenet/webdl GET handler makes two parallel TorBox fetches — one to the asset-type `mylist` endpoint and one to `queued/getqueued?type=<assetType>` — and merges the results into a single `{ success, data[] }` response. This gives the client a unified list that includes both active and queued items without needing to call two endpoints.

**Auth inconsistency in control routes.** The `usenet/control` and `webdl/control` handlers read `apiKey` from the JSON request body (`{ apiKey, action, id }`) rather than from the `x-api-key` header. All other proxy routes use the header. Callers must match the expected shape.

**CSV routes are the only Supabase writers.** No torrents/usenet/webdl route touches a database. The csv routes use `createSupabaseClient()` from `src/utils/supabase/` (`index.js` → `server.js`) and write to two tables: `csv_processing_jobs` (job metadata + raw CSV) and `video_processing_queue` (one row per successfully matched torrent/file pair).
