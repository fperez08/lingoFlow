# LingoFlow Docs — Navigation Index

> Quick reference for coding agents. All docs are in `/workspaces/lingoFlow/docs/`.

---

## Files

| File | Contents |
|---|---|
| [`architecture.md`](./architecture.md) | **Architecture reference** — App Router layout, DI/composition root, data flow, component hierarchy, hook inventory, testing conventions |
| [`player-architecture.md`](./player-architecture.md) | **Player & mini-player reference** — component tree, seek flow, transport controls, `data-testid` map, test patterns |
| [`api-reference.md`](./api-reference.md) | **Canonical API reference** — all REST endpoints, types, service interfaces, DB schema, library patterns |
| [`api.md`](./api.md) | Extended API reference — includes `ApiClient`, `usePlayerData`, `VocabStore`, vocabulary endpoints |
| [`api-docs.md`](./api-docs.md) | Patterns for UI development — React 19, Tailwind design system, hooks, testing, media controls |
| [`e2e-testing.md`](./e2e-testing.md) | Playwright config, Page Object Model, fixtures, `data-testid` reference |
| [`project-docs.md`](./project-docs.md) | Architecture, directory layout, build/test commands, design decisions |

---

## api-docs.md — Sections

| Section | Notes |
|---|---|
| Tech Stack Summary | All versions |
| Next.js App Router Patterns | params awaiting, response helpers |
| REST API Endpoints | All routes |
| Tags API Contract | ⚠️ format differs between import/update |
| Zod v4 Patterns | `.issues` not `.errors` |
| better-sqlite3 / SQLite Patterns | Sync calls, WAL, migration |
| Dependency Injection / Composition Root | `getContainer()`, `createContainer(':memory:')` |
| TanStack React Query v5 Patterns | `useQuery`, `useMutation`, `useQueries` |
| Custom Hooks | `useVideos`, `useVideoMutations`, `useImportVideoForm`, `usePlayerData`, `useVocabulary`, `useUpdateWordStatus` |
| Transcript Utilities | parse, detect, tokenize, file I/O |
| File & Data Layout | `.lingoflow-data/` structure |
| Testing Patterns | API routes, component tests, mocking, `fetch` |
| React 19 Component Patterns | Server/client directive, hooks, `useRef`, `useReducer` |
| Tailwind CSS Design System | Color tokens, typography, media controls, mini-player layout |
| TypeScript Types Quick Reference | `Video`, `TranscriptCue`, `TranscriptToken`, `VocabEntry` |

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
