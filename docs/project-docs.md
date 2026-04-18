# LingoFlow — Project Documentation Snapshot

> **Purpose**: Reference for coding agents. Describes current implemented state only — not aspirational.
> **Last updated**: auto-generated snapshot (2026-07, HEAD: feat/155-resize-play-cta).

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
│   │       ├── page.tsx                  # Vocabulary browser (MOCK data only)
│   │       └── __tests__/page.test.tsx
│   └── api/
│       └── videos/
│           ├── route.ts                  # GET /api/videos
│           ├── __tests__/route.test.ts
│           ├── import/
│           │   ├── route.ts              # POST /api/videos/import (local video upload)
│           │   └── __tests__/route.test.ts
│           └── [id]/
│               ├── route.ts             # GET / PATCH / DELETE /api/videos/:id
│               ├── __tests__/route.test.ts
│               ├── transcript/
│               │   ├── route.ts         # GET /api/videos/:id/transcript → {cues[]}
│               │   └── __tests__/route.test.ts
│               ├── stream/
│               │   ├── route.ts         # GET /api/videos/:id/stream (byte-range video)
│               │   └── __tests__/route.test.ts
│               └── thumbnail/
│                   ├── route.ts         # GET /api/videos/:id/thumbnail
│                   └── __tests__/route.test.ts
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
│   └── __tests__/
├── lib/
│   ├── api-schemas.ts                    # Zod schemas for API request bodies
│   ├── db.ts                             # SQLite helpers: openDb, initializeSchema, ensureDataDirs
│   ├── videos.ts                         # Zod schemas + TS types: Video, InsertVideoParams, etc.
│   ├── video-store.ts                    # SqliteVideoStore — CRUD over the `videos` table
│   ├── video-service.ts                  # VideoService — business logic (import, update, delete)
│   ├── transcripts.ts                    # writeTranscript / deleteTranscript (filesystem I/O)
│   ├── parse-transcript.ts               # parseSrt / parseVtt / parseTxt → TranscriptCue[]
│   ├── tokenize-transcript.ts            # tokenizeCueText → WordToken[] | PunctToken[]
│   ├── detect-transcript-format.ts       # Detects SRT/VTT/TXT from pasted content
│   ├── video-files.ts                    # Video file I/O helpers
│   ├── thumbnails.ts                     # generateThumbnail via ffmpeg
│   ├── vocabulary.ts                     # MOCK_VOCAB data + VocabWord type (CEFR A1–C2)
│   └── server/
│       └── composition.ts               # DI root — wires VideoService + SqliteVideoStore
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
              │     └── Vocabulary word cards (add/master actions)
              ├── LocalVideoPlayer    — mounted when isMiniPlayerOpen = true
              └── WordSidebar         — slide-over, mounted when selectedWord ≠ null
```

**Player layout** (`player/layout.tsx`) is a transparent pass-through — the `(app)/layout.tsx` shell (Sidebar + TopBar) wraps it.

---

## 4. `LocalVideoPlayer.tsx` — Full Control Surface

### Props

```ts
interface LocalVideoPlayerProps {
  videoId: string           // Used to build src: /api/videos/{videoId}/stream
  title: string             // Native <video> title attribute
  onClose: () => void       // Called when ✕ button clicked; pauses video first
  onTimeUpdate?: (currentTime: number, duration: number) => void  // Polled every 250ms while playing
  seekToTime?: number | null  // When non-null, sets videoRef.current.currentTime
  onSeekApplied?: () => void  // Called immediately after seek is applied
}
```

### Internal state / refs

| Ref | Type | Purpose |
|---|---|---|
| `videoRef` | `RefObject<HTMLVideoElement>` | Direct access to the `<video>` DOM element |
| `pollIntervalRef` | `RefObject<ReturnType<setInterval>\|null>` | 250 ms polling interval handle |

### Behavior

- **Polling**: Starts on `onPlay`, stops on `onPause`/`onEnded`. Calls `onTimeUpdate(currentTime, duration)` every 250ms.
- **Seek**: `useEffect` on `seekToTime` — sets `el.currentTime = seekToTime` then fires `onSeekApplied()`.
- **Close**: Pauses video then calls `onClose()`.
- **No play/pause controls exposed** — the native `<video>` element handles its own controls bar (browser default). The component exposes **no imperative ref handle** (`useImperativeHandle` not used).
- **No `forwardRef`** — parent cannot imperatively call play/pause/seek.

### DOM / test IDs

| testid | Element |
|---|---|
| `mini-player` | Root wrapper `<div>` |
| `local-video` | `<video>` element |
| `mini-player-close` | Close `<button>` |

### Positioning

Fixed, bottom-right (`fixed bottom-4 right-4 z-50 w-80 aspect-video`). On `md:` screens shifts to top-right (`md:bottom-auto md:top-20`).

---

## 5. `PlayerClient.tsx` — Miniplayer Wiring

### State managed

```ts
isMiniPlayerOpen: boolean           // toggles LocalVideoPlayer mount
playbackTime: { current, duration } // fed by onTimeUpdate
requestedSeekTime: number | null    // cleared after LocalVideoPlayer calls onSeekApplied
activeCueIndex: number              // set by clicking a cue row (manual nav)
selectedWord: { word, contextSentence } | null  // drives WordSidebar
cues: TranscriptCue[]               // loaded from /api/videos/:id/transcript
vocabWords: WordCard[]              // extracted from cues, 8 unique words ≥5 chars
activeTab: 'transcript' | 'vocabulary'
```

### Miniplayer open/close lifecycle

1. **Open**: `LessonHero` calls `onPlay` → `setIsMiniPlayerOpen(true)`.
2. **Time updates**: `LocalVideoPlayer.onTimeUpdate` → `handleTimeUpdate` → `setPlaybackTime`.
3. **Seek from transcript**: clicking a cue sets `activeCueIndex` + `requestedSeekTime`. `LocalVideoPlayer` receives `seekToTime` prop. On seek applied, `onSeekApplied` clears `requestedSeekTime` to `null`.
4. **Close**: `LocalVideoPlayer.onClose` → `handleClose` → resets `isMiniPlayerOpen`, `playbackTime`, `activeCueIndex`, `requestedSeekTime`.

### Active cue tracking

- **`playbackCueIndex`**: Computed from `playbackTime.current` against cue start/end times (only when `isMiniPlayerOpen`). `-1` when player is closed.
- **`highlightedCueIndex`**: `playbackCueIndex >= 0 ? playbackCueIndex : activeCueIndex`. Auto-scrolls via `scrollIntoView`.

### What is NOT wired

- No play/pause button in `PlayerClient` (only Play to open the miniplayer; close to dismiss).
- No volume, speed, or fullscreen controls.
- No rewind/fast-forward.
- `LocalVideoPlayer` does not expose any ref handle — `PlayerClient` cannot imperatively control playback.

---

## 6. `PlaybackProgress.tsx`

```ts
interface PlaybackProgressProps {
  currentTime: number   // seconds
  duration: number      // seconds (0 while video metadata not loaded)
}
```

- Renders a visual progress bar (`width: (currentTime/duration)*100%`) and `M:SS` / `M:SS` time labels.
- **Stateless** — driven entirely by props from `PlayerClient`.
- Shown only when `isMiniPlayerOpen === true`.

Test IDs: `playback-progress`, `progress-bar-fill`, `current-time`, `duration`.

---

## 7. Playback Control Hooks / Utilities

There are **no dedicated playback control hooks**. All playback state is managed inline in `PlayerClient.tsx`:

| Concern | Where handled |
|---|---|
| Open/close miniplayer | `isMiniPlayerOpen` state in `PlayerClient` |
| Time tracking | 250ms poll in `LocalVideoPlayer` → `onTimeUpdate` callback |
| Seek | `requestedSeekTime` prop → `LocalVideoPlayer` effect |
| Active cue sync | Computed `playbackCueIndex` in `PlayerClient` render |
| Progress bar | `PlaybackProgress` component (display only) |

No `usePlayback`, `useSeek`, or similar hook exists.

---

## 8. API Routes (all require `export const runtime = 'nodejs'`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/videos` | List all videos |
| `POST` | `/api/videos/import` | Import local video file + transcript |
| `GET` | `/api/videos/:id` | Get single video |
| `PATCH` | `/api/videos/:id` | Update tags and/or transcript |
| `DELETE` | `/api/videos/:id` | Delete video + files |
| `GET` | `/api/videos/:id/transcript` | Parse transcript → `{ cues: TranscriptCue[] }` |
| `GET` | `/api/videos/:id/stream` | Byte-range video streaming (mp4/webm/mov) |
| `GET` | `/api/videos/:id/thumbnail` | Serve generated thumbnail image |

### Tags contract

- `POST /api/videos/import`: `tags` FormData field is **comma-separated string** → `"french,beginner"`.
- `PATCH /api/videos/:id`: `tags` FormData field is **JSON-serialized array string** → `'["french","beginner"]'`.

---

## 9. Data Model

### `Video` (Zod schema in `src/lib/videos.ts`)

```ts
{
  id: string
  title: string
  author_name: string
  thumbnail_url: string
  transcript_path: string           // relative or absolute path to transcript file
  transcript_format: string         // 'srt' | 'vtt' | 'txt'
  tags: string[]                    // stored as JSON in SQLite
  created_at: string                // ISO datetime string
  updated_at: string
  source_type: 'local'
  local_video_path?: string | null  // path to video file in .lingoflow-data/videos/
  local_video_filename?: string | null
  thumbnail_path?: string | null    // path to generated thumbnail jpg
}
```

### `TranscriptCue`

```ts
{
  index: number
  startTime: string   // "HH:MM:SS,mmm" or "HH:MM:SS.mmm"
  endTime: string
  text: string
}
```

### SQLite schema (`videos` table)

```sql
id TEXT PRIMARY KEY
title TEXT NOT NULL
author_name TEXT NOT NULL
thumbnail_url TEXT NOT NULL
transcript_path TEXT NOT NULL
transcript_format TEXT NOT NULL
tags TEXT NOT NULL DEFAULT '[]'     -- JSON array string
created_at TEXT NOT NULL DEFAULT (datetime('now'))
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
source_type TEXT
local_video_path TEXT
local_video_filename TEXT
thumbnail_path TEXT
```

---

## 10. Vocabulary System — Current State

### `src/lib/vocabulary.ts`

The vocabulary module contains **mock data only** — no database wiring exists yet.

#### Types

```ts
const VocabWordSchema = z.object({
  id: z.string(),
  word: z.string(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  definition: z.string(),
  contextQuote: z.string(),
  source: z.string(),
  status: z.enum(['new', 'learning', 'mastered']),
})
export type VocabWord = z.infer<typeof VocabWordSchema>
```

#### `MOCK_VOCAB`

9 hardcoded `VocabWord` entries (CEFR levels B1–C1). Words: Ethereal, Juxtaposition, Eloquent, Serendipity, Ephemeral, Resilient, Ambiguous, Pragmatic, Nuance. Sources: Cinema, Literature, Science, Nature, Tech. Statuses: 3 `new`, 3 `learning`, 3 `mastered`.

```ts
export const MOCK_VOCAB: VocabWord[] = [ /* 9 entries */ ]
export const VOCAB_SOURCES = ['Cinema', 'Literature', 'Science', 'Nature', 'Tech'] as const
export const VOCAB_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
```

#### Status → color mapping (used in both `CueText` and `WordSidebar`)

| Status | Color |
|---|---|
| `new` | Red (text-red-600, bg-red-50) |
| `learning` | Yellow (text-yellow-600, bg-yellow-50) |
| `mastered` | Green (text-green-600, bg-green-50) |

---

## 11. `CueText.tsx` — Word Colorization

```ts
interface CueTextProps {
  text: string                          // raw transcript cue text
  vocabMap: Map<string, VocabWord>      // keyed by lowercased word
  onWordClick: (word: string, sentence: string) => void
}
```

- Calls `tokenizeCueText(text)` → `TranscriptToken[]` (words + punct).
- For each token: looks up `vocabMap.get(token.normalized)` (normalized = lowercased).
- If found → applies `STATUS_WORD_STYLES[entry.status]` (red/yellow/green with bg tint).
- If not found → applies `DEFAULT_WORD_STYLE` (hover highlight only).
- Punctuation tokens rendered as plain `<span>` (not clickable).
- Each word span: `role="button"`, `tabIndex={0}`, `data-testid="word-{normalized}"`, `onClick` stops propagation and calls `onWordClick(token.raw, text)`.
- Keyboard accessible: Enter/Space trigger same callback.

`tokenizeCueText` (`src/lib/tokenize-transcript.ts`): splits on whitespace and non-alpha chars; emits `{ type: 'word', raw, normalized }` for alpha-only tokens, `{ type: 'punct', raw }` otherwise.

---

## 12. `WordSidebar.tsx` — Word Detail Panel

```ts
interface WordSidebarProps {
  word: string                        // raw word as clicked (preserves original casing)
  contextSentence: string             // full cue text containing the word
  vocabEntry: VocabWord | undefined   // undefined if word not in vocab map
  onClose: () => void
}
```

### Behavior

- Renders a fixed right slide-over (`fixed top-0 right-0 z-50 h-full w-80`).
- `role="dialog"`, `aria-modal="true"`, `aria-label="Word details"`.
- Backdrop: transparent `fixed inset-0 z-40` div — click dismisses.
- Escape key: `document` keydown listener → `onClose()`.
- Close button: `data-testid="word-sidebar-close"`.

### Content

| Section | Shown when | Content |
|---|---|---|
| Word display | always | `data-testid="sidebar-word"` — large bold word; colored if `vocabEntry` exists |
| Status badge | `vocabEntry` defined | Colored pill: "Mastered" / "Learning" / "New" |
| Vocab details | `vocabEntry` defined | CEFR level badge, source, definition paragraph |
| Context | always | `data-testid="sidebar-context"` — full cue sentence in italic block |

### Test IDs

`word-sidebar`, `word-sidebar-close`, `sidebar-word`, `sidebar-context`.

---

## 13. `PlayerClient.tsx` — selectedWord → WordSidebar Flow

```ts
// Module-level constant (not reactive state)
const vocabMap: Map<string, VocabWord> = new Map(
  MOCK_VOCAB.map((entry) => [entry.word.toLowerCase(), entry])
)
```

`vocabMap` is built once at module load from `MOCK_VOCAB`. It is **not** derived from SQLite — it uses the hardcoded mock.

```ts
// State slice driving WordSidebar
const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null)
// { word: string; contextSentence: string }
```

**Click flow**:
1. User clicks word token in `CueText` → `onWordClick(token.raw, cue.text)` called.
2. `PlayerClient` handler: `setSelectedWord({ word, contextSentence: sentence })`.
3. `{selectedWord && <WordSidebar word={selectedWord.word} contextSentence={selectedWord.contextSentence} vocabEntry={vocabMap.get(selectedWord.word.toLowerCase())} onClose={() => setSelectedWord(null)} />}`.
4. `WordSidebar` renders; Escape or backdrop click → `setSelectedWord(null)` → unmounts.

**Both** active and non-active cue rows render `CueText` (with the same `vocabMap` and `onWordClick` handler). Word colorization therefore applies to all visible cues.

### `vocabWords` (Vocabulary tab, separate from vocabMap)

`vocabWords: WordCard[]` — extracted from cues on load via `extractVocabWords(cues)`:
- Joins all cue text, splits on whitespace, strips non-alpha, keeps words ≥5 chars.
- Returns up to 8 unique words as `{ word, status: 'new' }`.
- **Not linked to `MOCK_VOCAB`** — completely separate extraction.
- `handleWordAction(word, 'add'|'master')` updates status in local state only (no persistence).

---

## 14. Vocabulary Persistence — Gaps for Issue #156

### What exists today

| Mechanism | Status |
|---|---|
| `vocabulary` SQLite table | ❌ Does not exist — `initializeSchema` creates only the `videos` table |
| Vocab API routes | ❌ None — no `src/app/api/vocabulary/` routes exist |
| localStorage persistence | ❌ Not used |
| `VocabWord` Zod schema + type | ✅ Defined in `src/lib/vocabulary.ts` |
| `MOCK_VOCAB` (9 hardcoded entries) | ✅ Used by `PlayerClient` and `/vocabulary` page |
| Status→color display logic | ✅ Implemented in `CueText` and `WordSidebar` |
| Word-click → sidebar flow | ✅ Implemented end-to-end in `PlayerClient` |

### Gaps to fill for issue #156

1. **SQLite `vocabulary` table**: needs `CREATE TABLE IF NOT EXISTS vocabulary (id, word, level, definition, context_quote, source, status, video_id?, created_at, updated_at)` added to `initializeSchema` in `src/lib/db.ts`.
2. **`SqliteVocabStore`** (parallel to `SqliteVideoStore`): CRUD over the vocabulary table.
3. **`VocabService`** or inline route logic: add/update/delete vocab entries.
4. **Composition root update** (`src/lib/server/composition.ts`): wire up vocab store/service.
5. **API routes**: at minimum `GET /api/vocabulary`, `POST /api/vocabulary`, `PATCH /api/vocabulary/:id` (to update status). Must export `runtime = 'nodejs'`.
6. **`PlayerClient` wiring**: replace `MOCK_VOCAB` / module-level `vocabMap` with data fetched from API (React Query). `WordSidebar` add-to-vocab action needs to call the API.
7. **`/vocabulary` page** (`src/app/(app)/vocabulary/page.tsx`): replace mock data with API fetch.
8. **`WordSidebar` add/update action**: needs an `onStatusChange` prop (or similar) to call the persistence layer when user marks a word as learning/mastered.

---

## 15. `LessonHero.tsx` — Current State (snapshot 2026-07)

File: `src/components/LessonHero.tsx`

### Props

```ts
interface LessonHeroProps {
  video: Video
  onPlay: () => void
}
```

### Button (current — post #155)

| Attribute | Current value |
|---|---|
| Label text | `Play` |
| `aria-label` | `"Play video"` |
| `data-testid` | `"play-button"` |
| `onClick` | `onPlay` prop |
| Size classes | `px-4 py-2` (reduced from px-6 py-3) |
| Visual style | `bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-bold hover:scale-[1.02] transition-transform whitespace-nowrap` |
| Icon | `w-5 h-5` SVG play chevron (path `M8 5v14l11-7z`) |

### Test files that reference the button label / component

| File | Reference | Type |
|---|---|---|
| `src/components/__tests__/LessonHero.test.tsx` | `getByTestId('play-button')` — no text assertion on label | Unit |
| `tests/e2e/player.spec.ts` | `toContainText('Play')` | E2E |
| `tests/e2e/pages/PlayerPage.ts` | `getByTestId('play-button')` — no text assertion | E2E POM |

Issue #155 is merged — label is now `"Play"`, padding is `px-4 py-2`.

---

## 16. Dependency Injection / Composition Root

`src/lib/server/composition.ts` is the single DI root. It creates:

- `SqliteVideoStore` (wraps `better-sqlite3`)
- `VideoService` (business logic, takes store + transcriptStore + videoFileStore)

All API route handlers import `{ videoStore, videoService }` from here. **Never instantiate these directly in route handlers.**

---

## 17. Key Library Files

### `src/lib/parse-transcript.ts`
- `parseTranscript(content, format)` → `TranscriptCue[]`
- Supports `'srt'`, `'vtt'` (strips WEBVTT header, parses as SRT), and plain text.

### `src/lib/tokenize-transcript.ts`
- `tokenizeCueText(text)` → `TranscriptToken[]`
- Each token is `{ type: 'word', raw, normalized }` or `{ type: 'punct', raw }`.
- `normalized` is lowercased word, used for vocab map lookup.

### `src/lib/vocabulary.ts`
- `MOCK_VOCAB: VocabWord[]` — 9 hardcoded entries, CEFR levels B1–C1.
- `VocabWord` has `{ id, word, level, definition, contextQuote, source, status }`.
- **Not yet wired to SQLite** — vocabulary page and `PlayerClient` use mock data only.

### `src/lib/thumbnails.ts`
- `generateThumbnail(videoPath, outputPath)` → `string | null`
- Uses `fluent-ffmpeg` to extract a frame at 1 second. Async, non-blocking (called with `void` in import route).

---

## 18. Build & Test Commands

```bash
pnpm install          # install / sync deps (run after package.json changes)
pnpm build            # production build + TypeScript validation — MUST pass
pnpm test             # Jest unit tests
pnpm dev              # dev server on http://localhost:3000
pnpm lint             # ESLint — pre-existing failures in test files; NOT a CI gate
pnpm test:e2e         # Playwright E2E (auto-starts dev server via webServer config)
```

---

## 19. Critical Patterns

1. **`export const runtime = 'nodejs'`** required in every `src/app/api/` file.
2. **`// @jest-environment node`** required at top of API route test files.
3. **Zod v4**: use `result.error.issues[0].message`, NOT `.errors`.
4. **Dynamic route params**: `params` is `Promise<{ id: string }>` — must `await params`.
5. **Tags in SQLite**: stored as JSON string; `SqliteVideoStore.rowToVideo()` deserializes. Always pass `string[]` to store methods.
6. **Composition root**: always import `{ videoStore, videoService }` from `@/lib/server/composition`.
7. **Import tags**: comma-separated string in FormData. **Update tags**: JSON-serialized array string in FormData.
8. **`@/` path alias** maps to `src/`. Use in all imports.
9. **Data dir**: `.lingoflow-data/` (gitignored) — contains `lingoflow.db`, `transcripts/`, `videos/`, `thumbnails/`. Override with `LINGOFLOW_DATA_DIR` env var.
10. **`pnpm` only** — no npm or yarn.

---

## 20. CI Pipeline

Defined in `.github/workflows/e2e.yml`. Triggers on **push to `main` only** (post-merge).
Steps: `pnpm install --frozen-lockfile` → `pnpm test` → `pnpm test:e2e`.
No lint step. Run `pnpm build` and `pnpm test` locally before merging.
