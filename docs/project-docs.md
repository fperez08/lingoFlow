# LingoFlow — Project Documentation Snapshot

> **Purpose**: Reference for coding agents. Describes current implemented state only — not aspirational.
> **Last updated**: auto-generated snapshot (2026-07, HEAD: main).

---

## 1. File Tree (src/, 2–3 levels deep)

```
src/
├── app/
│   ├── layout.tsx                        # Root layout — Providers (React Query), fonts
│   ├── page.tsx                          # Redirects → /dashboard
│   ├── globals.css
│   ├── (app)/
│   │   ├── layout.tsx                    # App shell: Sidebar + TopBar + <main>
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  # Video grid, import/edit/delete modals
│   │   │   └── __tests__/page.test.tsx
│   │   ├── player/
│   │   │   ├── layout.tsx                # Pass-through (no extra chrome)
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Server component — delegates to PlayerLoader
│   │   │       └── __tests__/page.test.tsx
│   │   └── vocabulary/
│   │       ├── page.tsx                  # Vocabulary browser — MOCK_VOCAB only, NOT DB-wired
│   │       └── __tests__/page.test.tsx
│   └── api/
│       ├── videos/
│       │   ├── route.ts                  # GET /api/videos
│       │   ├── __tests__/route.test.ts
│       │   ├── import/
│       │   │   ├── route.ts              # POST /api/videos/import (local video upload)
│       │   │   └── __tests__/route.test.ts
│       │   └── [id]/
│       │       ├── route.ts             # GET / PATCH / DELETE /api/videos/:id
│       │       ├── __tests__/route.test.ts
│       │       ├── transcript/
│       │       │   ├── route.ts         # GET /api/videos/:id/transcript → {cues[]}
│       │       │   └── __tests__/route.test.ts
│       │       ├── stream/
│       │       │   ├── route.ts         # GET /api/videos/:id/stream (byte-range video)
│       │       │   └── __tests__/route.test.ts
│       │       └── thumbnail/
│       │           ├── route.ts         # GET /api/videos/:id/thumbnail
│       │           └── __tests__/route.test.ts
│       └── vocabulary/
│           ├── route.ts                 # GET /api/vocabulary → VocabEntry[]
│           ├── __tests__/route.test.ts
│           └── [word]/
│               ├── route.ts             # PATCH /api/vocabulary/:word → upsert status
│               └── __tests__/route.test.ts
├── components/
│   ├── PlayerClient.tsx                  # Main player page logic (client component)
│   ├── PlayerLoader.tsx                  # Fetches video by id, renders PlayerClient
│   ├── LocalVideoPlayer.tsx              # Floating miniplayer (<video> element)
│   ├── LessonHero.tsx                    # Video title/author/tags + Play button
│   ├── PlaybackProgress.tsx              # Progress bar + time display
│   ├── CueText.tsx                       # Tokenized transcript line w/ word-click
│   ├── WordSidebar.tsx                   # Slide-over panel for clicked word details
│   ├── Sidebar.tsx                       # Left nav (Dashboard, Vocabulary links)
│   ├── TopBar.tsx                        # Fixed header (DarkModeToggle)
│   ├── VideoCard.tsx                     # Dashboard video card
│   ├── ImportVideoModal.tsx              # Import modal (local upload)
│   ├── EditVideoModal.tsx                # Edit tags/transcript modal
│   ├── DeleteVideoModal.tsx              # Delete confirmation modal
│   ├── DarkModeToggle.tsx                # Dark/light theme toggle
│   ├── Toast.tsx                         # Toast notification
│   ├── Providers.tsx                     # React Query QueryClientProvider
│   └── __tests__/
│       ├── MiniPlayer.test.tsx           # Placeholder (YouTube MiniPlayer removed)
│       ├── PlayerClient.test.tsx
│       ├── LessonHero.test.tsx
│       ├── PlaybackProgress.test.tsx
│       ├── CueText.test.tsx
│       ├── WordSidebar.test.tsx
│       ├── VideoCard.test.tsx
│       ├── ImportVideoModal.test.tsx
│       ├── EditVideoModal.test.tsx
│       └── DeleteVideoModal.test.tsx
├── hooks/
│   ├── useVideos.ts                      # React Query: GET /api/videos
│   ├── useVideoMutations.ts              # deleteVideo + refreshVideos mutations
│   ├── useImportVideoForm.ts             # Full form state for import modal
│   ├── useVocabulary.ts                  # useVocabulary() + useUpdateWordStatus() — DB-backed, global
│   └── __tests__/
├── lib/
│   ├── api-schemas.ts                    # Zod schemas for API request bodies
│   ├── db.ts                             # SQLite helpers: openDb, initializeSchema, ensureDataDirs
│   ├── videos.ts                         # Zod schemas + TS types: Video, InsertVideoParams, etc.
│   ├── video-store.ts                    # SqliteVideoStore — CRUD over the `videos` table
│   ├── video-service.ts                  # VideoService — business logic (import, update, delete)
│   ├── vocab-store.ts                    # SqliteVocabStore — CRUD over the `vocabulary` table
│   ├── transcripts.ts                    # writeTranscript / deleteTranscript (filesystem I/O)
│   ├── parse-transcript.ts               # parseSrt / parseVtt / parseTxt → TranscriptCue[]
│   ├── tokenize-transcript.ts            # tokenizeCueText → WordToken[] | PunctToken[]
│   ├── detect-transcript-format.ts       # Detects SRT/VTT/TXT from pasted content
│   ├── video-files.ts                    # Video file I/O helpers
│   ├── thumbnails.ts                     # generateThumbnail via ffmpeg
│   ├── vocabulary.ts                     # MOCK_VOCAB + VocabWord type (CEFR A1–C2) + VocabInfo interface
│   └── server/
│       └── composition.ts               # DI root — wires VideoService + SqliteVideoStore + SqliteVocabStore
tests/
└── e2e/
    ├── *.spec.ts                         # Playwright E2E specs
    ├── pages/                            # Page Object Model classes
    └── fixtures/                         # Test fixtures (sample.srt, factory)
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.3 (App Router) |
| UI | React 19.2.4, Tailwind CSS 3 |
| State / Data | TanStack React Query 5 |
| Language | TypeScript 5 (`strict: true`) |
| Database | SQLite via `better-sqlite3` 12 |
| Video streaming | Node.js `fs.createReadStream` with byte-range support |
| Thumbnail gen | `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` |
| Validation | Zod 4 |
| Unit tests | Jest 30 + Testing Library |
| E2E tests | Playwright 1.59 |
| Package manager | **pnpm** only |
| Node runtime | Node 24 |

---

## 3. Player Page Structure

### Route: `/player/[id]`

```
page.tsx (Server Component)
  └── PlayerLoader (Client Component)
        ├── fetches GET /api/videos/:id on mount
        ├── renders loading / not-found / error states
        └── renders PlayerClient (when ready)
              ├── LessonHero          — title, author, tags, Play button
              ├── PlaybackProgress    — shown only when miniplayer is open
              ├── Transcript / Vocabulary tab panel
              │     ├── TranscriptCue rows (clickable → seek + word sidebar)
              │     └── Vocabulary word cards (add/master — local state only)
              ├── LocalVideoPlayer    — mounted when isMiniPlayerOpen = true
              └── WordSidebar         — slide-over, mounted when selectedWord ≠ null
```

**Player layout** (`player/layout.tsx`) is a transparent pass-through — the `(app)/layout.tsx` shell (Sidebar + TopBar) wraps it.

---

## 4. `LocalVideoPlayer.tsx` — Full Control Surface

### Props

```ts
interface LocalVideoPlayerProps {
  videoId: string           // src: /api/videos/{videoId}/stream
  title: string
  onClose: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  seekToTime?: number | null
  onSeekApplied?: () => void
}
```

### Behavior

- **Polling**: 250ms interval on play, stops on pause/ended. Fires `onTimeUpdate`.
- **Seek**: `useEffect` on `seekToTime` → sets `el.currentTime`, fires `onSeekApplied()`.
- **Close**: pauses video then calls `onClose()`.
- No `forwardRef` / no imperative handle — parent cannot control playback directly.

### DOM / test IDs

| testid | Element |
|---|---|
| `mini-player` | Root wrapper `<div>` |
| `local-video` | `<video>` element |
| `mini-player-close` | Close `<button>` |

Positioning: `fixed bottom-4 right-4 z-50 w-80 aspect-video`. On `md:`: shifts to top-right.

---

## 5. `PlayerClient.tsx` — State, Vocab Flow, and Tab Structure

### State managed

```ts
const { data: vocabMap = new Map() } = useVocabulary()  // DB-backed, global, Map<string, VocabEntry>
const updateWordStatus = useUpdateWordStatus()           // PATCH /api/vocabulary/:word

cues: TranscriptCue[]               // from /api/videos/:id/transcript
loadingTranscript: boolean
activeCueIndex: number              // manual cue nav (click)
activeTab: 'transcript' | 'vocabulary'
vocabWords: WordCard[]              // LOCAL state — extracted from cues, NOT persisted
isMiniPlayerOpen: boolean
playbackTime: { current, duration }
requestedSeekTime: number | null
selectedWord: { word, contextSentence } | null  // drives WordSidebar
```

### Vocabulary tab (in-player — WHAT NEEDS UNDERSTANDING)

The player contains a **two-tab panel** inside the transcript area:

```
[ Transcript ]  [ Vocabulary ]
    data-testid="tab-transcript"   data-testid="tab-vocabulary"
```

Tab state: `activeTab: 'transcript' | 'vocabulary'`, default `'transcript'`.

**Vocabulary tab panel** (renders when `activeTab === 'vocabulary'`):
- Shows `vocabWords` — local-only list of ≤8 unique words (≥5 chars) from transcript cues.
- `extractVocabWords(cues)` runs on transcript load; returns `{ word, status: 'new' }[]`.
- "Add to Deck" → `handleWordAction(word, 'add')` → **local state only, no DB call**.
- "Mark Mastered" → `handleWordAction(word, 'master')` → **local state only, no DB call**.
- State resets on page navigation. Completely disconnected from `vocabStore`.

**This tab is separate from the DB-backed vocab system.**

### vocabMap (DB vocab) — Transcript tab only

`vocabMap` from `useVocabulary()` (global, DB-backed) is used in the **Transcript tab**:
1. Passed to `CueText` in every cue row → colors known words red/yellow/green.
2. Passed to `WordSidebar` → `vocabEntry={vocabMap.get(word.toLowerCase())}`.

`WordSidebar` status toggle → `updateWordStatus.mutate({ word, status })` → `PATCH /api/vocabulary/:word` → SQLite persisted → React Query cache invalidated.

### Word-click → WordSidebar flow

1. Click word in `CueText` → `onWordClick(token.raw, cue.text)`
2. `PlayerClient`: `setSelectedWord({ word, contextSentence })`
3. Renders `<WordSidebar ... vocabEntry={vocabMap.get(word.toLowerCase())} onStatusChange={(w,s) => updateWordStatus.mutate(...)} isUpdating={updateWordStatus.isPending} />`
4. Escape / backdrop → `setSelectedWord(null)` → unmounts

---

## 6. `PlaybackProgress.tsx`

```ts
interface PlaybackProgressProps { currentTime: number; duration: number }
```

Stateless. Renders progress bar + `M:SS` labels. Shown only when `isMiniPlayerOpen === true`.

Test IDs: `playback-progress`, `progress-bar-fill`, `current-time`, `duration`.

---

## 7. API Routes (all require `export const runtime = 'nodejs'`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/videos` | List all videos |
| `POST` | `/api/videos/import` | Import local video file + transcript |
| `GET` | `/api/videos/:id` | Get single video |
| `PATCH` | `/api/videos/:id` | Update tags and/or transcript |
| `DELETE` | `/api/videos/:id` | Delete video + files |
| `GET` | `/api/videos/:id/transcript` | Parse transcript → `{ cues: TranscriptCue[] }` |
| `GET` | `/api/videos/:id/stream` | Byte-range video streaming |
| `GET` | `/api/videos/:id/thumbnail` | Serve generated thumbnail |
| `GET` | `/api/vocabulary` | List all vocab entries (`vocabStore.getAll()`) |
| `PATCH` | `/api/vocabulary/:word` | Upsert word status (`vocabStore.upsert(word, status)`) |

### Tags contract

- `POST /api/videos/import`: `tags` FormData = **comma-separated string** → `"french,beginner"`.
- `PATCH /api/videos/:id`: `tags` FormData = **JSON-serialized array string** → `'["french","beginner"]'`.

---

## 8. Data Model

### `Video` (Zod: `src/lib/videos.ts`)

```ts
{
  id: string; title: string; author_name: string; thumbnail_url: string
  transcript_path: string; transcript_format: string
  tags: string[]                    // stored as JSON in SQLite
  created_at: string; updated_at: string
  source_type: 'local'
  local_video_path?: string | null; local_video_filename?: string | null
  thumbnail_path?: string | null
}
```

### SQLite schema (`videos` table)

```sql
id TEXT PRIMARY KEY, title TEXT NOT NULL, author_name TEXT NOT NULL,
thumbnail_url TEXT NOT NULL, transcript_path TEXT NOT NULL,
transcript_format TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]',
created_at TEXT NOT NULL DEFAULT (datetime('now')),
updated_at TEXT NOT NULL DEFAULT (datetime('now')),
source_type TEXT, local_video_path TEXT, local_video_filename TEXT, thumbnail_path TEXT
```

### SQLite schema (`vocabulary` table)

```sql
word TEXT PRIMARY KEY,              -- lowercased word is the PK (no id column)
status TEXT NOT NULL CHECK(status IN ('new','learning','mastered')),
level TEXT,                         -- CEFR level, nullable
definition TEXT,                    -- nullable
created_at TEXT NOT NULL DEFAULT (datetime('now')),
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
```

> No `contextQuote`, `source`, or `video_id` — those exist only in `MOCK_VOCAB`.

### `TranscriptCue`

```ts
{ index: number; startTime: string; endTime: string; text: string }
```

---

## 9. Vocabulary System — Complete Current State

Two coexisting subsystems that are NOT yet unified:

---

### 9a. DB-backed Vocab (production path)

#### `src/lib/vocab-store.ts`

```ts
export interface VocabEntry {
  word: string
  status: 'new' | 'learning' | 'mastered'
  level?: string
  definition?: string
}

export class SqliteVocabStore implements VocabStore {
  getAll(): VocabEntry[]
  getByWord(word: string): VocabEntry | null
  upsert(word: string, status: VocabEntry['status'], level?: string, definition?: string): VocabEntry
}
```

`word` is PK. `upsert` uses `INSERT … ON CONFLICT(word) DO UPDATE SET`.

#### Composition root: `src/lib/server/composition.ts`

`vocabStore` is instantiated alongside `videoStore` and `videoService`. API routes import from here.

#### API routes

- `GET /api/vocabulary` → `vocabStore.getAll()` → `VocabEntry[]`
- `PATCH /api/vocabulary/:word` → URL-decoded + lowercased `:word` → `vocabStore.upsert(word, status)`
  - Body schema: `{ status: 'new' | 'learning' | 'mastered' }`

#### `src/hooks/useVocabulary.ts`

```ts
// Global, NOT scoped per video. Query key: ['vocabulary'].
export function useVocabulary(): UseQueryResult<Map<string, VocabEntry>, Error>

// Mutation. Invalidates ['vocabulary'] on success.
export function useUpdateWordStatus(): UseMutationResult<
  VocabEntry, Error, { word: string; status: VocabEntry['status'] }
>
```

Returns `Map<string, VocabEntry>` keyed by lowercased word. **Cross-video** — same cache for all videos.

---

### 9b. Mock/Local Vocab (NOT DB-backed)

#### `src/lib/vocabulary.ts`

```ts
/** Minimal interface — satisfied by both VocabWord (mock) and VocabEntry (DB). */
export interface VocabInfo {
  status: 'new' | 'learning' | 'mastered'
  level?: string; definition?: string; source?: string
}

export type VocabWord = {
  id: string; word: string; level: 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'
  definition: string; contextQuote: string; source: string
  status: 'new' | 'learning' | 'mastered'
}

export const MOCK_VOCAB: VocabWord[]   // 9 hardcoded entries
export const VOCAB_SOURCES             // ['Cinema','Literature','Science','Nature','Tech']
export const VOCAB_LEVELS              // ['A1','A2','B1','B2','C1','C2']
```

`VocabInfo` is used as the type for `CueText.vocabMap` and `WordSidebar.vocabEntry`. Both `VocabEntry` (DB) and `VocabWord` (mock) satisfy it.

#### `/vocabulary` page (`src/app/(app)/vocabulary/page.tsx`)

- **Still uses `MOCK_VOCAB`** — no `useVocabulary()` call, no API fetch.
- All state is `useState<VocabWord[]>(MOCK_VOCAB)`. `markMastered`/`removeWord` update local state only.
- Tabs: `new` / `learning` / `mastered`. Source + level filter chips.
- Completely disconnected from DB.

---

### 9c. Status → color mapping

| Status | Color |
|---|---|
| `new` | Red (text-red-600, bg-red-50) |
| `learning` | Yellow (text-yellow-600, bg-yellow-50) |
| `mastered` | Green (text-green-600, bg-green-50) |

Used in `CueText.tsx` (`STATUS_WORD_STYLES`) and `WordSidebar.tsx` (`STATUS_STYLES`, `STATUS_LABELS`).

---

### 9d. Vocab data flow summary

```
DB (vocabulary table)
    ↑ upsert via PATCH /api/vocabulary/:word (WordSidebar status toggle)
    ↓ getAll via GET /api/vocabulary
useVocabulary() → vocabMap: Map<string, VocabEntry>  [global, all videos]
    → PlayerClient → CueText word colors (Transcript tab)
    → PlayerClient → WordSidebar (status display + toggle)

MOCK_VOCAB (hardcoded, src/lib/vocabulary.ts)
    → /vocabulary page (local state only, no persistence)

extractVocabWords(cues) → vocabWords (local state in PlayerClient)
    → Player Vocabulary tab cards (in-memory only, no persistence)
```

---

### 9e. Gap analysis

| Component | Status |
|---|---|
| `vocabulary` SQLite table | ✅ |
| `SqliteVocabStore` | ✅ |
| `vocabStore` in composition root | ✅ |
| `GET /api/vocabulary` | ✅ |
| `PATCH /api/vocabulary/:word` | ✅ |
| `useVocabulary()` + `useUpdateWordStatus()` | ✅ |
| Word highlighting in transcript (DB) | ✅ via `vocabMap` in `CueText` |
| WordSidebar status toggle (DB-persisted) | ✅ via `onStatusChange` + `useUpdateWordStatus` |
| `/vocabulary` page DB-wiring | ❌ uses `MOCK_VOCAB` only |
| Player Vocabulary tab DB-wiring | ❌ `vocabWords` local-only, no API calls |
| `POST /api/vocabulary` (create endpoint) | ❌ none — only PATCH exists |
| `contextQuote` / `source` in DB schema | ❌ not present |

---

## 10. `CueText.tsx` — Word Colorization

```ts
interface CueTextProps {
  text: string
  vocabMap: Map<string, VocabInfo>   // keyed by lowercased word
  onWordClick: (word: string, sentence: string) => void
}
```

- `tokenizeCueText(text)` → `TranscriptToken[]`.
- Each word token: looks up `vocabMap.get(token.normalized)`.
- If found → `STATUS_WORD_STYLES[entry.status]` (red/yellow/green).
- If not found → `DEFAULT_WORD_STYLE` (hover highlight only).
- Word spans: `role="button"`, `tabIndex={0}`, `data-testid="word-{normalized}"`, keyboard accessible.

---

## 11. `WordSidebar.tsx` — Word Detail Panel

```ts
interface WordSidebarProps {
  word: string                          // raw, original casing
  contextSentence: string               // full cue text
  vocabEntry: VocabInfo | undefined
  onClose: () => void
  onStatusChange?: (word: string, status: 'new' | 'learning' | 'mastered') => void
  isUpdating?: boolean
}
```

- Fixed right slide-over (`fixed top-0 right-0 z-50 h-full w-80`).
- Escape key + transparent backdrop close it.
- **Status toggle** (`data-testid="status-toggle"`): shown when `onStatusChange` provided. Toggles `mastered` ↔ `new`. Disabled while `isUpdating`.

| Section | Shown when | testid |
|---|---|---|
| Word (colored) | always | `sidebar-word` |
| Status badge | `vocabEntry` defined | — |
| Level + definition | `vocabEntry` defined | — |
| Status toggle | `onStatusChange` provided | `status-toggle` |
| Context sentence | always | `sidebar-context` |

Other test IDs: `word-sidebar`, `word-sidebar-close`.

---

## 12. `LessonHero.tsx`

```ts
interface LessonHeroProps { video: Video; onPlay: () => void }
```

Play button: `data-testid="play-button"`, `aria-label="Play video"`, label `"Play"`, `px-4 py-2`.

---

## 13. Dependency Injection / Composition Root

`src/lib/server/composition.ts` — single DI root. Creates:

- `SqliteVideoStore`
- `VideoService` (takes store + transcriptStore + videoFileStore)
- `SqliteVocabStore` (same DB instance)

Route handlers import `{ videoStore, videoService, vocabStore }` from here. **Never instantiate directly.**

---

## 14. Key Library Files

### `src/lib/parse-transcript.ts`
- `parseTranscript(content, format)` → `TranscriptCue[]`. Supports `'srt'`, `'vtt'`, plain text.

### `src/lib/tokenize-transcript.ts`
- `tokenizeCueText(text)` → `{ type:'word', raw, normalized }[] | { type:'punct', raw }[]`.

### `src/lib/vocabulary.ts`
- `MOCK_VOCAB` (9 entries B1–C1), `VocabWord` type, `VocabInfo` interface, `VOCAB_SOURCES`, `VOCAB_LEVELS`.
- `PlayerClient` does NOT use `MOCK_VOCAB` — uses `useVocabulary()` (DB-backed).
- `/vocabulary` page DOES use `MOCK_VOCAB` — not DB-wired.

### `src/lib/vocab-store.ts`
- `SqliteVocabStore`: `getAll()`, `getByWord()`, `upsert()`. PK is `word` (lowercased).

### `src/lib/thumbnails.ts`
- `generateThumbnail(videoPath, outputPath)` → `string | null`. Uses `fluent-ffmpeg`, frame at 1s.

---

## 15. Build & Test Commands

```bash
pnpm install          # install / sync deps
pnpm build            # production build + TypeScript — MUST pass
pnpm test             # Jest unit tests
pnpm dev              # dev server on http://localhost:3000
pnpm lint             # ESLint — pre-existing test file failures; NOT a CI gate
pnpm test:e2e         # Playwright E2E (auto-starts dev server via webServer config)
```

---

## 16. Critical Patterns

1. **`export const runtime = 'nodejs'`** — required in every `src/app/api/` file.
2. **`// @jest-environment node`** — required at top of every API route test file.
3. **Zod v4**: `result.error.issues[0].message`, NOT `.errors`.
4. **Dynamic route params**: `params` is `Promise<{ id: string }>` — must `await params`.
5. **Tags in SQLite**: stored as JSON string; `rowToVideo()` deserializes. Always pass `string[]` to store methods.
6. **Composition root**: import `{ videoStore, videoService, vocabStore }` from `@/lib/server/composition`. Never instantiate directly.
7. **Import tags**: comma-separated string in FormData. **Update tags**: JSON-serialized array string in FormData.
8. **`@/` path alias** maps to `src/`.
9. **Data dir**: `.lingoflow-data/` — `lingoflow.db`, `transcripts/`, `videos/`, `thumbnails/`. Override via `LINGOFLOW_DATA_DIR`.
10. **`pnpm` only** — no npm or yarn.
11. **Vocab store PK**: `vocabulary.word` is lowercased PK. `upsert` handles insert + update. No separate ID.

---

## 17. CI Pipeline

`.github/workflows/e2e.yml`. Triggers on **push to `main` only** (post-merge).
Steps: `pnpm install --frozen-lockfile` → `pnpm test` → `pnpm test:e2e`.
No lint step. Run `pnpm build` and `pnpm test` locally before merging.
