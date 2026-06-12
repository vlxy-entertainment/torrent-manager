# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

torbox-app is the operator ingestion entry point for the VLXY platform: a Next.js 15 app (React 19, Zustand, Docker on port 4000) for managing TorBox downloads and batch-uploading CSVs of video metadata + torrent hashes into the shared `video_processing_queue`. Full system context: `../vlxy-docs/`.

## Workflow

This repo follows the VLXY workflow standard (`../vlxy-docs/docs/workflow.md`; summary in `../CLAUDE.md`).

- **Branch:** `main`.
- **Test runner:** none yet. **Bootstrap-then-enforce:** the first task touching testable logic (a hook, store, util, or API route) must stand up Vitest — config, one passing smoke test, and `test` / `test:coverage` scripts — before the feature work, then replace this line with the real test command.
- **Quality gate today:** `npm run lint`.
- **TDD:** mandatory for hooks, Zustand stores, utils, API route handlers, and data transforms; bug fixes start with a failing regression test. Pure styling/markup is exempt. Real red → green → refactor.
- **Docs:** update this repo's docs on any contract/command change; update `vlxy-docs` per the standard's trigger table (e.g. CSV columns, the `IMAGE_UPLOAD_ENDPOINT` env var, or queue-writing behavior).
