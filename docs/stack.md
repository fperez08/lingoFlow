# LingoFlow — Tech Stack

> Current dependency versions from `package.json`. Last refreshed from source.

---

## Runtime & Language

| Technology | Version | Notes |
|---|---|---|
| Node.js | 24 | Required for native modules |
| TypeScript | ^5 | `strict: true` in `tsconfig.json` |

---

## Framework & UI

| Library | Version | Role |
|---|---|---|
| Next.js | 16.2.3 | App Router, server components, API routes |
| React | 19.2.4 | UI rendering |
| React DOM | 19.2.4 | DOM renderer |
| Tailwind CSS | ^3.4.19 | Utility-first styling |
| PostCSS | ^8.5.9 | CSS processing pipeline |
| Autoprefixer | ^10.4.27 | CSS vendor prefix injection |

---

## Data & State

| Library | Version | Role |
|---|---|---|
| better-sqlite3 | ^12.8.0 | Synchronous SQLite — native Node addon |
| TanStack React Query | ^5.96.2 | Server-state cache, mutations, invalidation |
| Zod | ^4.3.6 | Schema validation + TypeScript inference |

> **Native module note:** `better-sqlite3` is a native addon. All routes using it must export `runtime = 'nodejs'`. `pnpm-workspace.yaml` sets `allowBuilds: { better-sqlite3: true }`.

---

## Media Processing

| Library | Version | Role |
|---|---|---|
| fluent-ffmpeg | ^2.1.3 | FFmpeg wrapper — thumbnail extraction |
| @ffmpeg-installer/ffmpeg | ^1.1.0 | Bundles ffmpeg binary for the current platform |

---

## Testing

| Library | Version | Role |
|---|---|---|
| Jest | ^30.3.0 | Unit and component test runner |
| jest-environment-jsdom | ^30.3.0 | DOM environment for component tests |
| ts-jest | ^29.4.9 | TypeScript transform for Jest |
| @testing-library/react | ^16.3.2 | React component testing utilities |
| @testing-library/dom | ^10.4.1 | DOM query utilities |
| @testing-library/jest-dom | ^6.9.1 | Custom Jest matchers for DOM |
| @playwright/test | ^1.59.1 | E2E browser testing (Chromium) |
| playwright-ctrf-json-reporter | ^0.0.29 | CTRF JSON test report for Playwright |

---

## Tooling & DX

| Tool | Version | Role |
|---|---|---|
| ESLint | ^9 | Linting (next config) |
| eslint-config-next | 16.2.3 | Next.js ESLint ruleset |
| ts-node | ^10.9.2 | TypeScript script execution |
| pnpm | workspace | Package manager (**only** supported manager) |

---

## Key Architecture Decisions

| Decision | Rationale |
|---|---|
| Local-first, no backend auth | Single-user app; all data stays on developer's machine |
| SQLite via better-sqlite3 | Zero-infrastructure persistence; sync API simplifies route handlers |
| App Router + Node runtime | Native module (SQLite) requires Node.js; Edge runtime unsupported |
| TanStack Query for client state | Automatic cache invalidation after mutations; avoids prop-drilling |
| Zod v4 for validation | Type inference + runtime validation in one library; note `.issues` not `.errors` |
| pnpm workspaces | Faster installs, strict dependency isolation; `pnpm-lock.yaml` is authoritative |

---

## Build & Validation Commands

```bash
pnpm install          # install / sync dependencies
pnpm build            # production build — validates TypeScript (must pass)
pnpm dev              # dev server on http://localhost:3000
pnpm test             # Jest unit tests
pnpm test:e2e         # Playwright E2E (auto-starts dev server)
pnpm lint             # ESLint (pre-existing failures in test files; not a CI gate)
```

---

## Data Directory Layout

```
.lingoflow-data/          # default; override with LINGOFLOW_DATA_DIR env var
  lingoflow.db            # SQLite database
  transcripts/            # transcript files (<id>.<srt|vtt|txt>)
  videos/                 # local video files (<id>.<mp4|webm|mov>)
  thumbnails/             # JPEG thumbnails (<id>.jpg)
```

---

## CI Pipeline (`.github/workflows/e2e.yml`)

Triggers on **push to `main`** only (post-merge).

1. `pnpm install --frozen-lockfile`
2. `pnpm test` (Jest)
3. `pnpm test:e2e` (Playwright, Chromium)

No lint step in CI.
