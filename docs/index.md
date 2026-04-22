# LingoFlow Docs — Navigation Index

> Agent reference. All docs in `/workspaces/lingoFlow/docs/`. No duplicate files — one file per topic.

---

## Project Docs (codebase-specific)

| File | Contents |
|---|---|
| [`project-overview.md`](./project-overview.md) | What LingoFlow does, quick start, tech stack, module ownership, runtime behavior |
| [`architecture.md`](./architecture.md) | App Router layout, DI/composition root, data flow, component hierarchy, hook inventory, testing conventions |
| [`project-docs.md`](./project-docs.md) | Full snapshot: file tree, tech stack, player structure, all API routes, data model, DI, commands, CI |
| [`stack.md`](./stack.md) | All dependencies + versions, architecture decisions, build commands, CI pipeline |
| [`components.md`](./components.md) | Every React component in `src/components/`: purpose, props, `data-testid` map, z-index layering |
| [`player-architecture.md`](./player-architecture.md) | Player component tree, seek flow, transport controls, `data-testid` map, test patterns |
| [`api.md`](./api.md) | REST endpoints, types, service interfaces, DB schema, `ApiClient`, `VocabStore`, vocabulary endpoints |
| [`api-docs.md`](./api-docs.md) | Codebase patterns: App Router gotchas, Tags API contract, Zod v4, SQLite, DI, React Query v5, hooks, transcripts, Tailwind design system |
| [`e2e-testing.md`](./e2e-testing.md) | Playwright config, Page Object Model, fixtures, `data-testid` reference |
| [`API_DOCS_STATUS.md`](./API_DOCS_STATUS.md) | Chub-registry fetch status: what was fetched, version pins, coverage gaps |

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
| Dependency Injection / Composition Root | imports from `@/lib/server/composition` |
| TanStack React Query v5 Patterns | `useQuery`, `useMutation`, `useQueries` |
| Custom Hooks | `useVideos`, `useVideoMutations`, `useImportVideoForm`, `usePlayerData`, `useVocabulary`, `useUpdateWordStatus` |
| Transcript Utilities | parse, detect, tokenize, file I/O |
| File & Data Layout | `.lingoflow-data/` structure |
| Testing Patterns | API routes, component tests, mocking, `fetch` |
| React 19 Component Patterns | Server/client directive, hooks, `useRef`, `useReducer` |
| Tailwind CSS Design System | Color tokens, typography, media controls, mini-player layout |
| TypeScript Types Quick Reference | `Video`, `TranscriptCue`, `TranscriptToken`, `VocabEntry` |

---

## External API References (framework guides)

| File | Contents |
|---|---|
| [`api-nextjs-core.md`](./api-nextjs-core.md) | Next.js 16 App Router — install, routes, server components, env vars |
| [`api-react-core.md`](./api-react-core.md) | React 19 — components, hooks, rendering |
| [`api-typescript.md`](./api-typescript.md) | TypeScript — `tsconfig`, `tsc` CLI, type-checking |
| [`api-jest.md`](./api-jest.md) | Jest 30 — testing framework guide |
| [`api-playwright-core.md`](./api-playwright-core.md) | Playwright 1.59 — browser automation, test execution, assertions |
| [`api-tailwindcss-core.md`](./api-tailwindcss-core.md) | Tailwind CSS 3 — utility classes, config |
| [`api-eslint-nextjs.md`](./api-eslint-nextjs.md) | ESLint for Next.js — `eslint-config-next` flat config, Core Web Vitals rules |
| [`tailwind-eslint.md`](./tailwind-eslint.md) | `eslint-plugin-tailwindcss` — install, flat config, class-ordering rules |

---

## Stack Versions (from package.json)

> See [`stack.md`](./stack.md) for full detail.

| Library | Version |
|---|---|
| Next.js | 16.2.3 |
| React | 19.2.4 |
| TypeScript | ^5 |
| TanStack React Query | ^5.96.2 |
| better-sqlite3 | ^12.8.0 |
| Zod | ^4.3.6 |
| fluent-ffmpeg | ^2.1.3 |
| @ffmpeg-installer/ffmpeg | ^1.1.0 |
| Jest | ^30.3.0 |
| Playwright | ^1.59.1 |
| Tailwind CSS | ^3.4.19 |
