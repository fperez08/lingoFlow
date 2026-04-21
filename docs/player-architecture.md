# LingoFlow — Player & Mini-Player Architecture

> **Purpose**: Detailed reference for the player page, mini-player (LocalVideoPlayer), transport controls, seek flow, and test patterns.
> **Last updated**: 2026-07, HEAD: main.

---

## 1. Component Tree

```
PlayerPage  [server component]  src/app/(app)/player/[id]/page.tsx
  └─ PlayerLoader  [client]     src/components/PlayerLoader.tsx
       │   usePlayerData(id)  ← parallel React Query fetch (video + transcript)
       └─ PlayerClient  [client]  src/components/PlayerClient.tsx
            ├─ LessonHero           ← hero section: title, author, tags, Play button
            ├─ PlaybackProgress     ← display-only progress bar (while mini-player open)
            ├─ CueText[]            ← tokenised transcript lines; word-click → WordSidebar
            ├─ LocalVideoPlayer     ← floating <video> mini-player (conditional)
            └─ WordSidebar          ← slide-over word detail panel (conditional)
```

---

## 2. Data-Fetching Strategy

### PlayerLoader

Uses `usePlayerData(id)` — a React Query `useQueries` hook — to **parallel-fetch** the video record and its transcript cues:

```ts
// src/hooks/usePlayerData.ts
const [videoResult, transcriptResult] = useQueries({
  queries: [
    { queryKey: queryKeys.video(id),      queryFn: () => client.getVideo(id) },
    { queryKey: queryKeys.transcript(id), queryFn: () => client.getTranscript(id) },
  ],
})
```

Returns `{ video, cues, isLoading, error }`.  
Both results are cached by React Query under keys `['videos', id]` and `['transcript', id]`.

### PlayerClient — transcript fallback

`PlayerClient` accepts a `cues?: TranscriptCue[]` prop. When `cues` is `undefined` (not passed), it fires a **one-shot `useEffect` fetch** to `GET /api/videos/:id/transcript`. In the normal render path `PlayerLoader` supplies `cues`, so this fallback is not triggered.

```ts
useEffect(() => {
  if (propCues !== undefined) return  // skip if cues provided
  fetch(`/api/videos/${video.id}/transcript`)
    .then(r => r.json())
    .then(data => setCues(data.cues ?? []))
    .catch(() => setCues([]))
    .finally(() => setLoadingTranscript(false))
}, [video.id])
```

---

## 3. PlayerClient State

| Variable | Type | Purpose |
|---|---|---|
| `cues` | `TranscriptCue[]` | Transcript cues (from prop or fallback fetch) |
| `loadingTranscript` | `boolean` | True while fallback fetch in progress |
| `activeCueIndex` | `number` | Manually-selected cue index (cue-click navigation) |
| `isMiniPlayerOpen` | `boolean` | Whether `LocalVideoPlayer` is rendered |
| `playbackTime` | `{ current: number, duration: number }` | Updated by mini-player polling at 250 ms |
| `requestedSeekTime` | `number \| null` | One-shot seek target in seconds; `null` after applied |
| `selectedWord` | `{ word: string, contextSentence: string } \| null` | Drives `WordSidebar` visibility |

### Active-cue resolution

```
playbackCueIndex  = cues.findIndex(cue => now >= start && now < end)   // -1 when paused
highlightedCueIndex = playbackCueIndex >= 0 ? playbackCueIndex : activeCueIndex
```

Auto-scroll runs on `highlightedCueIndex` change via `element.scrollIntoView({ block: 'center', behavior: 'smooth' })`.

---

## 4. Seek Flow

```
Cue div onClick
  → setActiveCueIndex(i)
  → setRequestedSeekTime(parseTimeToSeconds(cue.startTime))
        ↓  prop: seekToTime
LocalVideoPlayer useEffect [seekToTime]
  → videoRef.current.currentTime = seekToTime
  → onSeekApplied?.()           ← prop callback
        ↓
PlayerClient: setRequestedSeekTime(null)
```

`requestedSeekTime` is cleared immediately after the seek is applied, preventing the seek from re-applying on re-render.

---

## 5. LocalVideoPlayer (Mini-Player)

**File**: `src/components/LocalVideoPlayer.tsx`  
**Appearance**: fixed bottom-right (mobile), fixed top-right (desktop ≥ `md`):

```
fixed bottom-4 right-4 z-50 w-80 shadow-2xl rounded-xl overflow-hidden bg-black
md:bottom-auto md:top-20
```

### Props

```ts
interface LocalVideoPlayerProps {
  videoId: string               // used to build src="/api/videos/{videoId}/stream"
  title: string
  onClose: () => void           // called by close button; PlayerClient resets all state
  onTimeUpdate?: (currentTime: number, duration: number) => void
  seekToTime?: number | null    // triggers currentTime assignment on change
  onSeekApplied?: () => void    // callback after seek applied
}
```

### Internal state

| Variable | Type | Initial | Purpose |
|---|---|---|---|
| `isPlaying` | `boolean` | `true` | Tracks play/pause; updated by video `play`/`pause`/`ended` events |
| `speed` | `SpeedOption` | `1` | Current playback rate |

`SpeedOption` = `0.5 | 0.75 | 1 | 1.25 | 1.5 | 2`

### Time polling

When playing, a `setInterval` at **250 ms** calls `onTimeUpdate(el.currentTime, el.duration)`. Polling starts on `onPlay` event, stops on `onPause` / `onEnded` / component unmount.

```ts
const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

function startPolling() {
  if (pollIntervalRef.current) return
  pollIntervalRef.current = setInterval(() => {
    if (el && el.duration > 0) onTimeUpdate?.(el.currentTime, el.duration)
  }, 250)
}
```

---

## 6. Transport Controls

All controls live in the dark bar below the video (`bg-gray-900`):

```
[ Rewind 10s ] [ Play/Pause ] [ Fast-forward 10s ]    [ Speed ▾ ]
```

### Rewind (`mini-player-rewind`)

```ts
function handleRewind() {
  el.currentTime = Math.max(0, el.currentTime - 10)
}
```

Icon: circular-arrow SVG (counter-clockwise) with embedded `<text>10</text>` at `fontSize="6"`.

### Play / Pause (`mini-player-play-pause`)

```ts
function handlePlayPause() {
  el.paused ? el.play() : el.pause()
}
```

`aria-label` toggles between `"Pause"` (when playing) and `"Play"` (when paused).

Icons:
- **Playing**: two-bar pause SVG — `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`
- **Paused**: triangle play SVG — `<path d="M8 5v14l11-7z"/>`

### Fast-forward (`mini-player-fastforward`)

```ts
function handleFastForward() {
  el.currentTime = Math.min(el.duration || 0, el.currentTime + 10)
}
```

Icon: circular-arrow SVG (clockwise) with embedded `<text>10</text>` at `fontSize="6"`.

### Speed selector (`mini-player-speed`)

```tsx
<select value={speed} onChange={handleSpeedChange}>
  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => <option value={s}>{s}×</option>)}
</select>
```

On change: sets `speed` state and `videoRef.current.playbackRate`.

### Close button (`mini-player-close`)

Floating overlay (absolute top-right of the video area). Calls `videoRef.current.pause()` then `onClose()`.

---

## 7. PlaybackProgress

**File**: `src/components/PlaybackProgress.tsx`  
**Display only** — no click-to-seek. Receives `currentTime` and `duration` (seconds) as props from `PlayerClient`.

```
[ ████░░░░░░░░░░░░░░░ ]
  1:30                5:00
```

| `data-testid` | Element |
|---|---|
| `playback-progress` | container |
| `progress-bar-fill` | filled bar (`width: ${pct}%`) |
| `current-time` | elapsed time label |
| `duration` | total duration label |

Time format: `M:SS` (no hours) — `formatTime(seconds)` → `${m}:${s.padStart(2,'0')}`.

---

## 8. Component `data-testid` Reference

| Component | `data-testid` | Element |
|---|---|---|
| `PlayerClient` | `player-client` | root `<div>` |
| `LessonHero` | `lesson-hero` | root `<div>` |
| `LessonHero` | `play-button` | Play `<button>` |
| `LocalVideoPlayer` | `mini-player` | root container |
| `LocalVideoPlayer` | `local-video` | `<video>` element |
| `LocalVideoPlayer` | `mini-player-close` | close overlay button |
| `LocalVideoPlayer` | `mini-player-rewind` | Rewind 10s button |
| `LocalVideoPlayer` | `mini-player-play-pause` | Play/Pause toggle button |
| `LocalVideoPlayer` | `mini-player-fastforward` | Fast-forward 10s button |
| `LocalVideoPlayer` | `mini-player-speed` | Speed `<select>` |
| `PlaybackProgress` | `playback-progress` | container |
| `PlaybackProgress` | `progress-bar-fill` | fill bar |
| `PlaybackProgress` | `current-time` | elapsed time `<span>` |
| `PlaybackProgress` | `duration` | total duration `<span>` |
| `CueText` | `cue-{i}` | per-cue `<div>` (on parent in `PlayerClient`) |
| `CueText` | `word-{normalized}` | per-word `<span>` |
| `WordSidebar` | `word-sidebar` | panel `<div>` |
| `WordSidebar` | `word-sidebar-close` | close button |
| `WordSidebar` | `sidebar-word` | word display `<span>` |
| `WordSidebar` | `sidebar-context` | context sentence `<p>` |
| `WordSidebar` | `status-toggle` | mastered/unknown toggle button |

---

## 9. Test Patterns

### LocalVideoPlayer

File: `src/components/__tests__/LocalVideoPlayer.test.tsx`

- **Environment**: `jsdom` (default — no `@jest-environment` override needed)
- **Video mock**: `HTMLVideoElement.prototype.play` / `pause` overridden with `jest.fn()`; `currentTime` / `duration` set via `Object.defineProperty`
- **Polling test**: `jest.useFakeTimers()` + `jest.advanceTimersByTime(300)` to assert `onTimeUpdate` called
- **Seek test**: rerender with new `seekToTime` prop; assert `video.currentTime` set and `onSeekApplied` called

```ts
it('applies seekToTime when prop changes', () => {
  const { rerender } = render(<LocalVideoPlayer {...defaultProps} seekToTime={null} />)
  const onSeekApplied = jest.fn()
  rerender(<LocalVideoPlayer {...defaultProps} seekToTime={30} onSeekApplied={onSeekApplied} />)
  expect(video.currentTime).toBe(30)
  expect(onSeekApplied).toHaveBeenCalledTimes(1)
})
```

### PlayerClient

File: `src/components/__tests__/PlayerClient.test.tsx`

- **Hooks mocked**: `@/hooks/useVocabulary` — both `useVocabulary` and `useUpdateWordStatus`
- **LocalVideoPlayer mocked**: exposes `onTimeUpdate` via module-level `let mockCapturedOnTimeUpdate`
- **Variable naming rule**: mock-capture vars must start with `mock` (babel-jest hoisting)
- **`act()`** required when calling captured callbacks that trigger state updates

```ts
let mockCapturedOnTimeUpdate: ((c: number, d: number) => void) | undefined

jest.mock('@/components/LocalVideoPlayer', () => ({
  __esModule: true,
  default: ({ onClose, onTimeUpdate }: ...) => {
    mockCapturedOnTimeUpdate = onTimeUpdate
    return <div data-testid="mini-player"><button data-testid="mini-player-close" onClick={onClose}>Close</button></div>
  },
}))

// Driving time update from test:
act(() => { mockCapturedOnTimeUpdate?.(90, 300) })
expect(screen.getByTestId('current-time')).toHaveTextContent('1:30')
```

### PlaybackProgress

File: `src/components/__tests__/PlaybackProgress.test.tsx`

Pure display component — tests verify rendered text and `style` on fill bar. No user interaction beyond confirming clicks do not change state.

### MiniPlayer.test.tsx

`src/components/__tests__/MiniPlayer.test.tsx` is a **placeholder** — the original YouTube-only `MiniPlayer` component was removed. The file contains a single no-op test to keep the test runner from erroring on an empty suite.
