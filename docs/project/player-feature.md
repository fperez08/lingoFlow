# Player Feature — Codebase Reference

> Reference document for implementing Issue #119 (Player shell with floating mini-player), Issue #120 (Playback progress indicator), and Issue #121 (Cue-synced paged transcript).

---

## 1. Current File Structure

```
src/
  app/
    (app)/
      layout.tsx                    # App shell: Sidebar (w-64 fixed left) + TopBar (h-16 fixed top) + <main ml-64 pt-24>
      player/
        layout.tsx                  # Minimal passthrough layout — renders children with no extra wrapper
        [id]/
          page.tsx                  # Server component — awaits params, delegates to <PlayerLoader id={id} />
          __tests__/
            page.test.tsx           # Unit test — mocks PlayerLoader, verifies id prop is forwarded
  components/
    PlayerLoader.tsx                # 'use client' — fetches /api/videos/:id, handles loading/not-found/error states, renders <PlayerClient>
    PlayerClient.tsx                # 'use client' — full lesson UI: inline YouTube iframe + right sidebar (transcript + vocabulary tabs)
```

### Full app layout tree (at runtime)
```
<AppLayout>            ← src/app/(app)/layout.tsx
  <Sidebar />          ← fixed left-0, w-64, z-50
  <TopBar />           ← fixed top-0, left-64, z-40, h-16
  <main ml-64 pt-24>
    <PlayerLayout>     ← src/app/(app)/player/layout.tsx (passthrough)
      <PlayerPage>     ← server component
        <PlayerLoader> ← fetches video over the client-side API
          <PlayerClient> ← renders full lesson view
```

---

## 2. The `Video` Type

Defined in `src/lib/videos.ts` via Zod:

```ts
export interface Video {
  id: string            // nanoid
  youtube_url: string   // e.g. "https://www.youtube.com/watch?v=abc123"
  youtube_id: string    // e.g. "abc123"
  title: string
  author_name: string
  thumbnail_url: string // YouTube oEmbed thumbnail URL
  transcript_path: string // relative path inside .lingoflow-data/transcripts/
  transcript_format: string // "srt" | "vtt" | "txt"
  tags: string[]        // deserialized from JSON in SQLite
  created_at: string    // ISO 8601
  updated_at: string    // ISO 8601
}
```

Also relevant: `TranscriptCue` from `src/lib/parse-transcript.ts`:
```ts
export interface TranscriptCue {
  index: number
  startTime: string   // e.g. "00:01:23,456"
  endTime: string
  text: string
}
```

---

## 3. How the Current Player Page Works

### Data flow
1. `PlayerPage` (server component) — awaits `params: Promise<{ id: string }>`, passes `id` to `<PlayerLoader>`.
2. `PlayerLoader` (`'use client'`) — on mount, fetches `GET /api/videos/:id`. Manages `status`: `'loading' | 'not-found' | 'error' | 'ready'`.
3. `PlayerClient` (`'use client'`) — receives a `Video` prop. On mount, fetches `GET /api/videos/:id/transcript` to get `{ cues: TranscriptCue[] }`.

### Current `PlayerClient` layout
```
<div class="min-h-screen flex flex-col lg:flex-row">
  <section flex-1>                 ← main content
    <iframe youtube embed />       ← 16:9 aspect-video, rounded-xl, full width
    <title + author + tags />
    <Save Lesson button />
  </section>
  <aside w-full lg:w-[420px]>     ← right sidebar
    Transcript | Vocabulary tabs
    Cue list (click to set activeCueIndex)
    Vocab word cards (add/master actions)
  </aside>
</div>
```

The `activeCueIndex` is purely local state — there is **no** time-synced playback; the user clicks cues manually.

---

## 4. Files to Create / Modify for Issue #119

### Goal
Replace the inline YouTube `<iframe>` with a **thumbnail hero** (static image + Play button). Clicking Play opens a **fixed bottom-right mini-player** containing the iframe. Closing the mini-player pauses playback and returns the page to the hero view.

### Files to **modify**

| File | Change |
|---|---|
| `src/components/PlayerClient.tsx` | Replace `<iframe>` section with `<LessonHero>` component. Add state: `isMiniPlayerOpen: boolean`. Wire Play button → open mini-player. |
| `src/app/(app)/player/layout.tsx` | Currently a passthrough. May need to remain as-is or be updated if mini-player needs a portal target outside `<main>`. The mini-player can use `fixed` positioning and lives inside `PlayerClient` directly — **no layout change required**. |

### Files to **create**

| File | Purpose |
|---|---|
| `src/components/LessonHero.tsx` | `'use client'` — Displays `video.thumbnail_url` as a full-width hero image with a centered Play button overlay and video metadata (title, author, tags). Receives `video: Video` and `onPlay: () => void`. |
| `src/components/MiniPlayer.tsx` | `'use client'` — Fixed bottom-right overlay containing the YouTube `<iframe>`. Receives `youtubeId: string`, `title: string`, and `onClose: () => void`. Closing calls `onClose` and should pause the iframe (achieved by removing it from the DOM or appending `?autoplay=0` / clearing `src`). |

### Files that do **not** need to change

- `src/app/(app)/player/[id]/page.tsx` — server component, just passes `id` to `PlayerLoader`
- `src/components/PlayerLoader.tsx` — fetches video and delegates; no visual change needed
- All API routes — no API surface changes
- `src/lib/videos.ts`, `src/lib/video-store.ts`, `src/lib/video-service.ts` — no data model changes

---

## 5. Patterns to Follow

### Fixed overlay / modal pattern
All modals (`DeleteVideoModal`, `EditVideoModal`, `ImportVideoModal`) use:
```tsx
<div className="fixed inset-0 bg-black/40 backdrop-blur-[6px] z-50 flex items-center justify-center"
  onClick={onClose}>
  <div onClick={(e) => e.stopPropagation()}>
    {/* content */}
  </div>
</div>
```
The **MiniPlayer** should NOT use a full-screen backdrop. Instead it should use `fixed bottom-4 right-4` positioning with a high `z-index` (e.g. `z-50`) and a defined width (e.g. `w-80` or `w-96`) — similar to a toast/snackbar pattern rather than a modal.

### z-index layering (existing)
| Element | z-index |
|---|---|
| `Sidebar` | `z-50` |
| `TopBar` | `z-40` |
| Modals (fixed inset-0) | `z-50` |
| **MiniPlayer (new)** | `z-50` (safe; no full-screen overlap) |

### Closing the mini-player / pausing the iframe
To pause a YouTube `<iframe>` on close, the simplest approach is to conditionally render the iframe only when `isMiniPlayerOpen === true`. When `MiniPlayer` unmounts (or `isMiniPlayerOpen` becomes false), the iframe is removed from the DOM, which stops playback.

Alternatively, use `postMessage` to the iframe's `contentWindow`:
```ts
iframeRef.current?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
```
This requires `?enablejsapi=1` in the embed URL.

### Tailwind design tokens in use
| Token | Usage |
|---|---|
| `bg-surface` | Page backgrounds |
| `bg-surface-container-low` | Sidebar, aside panels |
| `bg-surface-container-lowest/90` | Modal card backgrounds |
| `text-on-surface` | Primary text |
| `text-on-surface-variant` | Secondary / muted text |
| `border-outline-variant/20` | Subtle borders |
| `text-primary` | Brand accent color |
| `rounded-xl` | Standard border radius for cards/modals |
| `shadow-2xl` | Card/modal shadow |
| `backdrop-blur-[24px]` | Frosted glass modal backgrounds |

### TypeScript / Next.js conventions
- `'use client'` at top of any component using hooks or event handlers
- No `export const runtime = 'nodejs'` needed in `components/` (only in `app/api/` routes)
- Use `@/components/...` and `@/lib/...` path aliases throughout
- Props interfaces defined inline above the component or exported if reused

### YouTube embed URL
Current embed pattern in `PlayerClient`:
```ts
`https://www.youtube.com/embed/${video.youtube_id}`
```
For autoplay when mini-player opens, append `?autoplay=1`:
```ts
`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`
```
For the JS API (pause on close), append `?enablejsapi=1&autoplay=1`.

---

## 6. Suggested Component Interfaces

```ts
// src/components/LessonHero.tsx
interface LessonHeroProps {
  video: Video
  onPlay: () => void
}

// src/components/MiniPlayer.tsx
interface MiniPlayerProps {
  youtubeId: string
  title: string
  onClose: () => void
}
```

### State in `PlayerClient` (after refactor)
```ts
const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false)

// Render:
// - <LessonHero video={video} onPlay={() => setIsMiniPlayerOpen(true)} />  (always visible in main section)
// - {isMiniPlayerOpen && <MiniPlayer youtubeId={video.youtube_id} title={video.title} onClose={() => setIsMiniPlayerOpen(false)} />}
```

---

## 7. Test Files to Create / Update

| File | What to test |
|---|---|
| `src/components/__tests__/LessonHero.test.tsx` | Renders thumbnail image, renders title/author, calls `onPlay` when Play button clicked |
| `src/components/__tests__/MiniPlayer.test.tsx` | Renders iframe with correct `src`, calls `onClose` when close button clicked |
| `src/components/__tests__/PlayerClient.test.tsx` (new or update) | Initially shows `LessonHero` (no iframe); after clicking Play shows `MiniPlayer`; after clicking close hides `MiniPlayer` |

Use `// @jest-environment jsdom` (the default) for component tests — no override needed.
Mock `fetch` for transcript calls as needed (already done implicitly in existing tests).

---

## 8. Progress Indicator — Issue #120

### Goal
Add a **read-only** playback progress bar to the lesson page (main content area, not inside the mini-player overlay). It must display elapsed time and total duration sourced from the live YouTube player. Scrubbing (clicking or dragging to seek) must NOT be supported.

---

### 8.1 Component Tree Placement

The progress bar lives in `PlayerClient`'s main `<section>` area, rendered **below** `<LessonHero>` and only when the mini-player is open (i.e., playback has started):

```
<PlayerClient>
  <section>                           ← main content
    <LessonHero />                    ← always visible
    {isMiniPlayerOpen && (
      <PlaybackProgress              ← NEW — read-only bar
        currentTime={playbackTime.current}
        duration={playbackTime.duration}
      />
    )}
  </section>

  {isMiniPlayerOpen && (
    <MiniPlayer                      ← fixed bottom-right overlay
      youtubeId={...}
      title={...}
      onClose={...}
      onTimeUpdate={handleTimeUpdate} ← NEW prop
    />
  )}

  <aside> … </aside>
</PlayerClient>
```

---

### 8.2 How to Wire YouTube Player Time Into React State

`MiniPlayer` already uses `?enablejsapi=1` in the embed URL. Extend it to load the **YouTube IFrame API script** (`https://www.youtube.com/iframe_api`) and create a `YT.Player` instance so that player methods (`getCurrentTime()`, `getDuration()`) become available.

**Polling approach — inside `MiniPlayer`:**

```ts
// MiniPlayer.tsx (additions)
useEffect(() => {
  // 1. Inject the IFrame API script once
  if (!window.YT) {
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  }

  let player: YT.Player
  let pollInterval: ReturnType<typeof setInterval>

  // 2. Wait for API ready, then bind to our iframe
  const prevReady = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    prevReady?.()
    player = new window.YT.Player(iframeRef.current!, {
      events: {
        onStateChange(event) {
          if (event.data === window.YT.PlayerState.PLAYING) {
            // 3. Poll every 250 ms while playing
            clearInterval(pollInterval)
            pollInterval = setInterval(() => {
              const current = player.getCurrentTime()   // seconds (float)
              const total = player.getDuration()        // seconds (float)
              onTimeUpdate?.(current, total)
            }, 250)
          } else {
            clearInterval(pollInterval)
          }
        },
      },
    })
  }

  // If API was already loaded, fire immediately
  if (window.YT?.Player) {
    window.onYouTubeIframeAPIReady()
  }

  return () => {
    clearInterval(pollInterval)
    player?.destroy()
  }
}, [youtubeId]) // re-bind if video changes
```

> **Important:** The `YT.Player` constructor targets the **existing** `<iframe>` element via `iframeRef.current` — it does NOT replace the element. The iframe's `src` must already contain `enablejsapi=1`, which it does in the current implementation.

**TypeScript types for `window.YT`:**
Install `@types/youtube` (dev dependency):
```bash
pnpm add -D @types/youtube
```
This provides `YT.Player`, `YT.PlayerState`, `YT.PlayerEvent`, etc.

---

### 8.3 Props / Callbacks Threading

#### New prop on `MiniPlayer`
```ts
interface MiniPlayerProps {
  youtubeId: string
  title: string
  onClose: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void  // ← NEW (optional)
}
```

#### New state in `PlayerClient`
```ts
const [playbackTime, setPlaybackTime] = useState({ current: 0, duration: 0 })

function handleTimeUpdate(current: number, duration: number) {
  setPlaybackTime({ current, duration })
}
```
Pass `onTimeUpdate={handleTimeUpdate}` to `<MiniPlayer>`.

When `isMiniPlayerOpen` becomes `false`, reset state so the progress bar returns to 0 on the next play:
```ts
function handleClose() {
  setIsMiniPlayerOpen(false)
  setPlaybackTime({ current: 0, duration: 0 })
}
```

#### New component `PlaybackProgress`
```ts
// src/components/PlaybackProgress.tsx
interface PlaybackProgressProps {
  currentTime: number   // seconds
  duration: number      // seconds (0 while metadata not loaded)
}
```
Render a `<progress>` element (or a styled `<div>`) with `pointer-events-none` / no `onChange`/`onClick` handlers to enforce read-only. Display a formatted time string (e.g. `"1:23 / 4:56"`).

```tsx
// Minimal implementation pattern
const pct = duration > 0 ? (currentTime / duration) * 100 : 0

<div data-testid="playback-progress" className="w-full mt-4">
  <div className="h-1.5 rounded-full bg-outline-variant/30 overflow-hidden">
    <div
      className="h-full bg-primary rounded-full transition-all duration-200"
      style={{ width: `${pct}%` }}
    />
  </div>
  <div className="flex justify-between text-xs text-on-surface-variant mt-1">
    <span data-testid="current-time">{formatTime(currentTime)}</span>
    <span data-testid="duration">{formatTime(duration)}</span>
  </div>
</div>
```

`formatTime(seconds: number): string` — helper that converts a float number of seconds to `"M:SS"` format.

---

### 8.4 Files to Create / Modify

| File | Action | Change |
|---|---|---|
| `src/components/PlaybackProgress.tsx` | **Create** | Read-only progress bar + time display. Props: `currentTime`, `duration`. |
| `src/components/MiniPlayer.tsx` | **Modify** | Add `onTimeUpdate?: (current: number, duration: number) => void` prop. Load YT IFrame API script, create `YT.Player` instance, poll `getCurrentTime()` / `getDuration()` at 250 ms when playing, clear interval on pause/stop/unmount. |
| `src/components/PlayerClient.tsx` | **Modify** | Add `playbackTime` state (`{ current: number, duration: number }`). Add `handleTimeUpdate` callback. Pass `onTimeUpdate` to `<MiniPlayer>`. Render `<PlaybackProgress>` below `<LessonHero>` when `isMiniPlayerOpen` is true. Reset `playbackTime` to `{ current: 0, duration: 0 }` when mini-player closes. |
| `package.json` / `pnpm-lock.yaml` | **Modify** | Add `@types/youtube` as a dev dependency (`pnpm add -D @types/youtube`). |

No API route changes. No database changes. No changes to `LessonHero`, `PlayerLoader`, or `PlayerPage`.

---

### 8.5 Test Coverage Expectations

| File | What to test |
|---|---|
| `src/components/__tests__/PlaybackProgress.test.tsx` | **New.** (1) Renders with `currentTime=0, duration=0` — bar width is 0%, both time labels show `"0:00"`. (2) Renders with `currentTime=90, duration=300` — bar width is 30%, labels show `"1:30"` / `"5:00"`. (3) No scrubbing: confirm the progress element has no `onClick` or `onChange` handler (or simply that clicking it does NOT change state — test this by clicking the bar and asserting `currentTime` label is unchanged). |
| `src/components/__tests__/MiniPlayer.test.tsx` | **Update.** (1) Calls `onTimeUpdate` when the YT Player fires a polling tick (mock `window.YT.Player` and simulate `onStateChange` with `PLAYING`; fast-forward timers with `jest.useFakeTimers`). (2) Clears the interval on unmount. |
| `src/components/__tests__/PlayerClient.test.tsx` | **Update.** (1) `PlaybackProgress` is not rendered before Play is clicked. (2) After clicking Play, `PlaybackProgress` is rendered with `currentTime=0`. (3) When `MiniPlayer` calls `onTimeUpdate(90, 300)`, `PlaybackProgress` shows `"1:30"` and `"5:00"`. (4) After closing the mini-player, `PlaybackProgress` is not rendered. |

Use `jest.useFakeTimers()` and `jest.advanceTimersByTime(250)` to simulate polling intervals without real-time delays.

Mock `window.YT` in tests:
```ts
const mockGetCurrentTime = jest.fn().mockReturnValue(90)
const mockGetDuration = jest.fn().mockReturnValue(300)
const mockPlayerInstance = { getCurrentTime: mockGetCurrentTime, getDuration: mockGetDuration, destroy: jest.fn() }
window.YT = {
  Player: jest.fn().mockImplementation((_el, opts) => {
    opts.events.onStateChange({ data: window.YT.PlayerState.PLAYING })
    return mockPlayerInstance
  }),
  PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
} as unknown as typeof YT
```

---

## 9. Cue-synced Paged Transcript — Issue #121

### Goal

Replace the manually-clicked cue list in the transcript sidebar with an **auto-advancing paged view** that:
- Highlights the cue that is actively playing based on current playback time.
- Groups cues into fixed-size pages (10 cues per page).
- Automatically flips to the page containing the active cue as playback progresses.
- Allows the user to manually navigate between pages.

This feature builds directly on top of Issue #120: the `currentTime` value produced by the `onTimeUpdate` polling in `MiniPlayer` is the single source of truth driving cue selection and page advancement.

---

### 9.1 How Transcript Cues Are Fetched

**Endpoint:** `GET /api/videos/:id/transcript`

**Response shape:**
```ts
{ cues: TranscriptCue[] }
```

`TranscriptCue` (from `src/lib/parse-transcript.ts`):
```ts
export interface TranscriptCue {
  index: number       // 1-based sequential index from the source file
  startTime: string   // e.g. "00:01:23,456" (SRT) or "00:01:23.456" (VTT)
  endTime: string     // same format
  text: string        // display text for the cue
}
```

**Fetching pattern (already in `PlayerClient`):**
```ts
useEffect(() => {
  fetch(`/api/videos/${video.id}/transcript`)
    .then((r) => r.json())
    .then((data) => setCues(data.cues ?? []))
    .catch(() => setCues([]))
    .finally(() => setLoadingTranscript(false))
}, [video.id])
```
No new hook or API changes are needed — `cues` is already available as state in `PlayerClient`.

---

### 9.2 Where the Transcript Panel Lives

The transcript panel is the `activeTab === 'transcript'` branch inside `PlayerClient`'s `<aside>`. It already renders cues; the change is to replace the flat manual-click list with a `TranscriptPanel` component that receives `cues`, `activeCueIndex`, `currentPage`, and callbacks.

Component tree after the refactor:
```
<PlayerClient>
  <section>                              ← main content
    <LessonHero />
    {isMiniPlayerOpen && <PlaybackProgress ... />}   ← from Issue #120
  </section>

  {isMiniPlayerOpen && (
    <MiniPlayer
      onTimeUpdate={handleTimeUpdate}    ← from Issue #120
      ...
    />
  )}

  <aside>
    [Transcript | Vocabulary tabs]
    {activeTab === 'transcript' && (
      <TranscriptPanel                   ← NEW — Issue #121
        cues={cues}
        activeCueIndex={activeCueIndex}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        loading={loadingTranscript}
      />
    )}
    {activeTab === 'vocabulary' && <VocabPanel ... />}
  </aside>
</PlayerClient>
```

---

### 9.3 How Current Playback Time Flows to the Transcript Panel

The full data-flow chain (each arrow is a prop or state update):

```
YT.Player (inside MiniPlayer)
  → polls getCurrentTime() every 250 ms while playing
  → calls onTimeUpdate(current, duration)          ← MiniPlayer prop

PlayerClient.handleTimeUpdate(current, duration)
  → setPlaybackTime({ current, duration })         ← Issue #120 state
  → setActiveCueIndex(findActiveCueIndex(cues, current))  ← NEW — Issue #121
  → setCurrentPage(Math.floor(activeCueIndex / CUES_PER_PAGE))  ← auto-advance page

<TranscriptPanel
  cues={cues}
  activeCueIndex={activeCueIndex}
  currentPage={currentPage}
  onPageChange={setCurrentPage}
/>
```

`activeCueIndex` and `currentPage` are separate pieces of state in `PlayerClient`. Only the **auto-advance** logic (inside `handleTimeUpdate`) updates `currentPage` automatically. The user can also change `currentPage` manually via `onPageChange`, without affecting `activeCueIndex`.

---

### 9.4 Active Cue Selection Algorithm

#### Time string parsing

`startTime` and `endTime` are strings in `"HH:MM:SS,mmm"` (SRT) or `"HH:MM:SS.mmm"` (VTT) format. Both are produced by `parseTranscript` and must be converted to seconds for comparison with the `currentTime` float (seconds) from the YT API.

```ts
// src/lib/parse-transcript.ts  (or a new src/lib/transcript-utils.ts)
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0
  // Accepts both comma and period as millisecond separator
  const [hms, ms = '0'] = timeStr.split(/[,.]/)
  const parts = hms.split(':').map(Number)
  const [h = 0, m = 0, s = 0] = parts
  return h * 3600 + m * 60 + s + parseInt(ms, 10) / 1000
}
```

#### findActiveCueIndex

```ts
export function findActiveCueIndex(cues: TranscriptCue[], currentTime: number): number {
  let lastBefore = -1
  for (let i = 0; i < cues.length; i++) {
    const start = parseTimeToSeconds(cues[i].startTime)
    const end = parseTimeToSeconds(cues[i].endTime)
    if (currentTime >= start && currentTime < end) return i
    if (currentTime >= start) lastBefore = i
  }
  return lastBefore
}
```

- Returns the index of the cue whose window `[startTime, endTime)` contains `currentTime`.
- Falls back to the last cue whose `startTime ≤ currentTime` when no cue window matches (gap between cues).
- Returns `-1` when `currentTime` is before all cues (before playback has reached any cue). In this case no cue is highlighted.
- **Important:** cues with empty `startTime`/`endTime` (produced by the plain-text parser path in `parseTranscript`) all parse to `0`; they will not be meaningfully synced. This is acceptable — plain-text transcripts have no timing data.

---

### 9.5 Paging Strategy

```ts
const CUES_PER_PAGE = 10
```

| Variable | Derivation |
|---|---|
| `totalPages` | `Math.ceil(cues.length / CUES_PER_PAGE)` |
| `currentPage` | `useState(0)` — 0-indexed |
| Page `n` cues | `cues.slice(n * CUES_PER_PAGE, (n + 1) * CUES_PER_PAGE)` |
| Active cue's page | `Math.floor(activeCueIndex / CUES_PER_PAGE)` |

#### Auto-advance logic (inside `PlayerClient.handleTimeUpdate`)

```ts
function handleTimeUpdate(current: number, duration: number) {
  setPlaybackTime({ current, duration })

  const newActiveCueIndex = findActiveCueIndex(cues, current)
  setActiveCueIndex(newActiveCueIndex)

  if (newActiveCueIndex >= 0) {
    const targetPage = Math.floor(newActiveCueIndex / CUES_PER_PAGE)
    // Only auto-flip if the active cue moved to a different page
    setCurrentPage((prev) => (targetPage !== prev ? targetPage : prev))
  }
}
```

Using the functional updater `setCurrentPage((prev) => ...)` avoids stale closure issues. The page only flips when the active cue genuinely crosses a boundary, not on every poll tick.

#### Manual navigation

`TranscriptPanel` renders Prev / Next buttons:
```tsx
<button onClick={() => onPageChange(Math.max(0, currentPage - 1))}
  disabled={currentPage === 0}>← Prev</button>
<span>{currentPage + 1} / {totalPages}</span>
<button onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
  disabled={currentPage === totalPages - 1}>Next →</button>
```
Manual navigation overrides auto-advance until the active cue crosses the next page boundary (at which point auto-advance reclaims control).

#### Scroll-to-active cue

Within the current page, the active cue should scroll into view. Use a `useEffect` that fires when `activeCueIndex` changes and the active cue is on the current page:
```ts
useEffect(() => {
  activeCueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}, [activeCueIndex])
```
Attach `activeCueRef` to the rendered cue element whose index matches `activeCueIndex`.

---

### 9.6 Files to Create / Modify

| File | Action | Description |
|---|---|---|
| `src/lib/parse-transcript.ts` | **Modify** | Export `parseTimeToSeconds(timeStr: string): number` and `findActiveCueIndex(cues: TranscriptCue[], currentTime: number): number`. Both are pure utilities that belong alongside the parser. |
| `src/components/TranscriptPanel.tsx` | **Create** | `'use client'` — renders the paged, cue-highlighted transcript sidebar content. See interface below. |
| `src/components/PlayerClient.tsx` | **Modify** | (1) Import and use `findActiveCueIndex` from `@/lib/parse-transcript`. (2) Add `currentPage` state (`useState(0)`). (3) Update `handleTimeUpdate` (from Issue #120) to also call `setActiveCueIndex` and auto-advance `currentPage`. (4) Replace the inline cue-list rendering inside the transcript tab with `<TranscriptPanel>`. |

No changes needed to:
- `src/components/MiniPlayer.tsx` — `onTimeUpdate` prop added in Issue #120 is already sufficient
- `src/components/LessonHero.tsx` — no changes
- `src/app/api/videos/[id]/transcript/route.ts` — API is already correct
- Any DB, store, or service files

---

### 9.7 Component Interface

```ts
// src/components/TranscriptPanel.tsx
const CUES_PER_PAGE = 10

interface TranscriptPanelProps {
  cues: TranscriptCue[]
  activeCueIndex: number       // -1 means no active cue (before playback / no timing data)
  currentPage: number          // 0-indexed
  onPageChange: (page: number) => void
  loading: boolean
}
```

Rendering rules:
- When `loading` is `true`: show a loading spinner / "Loading transcript…" text.
- When `cues.length === 0` (and not loading): show the "No transcript available" empty state (as currently rendered in `PlayerClient`).
- Otherwise: render the slice of cues for the current page, highlight the active one, show pagination controls.

Cue styling follows the existing visual conventions already in `PlayerClient`:
```tsx
// Past cue (i + pageOffset < activeCueIndex)
className="opacity-40 text-sm text-on-surface-variant px-3 py-2"

// Active cue (i + pageOffset === activeCueIndex)
className="bg-surface-container rounded-xl p-3 ring-1 ring-primary/10 border-l-4 border-primary"

// Future cue
className="opacity-60 text-sm text-on-surface px-3 py-2"
```
Where `pageOffset = currentPage * CUES_PER_PAGE`.

---

### 9.8 Test Coverage Expectations

#### New utility tests

| File | What to test |
|---|---|
| `src/lib/__tests__/parse-transcript.test.ts` | **Update.** (1) `parseTimeToSeconds("00:01:23,456")` → `83.456`. (2) `parseTimeToSeconds("00:01:23.456")` → `83.456`. (3) `parseTimeToSeconds("")` → `0`. (4) `findActiveCueIndex` returns correct index when `currentTime` falls inside a cue window. (5) Returns `lastBefore` index when `currentTime` is in a gap. (6) Returns `-1` when `currentTime` is before all cues. |

#### New component tests

| File | What to test |
|---|---|
| `src/components/__tests__/TranscriptPanel.test.tsx` | **New.** (1) Shows loading state when `loading=true`. (2) Shows empty state when `cues=[]` and `loading=false`. (3) Renders only `CUES_PER_PAGE` cues on each page. (4) The cue at `activeCueIndex` has `data-testid="cue-active"` or the expected active CSS class / `border-primary` class. (5) Prev button is disabled on page 0; Next button is disabled on last page. (6) Clicking Next calls `onPageChange(1)`. (7) Active cue on the current page is visible (scroll-into-view via ref — can assert that `scrollIntoView` mock was called). |

#### Updated component tests

| File | What to test |
|---|---|
| `src/components/__tests__/PlayerClient.test.tsx` | **Update.** (1) When `onTimeUpdate` is called with a time matching a cue, `activeCueIndex` is set and the active cue element is highlighted. Use `jest.useFakeTimers()` + mock `window.YT` from Issue #120 test patterns. (2) When `activeCueIndex` crosses a page boundary (e.g., goes from 9 to 10), page auto-advances and cues for page 2 are rendered. (3) `findActiveCueIndex` is called with correct args (can spy on the imported util). |

Use `// @jest-environment jsdom` (default) for all component tests. Mock `fetch` for transcript responses as needed.

---

### 9.9 Data-testid Conventions for New Elements

| Element | `data-testid` |
|---|---|
| `TranscriptPanel` root | `transcript-panel` |
| Active cue | `cue-active` |
| Non-active cue at index `i` | `cue-{i}` (where `i` is position within current page, 0-based) |
| Prev page button | `transcript-prev-page` |
| Next page button | `transcript-next-page` |
| Page indicator | `transcript-page-indicator` |

These follow the existing `data-testid` naming convention (`cue-{i}`, `tab-transcript`, etc.) already used in `PlayerClient`.

---

## 10. Word-level Karaoke Highlighting — Issue #122

### Goal

Within the **active** transcript cue, progressively highlight each word as playback moves through the cue using proportional timing interpolation. Allow clicking any cue (active or not) to seek playback to that cue's start timestamp.

This feature builds on Issue #121: `currentTime` is already threaded into `PlayerClient` via `onTimeUpdate`, and `TranscriptPanel` already receives the active cue index. Issue #122 extends `TranscriptPanel` to also receive `currentTime` for in-cue word highlighting, and wires a `seekTo` imperative handle from `MiniPlayer` up through `PlayerClient` to `TranscriptPanel`.

---

### 10.1 Word Tokenization

Add a `tokenizeWords` utility to `src/lib/parse-transcript.ts` (alongside the existing `parseTimeToSeconds` and `findActiveCueIndex`):

```ts
// src/lib/parse-transcript.ts
export function tokenizeWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}
```

**Design decisions:**
- Split on whitespace only — punctuation stays attached to the adjacent word (e.g., `"hello,"` is one token). This avoids stripping meaning from abbreviations, hyphenated words, and contractions.
- The `filter(Boolean)` removes empty strings from leading/trailing whitespace or multiple consecutive spaces.
- The result is `string[]` — raw display tokens, not normalized. The component renders each token as-is.

---

### 10.2 Proportional Word Index Formula

For the active cue, the highlighted word index is computed from the current playback position within the cue:

```ts
const cueStart = parseTimeToSeconds(activeCue.startTime)
const cueEnd   = parseTimeToSeconds(activeCue.endTime)
const cueDuration = cueEnd - cueStart

const elapsed  = currentTime - cueStart
const fraction = cueDuration > 0 ? Math.min(Math.max(elapsed / cueDuration, 0), 1) : 0

const highlightedIndex = Math.min(
  Math.floor(fraction * words.length),
  words.length - 1
)
```

**Edge cases:**
- `cueDuration === 0` (plain-text cues with empty timestamps) → `fraction` is `0` → first word is highlighted. Acceptable: plain-text transcripts have no timing data.
- `elapsed < 0` (clock skew or the cue just became active) → clamped to `0` → first word highlighted.
- `elapsed >= cueDuration` → clamped to `1.0` → last word highlighted.
- Single-word cue → `highlightedIndex` always `0`.

---

### 10.3 `CueText` Sub-component (New)

Extract the word-level rendering for the active cue into a dedicated component:

```ts
// src/components/CueText.tsx
interface CueTextProps {
  text: string
  cueStart: number       // parseTimeToSeconds(cue.startTime) — seconds
  cueEnd: number         // parseTimeToSeconds(cue.endTime) — seconds
  currentTime: number    // absolute playback time in seconds (from PlayerClient state)
  onWordClick?: (seekTime: number) => void  // called with cueStart for all words
}
```

**Rendering rules:**
- Words **before** `highlightedIndex`: muted / past styling (`opacity-50 text-on-surface-variant`)
- Word **at** `highlightedIndex`: active / karaoke styling (`bg-primary text-on-primary rounded px-0.5`)
- Words **after** `highlightedIndex`: default styling (`text-on-surface`)

```tsx
// Minimal implementation
'use client'

import { tokenizeWords, parseTimeToSeconds } from '@/lib/parse-transcript'

export default function CueText({ text, cueStart, cueEnd, currentTime, onWordClick }: CueTextProps) {
  const words = tokenizeWords(text)
  const cueDuration = cueEnd - cueStart
  const elapsed     = currentTime - cueStart
  const fraction    = cueDuration > 0 ? Math.min(Math.max(elapsed / cueDuration, 0), 1) : 0
  const highlightedIndex = Math.min(Math.floor(fraction * words.length), words.length - 1)

  return (
    <p
      data-testid="cue-text"
      className="text-sm text-on-surface dark:text-slate-100 leading-relaxed flex flex-wrap gap-x-1"
    >
      {words.map((word, i) => (
        <span
          key={i}
          data-testid={`word-${i}`}
          onClick={() => onWordClick?.(cueStart)}
          className={`cursor-pointer rounded transition-colors ${
            i < highlightedIndex
              ? 'opacity-50 text-on-surface-variant dark:text-slate-400'
              : i === highlightedIndex
              ? 'bg-primary text-on-primary px-0.5'
              : 'text-on-surface dark:text-slate-100'
          }`}
        >
          {word}
        </span>
      ))}
    </p>
  )
}
```

> **Why `onWordClick` always receives `cueStart`:** SRT/VTT transcripts only have cue-level timestamps — individual words have no timestamps. Seeking to the cue's start time is the most useful UX: it rewinds to the beginning of the sentence being clicked.

---

### 10.4 `TranscriptPanel` Changes

Add two new **optional** props to `TranscriptPanel`:

```ts
interface TranscriptPanelProps {
  cues: TranscriptCue[]
  activeCueIndex: number
  currentPage: number
  onPageChange: (page: number) => void
  loading: boolean
  currentTime?: number                    // NEW — absolute playback time (seconds); drives CueText
  onSeek?: (seconds: number) => void      // NEW — called when a cue or word is clicked
}
```

Both props are optional so `TranscriptPanel` remains usable before `MiniPlayer` is open (when there is no live `currentTime`).

**Changes inside the component:**

1. **Active cue rendering** — replace the current `<p>{cue.text}</p>` inside the active branch with `<CueText>`:
   ```tsx
   {isActive ? (
     <CueText
       text={cue.text}
       cueStart={parseTimeToSeconds(cue.startTime)}
       cueEnd={parseTimeToSeconds(cue.endTime)}
       currentTime={currentTime ?? 0}
       onWordClick={onSeek}
     />
   ) : (
     cue.text
   )}
   ```

2. **Click-to-seek on all cue rows** — add `onClick` to the cue `<div>`:
   ```tsx
   <div
     key={cue.index}
     ref={isActive ? activeCueRef : null}
     data-testid={isActive ? 'cue-active' : `cue-${i}`}
     onClick={() => onSeek?.(parseTimeToSeconds(cue.startTime))}
     className={`cursor-pointer transition-all ...`}
   >
   ```
   When `onSeek` is not provided, clicking is a no-op (the handler is absent / does nothing). No `cursor-pointer` style change is needed — it is already in the existing class list.

3. **Import additions** needed in `TranscriptPanel.tsx`:
   ```ts
   import { parseTimeToSeconds } from '@/lib/parse-transcript'
   import CueText from '@/components/CueText'
   ```

---

### 10.5 `MiniPlayer` — Expose `seekTo` via Imperative Handle

`MiniPlayer` currently creates a `YT.Player` instance inside a `useEffect` in a local variable. To expose `seekTo` externally:

1. Store the player in a **ref** (`playerRef`) instead of a local variable so it survives re-renders and is accessible via `useImperativeHandle`.
2. Convert `MiniPlayer` to `forwardRef` and expose a `MiniPlayerHandle`.

```ts
// src/components/MiniPlayer.tsx — additions

export interface MiniPlayerHandle {
  seekTo: (seconds: number) => void
}

// Convert default export to forwardRef:
const MiniPlayer = forwardRef<MiniPlayerHandle, MiniPlayerProps>(
  function MiniPlayer({ youtubeId, title, onClose, onTimeUpdate }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const playerRef = useRef<YT.Player | null>(null)  // ← new ref for YT.Player instance

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        playerRef.current?.seekTo(seconds, true)
      },
    }))

    useEffect(() => {
      // ... existing YT IFrame API setup, but:
      //   - assign player to playerRef.current instead of a local `player` variable
      //   - use playerRef.current.getCurrentTime() / getDuration() in the poll interval

      return () => {
        clearInterval(pollInterval)
        playerRef.current?.destroy()
        playerRef.current = null
      }
    }, [youtubeId])

    // ... existing JSX unchanged
  }
)

export default MiniPlayer
```

> **Important:** Only the `player` local variable inside `useEffect` needs to move to `playerRef.current`. All other `useEffect` logic (API script injection, `onYouTubeIframeAPIReady`, polling interval) remains identical.

---

### 10.6 `PlayerClient` Changes

```ts
// Additions to src/components/PlayerClient.tsx

import MiniPlayer, { MiniPlayerHandle } from '@/components/MiniPlayer'

// Inside component:
const miniPlayerRef = useRef<MiniPlayerHandle>(null)

function handleSeek(seconds: number) {
  miniPlayerRef.current?.seekTo(seconds)
}
```

Thread `ref` and `currentTime` / `onSeek` through to children:

```tsx
// MiniPlayer — add ref:
<MiniPlayer
  ref={miniPlayerRef}
  youtubeId={video.youtube_id}
  title={video.title}
  onClose={handleClose}
  onTimeUpdate={handleTimeUpdate}
/>

// TranscriptPanel — add new props:
<TranscriptPanel
  cues={cues}
  activeCueIndex={activeCueIndex}
  currentPage={currentPage}
  onPageChange={setCurrentPage}
  loading={loadingTranscript}
  currentTime={playbackTime.current}   // ← NEW
  onSeek={handleSeek}                  // ← NEW
/>
```

---

### 10.7 Files to Create / Modify

| File | Action | Change |
|---|---|---|
| `src/lib/parse-transcript.ts` | **Modify** | Export `tokenizeWords(text: string): string[]`. |
| `src/components/CueText.tsx` | **Create** | `'use client'` — renders the active cue text as individually-styled word spans with karaoke highlighting. Props: `text`, `cueStart`, `cueEnd`, `currentTime`, `onWordClick?`. |
| `src/components/TranscriptPanel.tsx` | **Modify** | Add optional `currentTime?: number` and `onSeek?: (seconds: number) => void` props. Import `parseTimeToSeconds` and `CueText`. Use `<CueText>` for the active cue. Add `onClick` to all cue rows. |
| `src/components/MiniPlayer.tsx` | **Modify** | Store `YT.Player` in `playerRef` (useRef). Export `MiniPlayerHandle` interface. Convert to `forwardRef`. Add `useImperativeHandle` exposing `seekTo`. |
| `src/components/PlayerClient.tsx` | **Modify** | Import `MiniPlayerHandle`. Add `miniPlayerRef = useRef<MiniPlayerHandle>(null)`. Add `handleSeek`. Pass `ref={miniPlayerRef}` to `<MiniPlayer>`. Pass `currentTime` and `onSeek` to `<TranscriptPanel>`. |

No API route changes. No DB or store changes. No changes to `LessonHero`, `PlaybackProgress`, `PlayerLoader`, or `PlayerPage`.

---

### 10.8 Data-testid Conventions for New Elements

| Element | `data-testid` |
|---|---|
| `CueText` root `<p>` | `cue-text` |
| Word span at position `i` (0-based) | `word-{i}` |

Existing `data-testid` values from Issue #121 (`cue-active`, `cue-{i}`, `transcript-panel`, etc.) are unchanged.

---

### 10.9 Test Coverage Expectations

#### New utility tests — `tokenizeWords`

Add to `src/lib/__tests__/parse-transcript.test.ts`:

| Scenario | Assertion |
|---|---|
| `tokenizeWords("hello, world!")` | `["hello,", "world!"]` — punctuation stays attached |
| `tokenizeWords("  spaces  ")` | `["spaces"]` — leading/trailing whitespace trimmed |
| `tokenizeWords("")` | `[]` — empty string returns empty array |
| `tokenizeWords("single")` | `["single"]` — single word |
| `tokenizeWords("it's a test")` | `["it's", "a", "test"]` — contractions preserved |

#### New pure formula tests (co-locate in parse-transcript test or CueText test)

| Scenario | Assertion |
|---|---|
| `currentTime === cueStart` | `highlightedIndex === 0` (first word) |
| `currentTime` is exactly halfway through cue | `highlightedIndex === Math.floor(words.length / 2)` |
| `currentTime >= cueEnd` | `highlightedIndex === words.length - 1` (last word) |
| `cueStart === cueEnd === 0` (plain-text cue, no timing) | `highlightedIndex === 0` (no crash) |
| `currentTime < cueStart` | `highlightedIndex === 0` (clamped; no negative index) |

#### New component tests — `CueText`

File: `src/components/__tests__/CueText.test.tsx`

| Scenario | Assertion |
|---|---|
| Renders all words as `data-testid="word-{i}"` spans | All tokens present in DOM |
| First word highlighted at `currentTime === cueStart` | `word-0` has `bg-primary` class; `word-1` (if exists) does not |
| Middle word highlighted at midpoint | Correct span has `bg-primary`; surrounding spans do not |
| Clicking any word calls `onWordClick` with `cueStart` | Mock `onWordClick`; click `word-2`; assert called with `cueStart` value |
| `onWordClick` not provided → no error on click | Click a span; no exception thrown |
| Empty text | Renders `<p data-testid="cue-text">` with no child spans |

#### Updated component tests — `TranscriptPanel`

File: `src/components/__tests__/TranscriptPanel.test.tsx`

| Scenario | Assertion |
|---|---|
| Clicking a non-active cue calls `onSeek` with `parseTimeToSeconds(cue.startTime)` | Mock `onSeek`; click `cue-0` div; assert called with correct seconds value |
| Clicking active cue word calls `onSeek` with cue start time | Mock `onSeek`; click `word-0` inside `cue-active`; assert called |
| When `onSeek` is not provided, clicking a cue does not throw | No error when clicking without `onSeek` prop |
| Active cue renders `CueText` (not plain text) when `currentTime` is provided | `data-testid="cue-text"` is present in DOM when `activeCueIndex >= 0` and `currentTime` prop set |
| Active cue renders plain `<p>` text when `currentTime` is not provided (no prop) | `data-testid="cue-text"` absent; cue text still visible as string |

#### Updated component tests — `MiniPlayer`

File: `src/components/__tests__/MiniPlayer.test.tsx`

| Scenario | Assertion |
|---|---|
| `seekTo` ref method calls `player.seekTo(seconds, true)` | Render with `ref`; call `ref.current.seekTo(42)`; assert mock `player.seekTo` was called with `(42, true)` |
| `playerRef.current` is nullified on unmount | After unmount, calling `seekTo` does not throw (ref is `null`) |

Use the existing `window.YT` mock pattern from Section 8.5:
```ts
const mockSeekTo = jest.fn()
const mockPlayerInstance = {
  getCurrentTime: jest.fn().mockReturnValue(10),
  getDuration: jest.fn().mockReturnValue(120),
  seekTo: mockSeekTo,
  destroy: jest.fn(),
}
window.YT = {
  Player: jest.fn().mockImplementation((_el, opts) => {
    opts.events.onStateChange({ data: window.YT.PlayerState.PLAYING })
    return mockPlayerInstance
  }),
  PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
} as unknown as typeof YT
```

#### Updated component tests — `PlayerClient`

File: `src/components/__tests__/PlayerClient.test.tsx`

| Scenario | Assertion |
|---|---|
| Clicking a non-active cue row calls `miniPlayerRef.current.seekTo` | Spy on `MiniPlayerHandle.seekTo`; click `cue-0`; assert seekTo called with correct time |
| Clicking a word in the active cue calls `seekTo` with the active cue's start time | Click `word-1` inside `cue-active`; assert `seekTo` called |
| `TranscriptPanel` receives `currentTime` matching `playbackTime.current` | After `onTimeUpdate(45, 300)` fires, `TranscriptPanel`'s `currentTime` prop is `45` (verify via the highlighted word in an active cue) |

> **Testing `forwardRef` components:** Render `MiniPlayer` with `React.createRef<MiniPlayerHandle>()` and pass it as `ref`. After render (and timer flushes for the YT API setup), call `ref.current.seekTo(42)` to exercise the imperative handle.

---

### 10.10 Full Data-flow Summary (Issues #120 + #121 + #122)

```
YT.Player (inside MiniPlayer)
  → polls getCurrentTime() every 250 ms while playing
  → calls onTimeUpdate(current, duration)          ← MiniPlayer prop

PlayerClient.handleTimeUpdate(current, duration)
  → setPlaybackTime({ current, duration })         ← #120: drives PlaybackProgress
  → setActiveCueIndex(findActiveCueIndex(cues, current))  ← #121: drives cue highlight
  → setCurrentPage(...)                            ← #121: auto-advances page

<TranscriptPanel
  activeCueIndex={activeCueIndex}
  currentPage={currentPage}
  currentTime={playbackTime.current}               ← #122: drives CueText word highlight
  onSeek={handleSeek}                              ← #122: click-to-seek
/>
  → active cue renders <CueText
      cueStart=... cueEnd=... currentTime=...      ← #122: proportional word highlight
      onWordClick={onSeek}
    />

User clicks word / cue
  → onSeek(cueStartSeconds)
  → miniPlayerRef.current.seekTo(cueStartSeconds) ← #122: imperative handle
  → playerRef.current.seekTo(seconds, true)       ← YT.Player seek
```
