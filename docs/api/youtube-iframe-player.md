# YouTube IFrame Player API — Reference Notes

> Relevant to: **Issue #119 — Player shell with floating mini-player**, **Issue #120 — Playback progress indicator wired to player time**
>
> The current `PlayerClient.tsx` uses a plain `<iframe src="https://www.youtube.com/embed/...">` with no
> programmatic control. Implementing a mini-player that can be paused when closed requires the
> **YouTube IFrame Player API** (loaded via `https://www.youtube.com/iframe_api`).

---

## 1. Loading the API (no npm package needed)

The API is loaded by injecting a `<script>` tag once. React pattern:

```ts
// Load once, then the global `YT` object becomes available
useEffect(() => {
  if (window.YT) return          // already loaded
  const tag = document.createElement('script')
  tag.src = 'https://www.youtube.com/iframe_api'
  document.body.appendChild(tag)
}, [])
```

The API calls `window.onYouTubeIframeAPIReady()` when ready. Use a ref-based callback or the
`onReady` player event instead of the global to stay React-friendly.

---

## 2. Creating a Player instance

```ts
const player = new YT.Player(elementOrId, {
  videoId: 'VIDEO_ID',
  width: '100%',
  height: '100%',
  playerVars: {
    autoplay: 1,   // 0 | 1
    controls: 1,   // show native controls
    rel: 0,        // don't show related videos
    modestbranding: 1,
  },
  events: {
    onReady: (e) => { /* e.target is the player */ },
    onStateChange: (e) => { /* e.data is a YT.PlayerState value */ },
    onError: (e) => { /* e.data is an error code */ },
  },
})
```

`YT.Player` **replaces** the target DOM element with the `<iframe>` — give it a plain `<div>` ref,
not an existing `<iframe>`.

---

## 3. Key Playback Methods

| Method | Description |
|---|---|
| `player.playVideo()` | Start / resume playback |
| `player.pauseVideo()` | Pause playback |
| `player.stopVideo()` | Stop and reset to start |
| `player.seekTo(seconds, allowSeekAhead)` | Seek; set `allowSeekAhead: true` for buffering |
| `player.getCurrentTime()` | Returns elapsed seconds (`number`) |
| `player.getDuration()` | Total duration in seconds |
| `player.getPlayerState()` | Returns a `YT.PlayerState` value (see §4) |
| `player.mute()` / `player.unMute()` | Mute control |
| `player.setVolume(0–100)` | Set volume |
| `player.destroy()` | Remove player; call in cleanup `useEffect` |

---

## 4. Player State Values (`YT.PlayerState`)

```ts
YT.PlayerState.UNSTARTED  // -1
YT.PlayerState.ENDED      //  0
YT.PlayerState.PLAYING    //  1
YT.PlayerState.PAUSED     //  2
YT.PlayerState.BUFFERING   //  3
YT.PlayerState.CUED        //  5
```

Use in the `onStateChange` event handler:

```ts
onStateChange: (e) => {
  if (e.data === YT.PlayerState.ENDED) { /* handle end */ }
}
```

For the progress indicator, respond to PLAYING to start polling and to PAUSED/ENDED/BUFFERING to stop:

```ts
onStateChange: (e) => {
  if (e.data === YT.PlayerState.PLAYING) {
    startProgressPolling()
  } else {
    stopProgressPolling()
  }
}
```

---

## 5. TypeScript Types

No first-party `@types/youtube` package exists in the repo. Add a minimal ambient declaration or
install the community types:

```bash
pnpm add -D @types/youtube
```

This provides `YT.Player`, `YT.PlayerState`, `YT.PlayerEvent`, `YT.OnStateChangeEvent`, etc.

Without the package, extend the global `Window` interface minimally:

```ts
// src/types/youtube.d.ts
declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
  }
}
```

---

## 6. Mini-Player: React Portal + Fixed Positioning

### Why a Portal?

The mini-player must render **outside** the `PlayerClient` subtree so it persists when the lesson
shell unmounts or re-renders. Use `ReactDOM.createPortal` to mount it into `document.body`.

```tsx
import { createPortal } from 'react-dom'

function MiniPlayer({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 w-80 aspect-video shadow-2xl rounded-xl overflow-hidden">
      {/* YT.Player target div */}
      <div ref={playerDivRef} className="w-full h-full" />
      <button onClick={onClose} className="absolute top-2 right-2 ...">✕</button>
    </div>,
    document.body
  )
}
```

### Tailwind classes for the overlay

```
fixed bottom-4 right-4   — bottom-right anchor
z-50                      — above all other content
w-80 (320px)              — compact width
aspect-video              — 16:9 ratio
shadow-2xl rounded-xl     — visual polish
overflow-hidden           — clip iframe to rounded corners
```

---

## 7. Pause-on-Close Pattern

When the user closes the mini-player call `player.pauseVideo()` **before** unmounting:

```tsx
function handleClose() {
  playerRef.current?.pauseVideo()   // pause first
  setMiniPlayerOpen(false)           // then unmount
}
```

If `destroy()` is used instead, the iframe is removed and playback stops automatically, but the
player instance cannot be reused — prefer `pauseVideo()` + hide for a toggle-able mini-player.

---

## 8. State Lift: Lesson Shell → Mini-Player

The lesson page shell needs to:

1. Keep `isMiniPlayerOpen: boolean` in React state (or a context if shared across routes).
2. Pass `videoId` and `onClose` down to `<MiniPlayer>`.
3. Replace the current `<iframe>` hero with a thumbnail + **Play** button.
4. On Play click: `setIsMiniPlayerOpen(true)` — the portal renders and auto-plays.

```tsx
// Thumbnail hero (replaces inline iframe)
<div className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group"
     onClick={() => setMiniPlayerOpen(true)}>
  <img src={`https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`}
       alt={video.title} className="w-full h-full object-cover" />
  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
    <PlayIcon className="w-16 h-16 text-white drop-shadow-lg" />
  </div>
</div>

{isMiniPlayerOpen && <MiniPlayer videoId={video.youtube_id} onClose={() => setMiniPlayerOpen(false)} />}
```

---

## 9. YouTube Thumbnail URL Reference

| Quality | URL Pattern |
|---|---|
| Max resolution | `https://img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg` |
| High quality | `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg` |
| Medium quality | `https://img.youtube.com/vi/{VIDEO_ID}/mqdefault.jpg` |

`maxresdefault` may 404 for older videos; fall back to `hqdefault` with an `onError` handler on
the `<img>` element.

---

- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- React `createPortal`: https://react.dev/reference/react-dom/createPortal
- `@types/youtube` community types: https://www.npmjs.com/package/@types/youtube

---

## 11. Polling Playback Progress (for a Progress Indicator)

`getCurrentTime()` and `getDuration()` are synchronous getters that can be called at any time after
the player is ready. They do **not** emit events — you must poll them.

### `getDuration()` caveat

`getDuration()` returns `0` until the video metadata is loaded. Safe places to read it:

- Inside the `onReady` callback (metadata is guaranteed to be available then).
- After the first `PLAYING` state change.

Never use it as the denominator for a progress percentage without a `> 0` guard.

### Option A — `setInterval` (simpler, ~250 ms resolution is fine for a progress bar)

```ts
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

function startProgressPolling() {
  if (intervalRef.current) return                // already running
  intervalRef.current = setInterval(() => {
    const player = playerRef.current
    if (!player) return
    const current = player.getCurrentTime()
    const total   = player.getDuration()
    if (total > 0) setProgress(current / total)  // 0–1 fraction
  }, 250)
}

function stopProgressPolling() {
  if (intervalRef.current) {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }
}

// Clean up on unmount
useEffect(() => () => stopProgressPolling(), [])
```

Wire `startProgressPolling` / `stopProgressPolling` to `onStateChange` (see §4).

### Option B — `requestAnimationFrame` (smoother, matches display refresh)

```ts
const rafRef = useRef<number | null>(null)

function tick() {
  const player = playerRef.current
  if (player) {
    const current = player.getCurrentTime()
    const total   = player.getDuration()
    if (total > 0) setProgress(current / total)
  }
  rafRef.current = requestAnimationFrame(tick)
}

function startProgressPolling() {
  if (rafRef.current) return
  rafRef.current = requestAnimationFrame(tick)
}

function stopProgressPolling() {
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }
}

useEffect(() => () => stopProgressPolling(), [])
```

**Prefer `setInterval` at 250 ms** for a simple progress bar — rAF runs at 60 fps and causes
unnecessary re-renders in React without additional throttling.

### Full `onReady` + `onStateChange` wiring

```ts
events: {
  onReady: (e) => {
    const total = e.target.getDuration()
    setDuration(total)      // store for display ("1:23 / 4:56")
  },
  onStateChange: (e) => {
    if (e.data === YT.PlayerState.PLAYING) {
      startProgressPolling()
    } else {
      stopProgressPolling()
      // Snap to final position on ENDED
      if (e.data === YT.PlayerState.ENDED) setProgress(1)
    }
  },
}
```

---

## 12. Read-Only Progress Bar UI

The progress indicator for Issue #120 must be **read-only** — the user cannot scrub from it.
Two HTML approaches:

### Option A — `<progress>` element (semantic, accessible, recommended)

```tsx
<progress
  value={progress}   // 0–1 fraction (or current seconds)
  max={1}            // (or total duration seconds)
  aria-label="Playback progress"
  className="w-full h-2 appearance-none [&::-webkit-progress-bar]:rounded-full
             [&::-webkit-progress-bar]:bg-gray-200
             [&::-webkit-progress-value]:rounded-full
             [&::-webkit-progress-value]:bg-blue-500"
/>
```

- No interactivity by default — users cannot click or drag.
- Screen readers announce it as a progress indicator automatically via the `progressbar` ARIA role.
- Style the bar with Tailwind `[&::-webkit-progress-value]` / `[&::-moz-progress-bar]` pseudo-elements.

### Option B — `<input type="range">` (disabled)

```tsx
<input
  type="range"
  min={0}
  max={duration}          // total seconds from getDuration()
  value={currentTime}     // seconds from getCurrentTime()
  disabled                // prevents interaction; also sets aria-disabled="true"
  readOnly                // belt-and-suspenders in React
  onChange={() => {}}     // React controlled input — suppress warning
  aria-label="Playback progress"
  className="w-full accent-blue-500 cursor-default opacity-70"
/>
```

- `disabled` stops pointer events and keyboard interaction.
- Screen readers may announce it as a slider rather than a progress bar — less semantically correct.
- **Prefer `<progress>`** unless you need the range thumb for visual styling.

### Accessible time display

Pair the bar with a visible time label for sighted users and as a text alternative:

```tsx
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

<div className="flex items-center gap-2 text-sm text-gray-500">
  <span aria-live="off">{formatTime(currentTime)}</span>
  <progress value={progress} max={1} aria-label="Playback progress" className="flex-1 h-1.5" />
  <span>{formatTime(duration)}</span>
</div>
```

`aria-live="off"` prevents the time counter from flooding screen reader announcements.

---

## 13. Official References

- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- React `createPortal`: https://react.dev/reference/react-dom/createPortal
- `@types/youtube` community types: https://www.npmjs.com/package/@types/youtube
- MDN `<progress>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/progress
- MDN ARIA `progressbar` role: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/progressbar_role
