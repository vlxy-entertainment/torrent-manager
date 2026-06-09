# 02 – Frontend Architecture

Covers the Next.js 15 App Router structure, i18n setup, component tree, Zustand stores, and hooks for the torbox-app UI. Most of the UI is 🔵 Upstream (original TorBox Manager); the `csv-upload` page is 🟢 Custom.

---

## 1. App Router layout

Root entry: `src/app/layout.js` is a passthrough (`return children`). `src/app/page.tsx` immediately redirects to `/${defaultLocale}` (i.e. `/en`).

All real layout and rendering live under `src/app/[locale]/`.

### `src/app/[locale]/layout.js`

Server component. Validates the locale segment against `routing.locales`; calls `getMessages()` to load translations. Renders the `<html>` shell with:

- Geist Sans + Geist Mono fonts (CSS variables)
- `<link rel="manifest" href="/manifest.json" />` and Apple PWA meta tags
- `<NextIntlClientProvider>` wrapping all children
- `<PostHogProvider>` (from `src/app/[locale]/providers.js`) nested inside
- `<FileHandler />` (shared component for drag-and-drop / file protocol events)

### `src/app/[locale]/providers.js`

Client component. Initialises PostHog via `posthog.init()` and wraps children in `<PHProvider>`. A `SuspendedPostHogPageView` component (Suspense boundary) captures `$pageview` events on every pathname/searchParams change.

### Routes

| Route (under `src/app/[locale]/`) | File | Origin | Description |
|---|---|---|---|
| `/` (home / downloads) | `page.js` | 🔵 Upstream | Loads API key from `localStorage`; renders `<LandingPage>` when no key, otherwise `<Header>` + `<ApiKeyInput>` + `<Downloads>`. Registers the `magnet:` protocol handler and `.torrent`/`.nzb` file handler when running as a PWA. |
| `/csv-upload` | `csv-upload/page.js` | 🟢 Custom | Accepts a CSV file, POSTs it to `/api/csv/process` with the API key in `x-api-key`, then polls `/api/csv/job-status/{jobId}` every 2 s to show progress. Displays per-row results and errors on completion. |
| `/search` | `search/page.js` | 🔵 Upstream | Renders `<SearchBar>` + `<SearchResults>`; search state is managed by `useSearchStore`. |
| `/tools` | `tools/page.js` | 🔵 Upstream | Magnet Hash Extractor — pastes one or more magnet URLs and extracts `btih` hashes, with copy-to-clipboard per hash or all at once. |
| `/link-history` | `link-history/page.js` | 🔵 Upstream | Reads `torboxDownloadHistory` from `localStorage` and renders `<LinkHistory>` with delete support. |
| `/archived` | `archived/page.js` | 🔵 Upstream | Renders `<ArchivedDownloads>` for downloads saved to `torboxArchivedDownloads` in `localStorage`. |

---

## 2. i18n

Library: **next-intl**.

### Configuration

| File | Role |
|---|---|
| `src/i18n/settings.ts` | Defines `locales = ['en', 'es', 'de', 'fr', 'ja']` and `defaultLocale = 'en'` |
| `src/i18n/routing.ts` | Calls `defineRouting({ locales, defaultLocale })` and exports `routing` |
| `src/i18n/request.ts` | `getRequestConfig` — loads `en.json` as the base and deep-merges locale messages on top (falls back to English on load failure) |
| `src/i18n/navigation.ts` | Re-exports locale-aware `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` via `createNavigation(routing)` |
| `src/i18n/messages/` | One JSON file per locale (`en.json`, `es.json`, `de.json`, `fr.json`, `ja.json`) |

### Middleware (`src/middleware.ts`)

Wraps `createMiddleware(routing)` from next-intl. The matcher applies the locale-prefix redirect/rewrite to all paths **except**:

```
/api, /_next, /icons, /favicon.ico, /sitemap.xml, /manifest.json, /images
```

### LanguageSwitcher

`src/components/LanguageSwitcher.js` — client component. Uses `useLocale()` for the active locale and Next.js `useRouter` + `usePathname` to rewrite the URL prefix when the user picks a different language. Shows a flag image per locale (`/images/flags/flag-{locale}.png`).

---

## 3. Components by feature

### Root-level (`src/components/`)

| File | Description |
|---|---|
| `Header.js` | App shell header with navigation links, dark-mode toggle (persisted to `localStorage`), responsive hamburger menu, and `<LanguageSwitcher>`. Uses `useTranslations('Header')`. |
| `LandingPage.js` | Marketing splash shown when no API key is set; contains the `<ApiKeyInput>` prompt. Uses `useTranslations('LandingPage')`. |
| `LanguageSwitcher.js` | Flag-based locale dropdown; replaces the locale prefix in the current path on selection. |
| `icons.js` | Inline SVG icon components (`LinkIcon`, `MagnifyingGlassIcon`, `Hash`, `Upload`, `Copy`, etc.) — no external icon library dependency. |
| `constants.js` | `API_BASE`, `API_SEARCH_BASE`, `API_VERSION`, `TORBOX_MANAGER_VERSION`, `NON_RETRYABLE_ERRORS` map, `COLUMNS` descriptor map, `STATUS_OPTIONS` array used across download tables. |

### `downloads/`

| File / Dir | Description |
|---|---|
| `Downloads.js` | Top-level orchestrator for the downloads tab; delegates to table/card sub-components. |
| `ApiKeyInput.js` | Input + optional key manager toggle for entering/switching API keys. |
| `ApiKeyManager.js` | Multi-key manager (add, remove, switch between stored keys). |
| `ItemsTable.js`, `TableHeader.js`, `TableBody.js` | Resizable-column data table for download items. |
| `ItemRow.js`, `ItemCard.js` | Single-item display in table vs. card mode. |
| `FileList.js`, `FileRow.js` | Expandable file tree within a download item. |
| `DownloadPanel.js` | Side/bottom panel with item details, file list, and actions. |
| `CardList.js` | Card-layout wrapper used on smaller screens. |
| `ItemUploader.js`, `UploadForm.js`, `UploadItemList.js`, `UploadProgress.js` | Torrent/NZB/magnet upload UI and in-progress display. |
| `ItemActions.js`, `ItemActionButtons.js` | Action buttons (download link, delete, archive, etc.) per item. |
| `MoreOptionsDropdown.js` | Overflow dropdown for less-common item actions. |
| `DownloadStateBadge.js` | Coloured pill badge for download state labels. |
| `SpeedChart.js` | Real-time download/upload speed sparkline chart. |
| `AutomationRules.js` | UI for configuring automation rules on downloads. |
| `ColumnManager.js`, `ResizableColumn.js` | Column visibility picker and drag-resize handle. |
| `TorrentOptions.js` | Torrent-specific seeding/queuing options form. |
| `ActionBar/` | Compound component: `index.js` composes `ActionButtons`, `SearchBar`, `StatusSection`, `ViewControls`; internal hook `useStatusCounts.js` aggregates counts by status; `statusHelpers.js` maps state values. |
| `utils/formatters.js` | Formatting helpers for sizes, speeds, ETAs, dates. |

### `search/`

| File | Description |
|---|---|
| `SearchBar.js` | Controlled input that writes query to `useSearchStore`; includes torrent/usenet type toggle and custom-engines checkbox. |
| `SearchResults.js` | Renders the search result list from `useSearchStore`; handles loading/empty/error states. |

### `shared/`

| File | Description |
|---|---|
| `FileHandler.tsx` | Listens for `fileReceived` custom events and drag-drop on the document; dispatches files to the uploader. Mounted at the layout level. |
| `AssetTypeTabs.js` | Tab strip for switching between Torrents / Usenet / Web DL. |
| `ConfirmButton.js` | Button with inline confirmation step before destructive action. |
| `DropZone.js` | Drag-and-drop file zone overlay. |
| `Dropdown.js` | Generic accessible dropdown menu. |
| `Spinner.js` | Loading spinner (`size` prop). |
| `StatusFilterDropdown.js` | Dropdown filter that maps to `STATUS_OPTIONS` from constants. |
| `Toast.js` | Transient notification toast. |
| `Tooltip.js` | Hover tooltip wrapper. |
| `hooks/useUpload.js` | Upload orchestration: validates files/links, calls the TorBox API, updates `useUploaderStore`. |
| `hooks/useDownloads.js` | Fetches the downloads list, refreshes on interval, populates `useTorrentsStore`. |
| `hooks/useFetchData.js` | Generic polling/fetching primitive used by `useDownloads`. |
| `hooks/useDelete.js` | Delete single / bulk items with optimistic UI. |
| `hooks/useFilter.js` | Client-side status/search filter over the downloads list. |
| `hooks/useSort.js` | Sort state + comparator for the downloads table. |
| `hooks/useSelection.js` | Multi-row checkbox selection state. |
| `hooks/useColumnManager.js` | Persist visible column set to `localStorage`. |
| `hooks/useAutomationRules.js` | CRUD for automation rules persisted to `localStorage`. |
| `hooks/useSpeedData.js` | Collects speed samples over time for the `SpeedChart`. |

### `ArchivedDownloads/`

| File | Description |
|---|---|
| `index.js` | Lists archived downloads from `localStorage`; supports restore (re-uploads as magnet) and delete via `useArchive`. |

### `LinkHistory/`

| File | Description |
|---|---|
| `index.js` | Renders the generated download-link history list; each entry shows URL, name, timestamp, and a delete button. |

---

## 4. State (Zustand)

> **Directory note:** stores are split across two directories — `src/store/` (singular, two files) and `src/stores/` (plural, one file). This is a historical artifact with no functional difference; both are plain Zustand `create()` calls and are imported directly by path.

| Store | Source | Responsibility |
|---|---|---|
| `useTorrentsStore` | `src/store/torrentsStore.js` | Holds the full list of loaded torrents (`torrents[]`) and exposes `setTorrents` and `getTorrentByHash(hash)` for cross-page torrent lookups (e.g., the csv-upload page previously read from this store; it now fetches server-side, but the store still serves the home-page downloads list). |
| `useUploaderStore` | `src/store/uploaderStore.js` | Manages the upload queue: pending `items[]`, `isUploading` flag, `progress` counters, and per-item status updates (`updateItemStatus`). Drives the upload form and progress display. |
| `useSearchStore` | `src/stores/searchStore.js` | Owns search UX state: `query`, `results`, `loading`, `error`, `searchType` (`'torrents'` | `'usenet'`), `includeCustomEngines`. Calls the appropriate `/api/torrents/search` or `/api/usenet/search` endpoint directly from within the store action `fetchResults`. |

---

## 5. Hooks (`src/hooks/`)

| File | Description |
|---|---|
| `useFileHandler.js` | JS version — subscribes to the `fileReceived` custom window event and calls `onFileReceived(event.detail)` on each dispatch. Used by the home page to relay PWA file-handler / drag-drop files to the uploader. |
| `useFileHandler.ts` | TypeScript version of the same hook with typed `FileReceivedEvent` interface. Both files export the same function signature; the `.ts` version is the authoritative typed form. |
| `useArchive.js` | CRUD over `torboxArchivedDownloads` in `localStorage`; `restoreFromArchive` reconstructs a magnet URI and calls `useUpload.uploadItem()` to re-add the torrent. |
| `useColumnWidths.js` | Persists per-column drag widths to `localStorage` keyed by `{activeType}-column-widths`; enforces a `DEFAULT_MIN_WIDTH = 60` px floor. |
| `useIsMobile.js` | Tracks `window.innerWidth < 768` via a `resize` listener; returns a boolean `isMobile`. |

---

## 6. PWA

`next-pwa` is configured in `next.config.mjs`:

```js
withPWA({
  dest: 'public',   // sw.js + workbox chunks written to /public
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})
```

The service worker is disabled in development and enabled in production. The generated `public/sw.js` and workbox runtime chunks handle asset pre-caching and offline support.

**Manifest** (`public/manifest.json`):

- `display: "standalone"`, `start_url: "/"`, `theme_color: "#000000"`
- Icon set from 48 × 48 to 512 × 512 (sourced from `public/icons/`)
- `file_handlers` — registers `.torrent` and `.nzb` file associations; the home page `useEffect` reads from `window.launchQueue` to receive those files
- `protocol_handlers` — registers `magnet:` → `/?magnet=%s`

**Layout meta** (`src/app/[locale]/layout.js`):

- `<link rel="manifest" href="/manifest.json" />`
- `<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />`
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
- `<meta name="theme-color" content="#000000" />`
