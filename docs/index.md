# LingoFlow Docs — Navigation Index

> Quick reference for coding agents. All docs are in `/workspaces/lingoFlow/docs/`.

---

## Files

| File | Contents |
|---|---|
| [`api-docs.md`](./api-docs.md) | Tech stack versions, API patterns, library references |
| [`e2e-testing.md`](./e2e-testing.md) | Playwright config, Page Object Model, fixtures, `data-testid` reference |
| [`project-docs.md`](./project-docs.md) | Architecture, directory layout, build/test commands, design decisions |

---

## api-docs.md — Sections

| Section | Relevant Issue(s) |
|---|---|
| Tech Stack Summary | — |
| Next.js App Router Patterns | all |
| REST API Endpoints | all |
| Tags API Contract | — |
| Zod v4 Patterns | — |
| better-sqlite3 / SQLite Patterns | #166 |
| Dependency Injection / Composition Root | #166 |
| TanStack React Query v5 Patterns | #167 |
| Custom Hooks | #163, #167 |
| Transcript Utilities | — |
| File & Data Layout | #165 |
| Testing Patterns | #163, #166 |
| **Data Directory Module** | **#165** |
| **React useReducer Pattern** | **#163** |
| **PostImportTask Plugin System** | **#164** |
| **DI Containers — createContainer / getContainer** | **#166** |
| **React Query — useQueries (Parallel Fetching)** | **#167** |
| **ApiClient Context Pattern** | **#167** |
| TypeScript Types Quick Reference | — |

---

## Open Issues Addressed

| Issue | Title | Key API Patterns |
|---|---|---|
| #163 | Replace useState with useReducer in useImportVideoForm | `useReducer`, discriminated union actions, pure reducer testing |
| #164 | PostImportTask plugin system on VideoService | `PostImportTask` interface, `registerPostImportTask`, `drainPostImportTasks` |
| #165 | Extract getDataDir() to data-dir.ts | `getDataDir`, `getTranscriptsDir`, `getVideosDir`, `getThumbnailsDir`, `getDbPath` |
| #166 | Export createContainer/getContainer for per-test DI | `createContainer`, `getContainer`, `Database(':memory:')`, `jest.spyOn` |
| #167 | FetchApiClient + usePlayerData unified data-fetching | `useQueries`, `ApiClient` interface, `ApiClientProvider`, `usePlayerData` |

---

## Stack Versions (from package.json)

| Library | Version |
|---|---|
| Next.js | 16.2.3 |
| React | 19.2.4 |
| TypeScript | ^5 |
| TanStack React Query | ^5.96.2 |
| better-sqlite3 | ^12.8.0 |
| Zod | ^4.3.6 |
| Jest | ^30.3.0 |
| Playwright | ^1.59.1 |
| Tailwind CSS | ^3.4.19 |
