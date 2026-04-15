# Transcript Sync — Reference Notes

> Relevant to: **Issue #121 — Cue-synced paged transcript**
>
> Covers the `TranscriptCue` interface, active-cue detection, page boundary logic, and
> React patterns for keeping a paged transcript in sync with YouTube player playback time.

---

## 1. `TranscriptCue` Interface

Defined in `src/lib/parse-transcript.ts` and returned by `GET /api/videos/:id/transcript`.

```ts
export interface TranscriptCue {
  index: number      // 1-based sequential cue number
  startTime: string  // SRT/VTT timestamp string, e.g. "00:01:23,456"
  endTime: string    // SRT/VTT timestamp string, e.g. "00:01:25,890"
  text: string       // Cue text (multi-line joined with a space)
}
```

### Timestamp format

Both `startTime` and `endTime` are **strings** in the form `HH:MM:SS,mmm` (SRT) or `HH:MM:SS.mmm`
(VTT, treated identically by the parser). They are **not** numbers.

The YouTube IFrame API's `getCurrentTime()` returns **seconds as a `number`**. You must convert
cue timestamps to seconds before any comparison.

```ts
/** "HH:MM:SS,mmm" or "HH:MM:SS.mmm" → decimal seconds */
export function parseTimestamp(ts: string): number {
  const [hms, ms = '0'] = ts.replace(',', '.').split('.')
  const [h, m, s] = hms.split(':').map(Number)
  return h * 3600 + m * 60 + s + parseInt(ms, 10) / 1000
}
```

**Example:** `"00:01:23,456"` → `83.456`

For plain-text cues (unknown format), `startTime` and `endTime` are empty strings (`""`). Guard
against this: treat a cue with an empty `startTime` as always inactive.

### API response shape

```ts
// GET /api/videos/:id/transcript
// Response body
{ cues: TranscriptCue[] }
```

Fetched via React Query:

```ts
const { data } = useQuery({
  queryKey: ['transcript', videoId],
  queryFn: () => fetch(`/api/videos/${videoId}/transcript`).then(r => r.json()),
})
const cues: TranscriptCue[] = data?.cues ?? []
```

---

## 2. Pre-processing: Parse Timestamps Once

Parse all timestamps up-front (when cues are first loaded) rather than on every poll tick.
Store the parsed values alongside the original cues.

```ts
interface ParsedCue extends TranscriptCue {
  startSec: number
  endSec: number
}

function parseCues(cues: TranscriptCue[]): ParsedCue[] {
  return cues.map(c => ({
    ...c,
    startSec: c.startTime ? parseTimestamp(c.startTime) : -1,
    endSec:   c.endTime   ? parseTimestamp(c.endTime)   : -1,
  }))
}
```

Use `useMemo` in the component so this runs only when `cues` changes:

```ts
const parsedCues = useMemo(() => parseCues(cues), [cues])
```

---

## 3. Active-Cue Lookup

Given the current playback time in seconds, find the cue that is currently "active"
(i.e., `startSec <= currentTime < endSec`).

### Option A — Linear scan (simple, fine for typical transcripts ≤ 2000 cues)

```ts
function findActiveCue(cues: ParsedCue[], currentTimeSec: number): ParsedCue | null {
  for (let i = cues.length - 1; i >= 0; i--) {
    if (cues[i].startSec <= currentTimeSec) {
      // Return this cue if playback is still within it, or if no next cue exists
      if (cues[i].endSec < 0 || currentTimeSec < cues[i].endSec) {
        return cues[i]
      }
      // Gap between cues — no active cue
      return null
    }
  }
  return null
}
```

Scanning backwards finds the most recent cue start quickly and exits early.

### Option B — Binary search (O(log n), preferred for large transcripts)

```ts
function findActiveCueBinary(cues: ParsedCue[], currentTimeSec: number): ParsedCue | null {
  let lo = 0
  let hi = cues.length - 1
  let result: ParsedCue | null = null

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    if (cues[mid].startSec <= currentTimeSec) {
      result = cues[mid]
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  // result is the last cue whose startSec <= currentTime
  // Verify the playback time is still within the cue's endSec
  if (result && result.endSec >= 0 && currentTimeSec >= result.endSec) {
    return null // in a gap between cues
  }
  return result
}
```

**Precondition:** `cues` must be sorted by `startSec` ascending (they are, as produced by
`parseTranscript`).

---

## 4. Polling for Active Cue

Call the lookup inside a `setInterval` (250 ms is sufficient for human-readable cue granularity).
Wire start/stop to the player's `onStateChange` event — the same pattern as progress polling.

```ts
const [activeCueIndex, setActiveCueIndex] = useState<number | null>(null)
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

function startCuePolling() {
  if (intervalRef.current) return
  intervalRef.current = setInterval(() => {
    const player = playerRef.current
    if (!player) return
    const t = player.getCurrentTime()
    const cue = findActiveCueBinary(parsedCues, t)
    setActiveCueIndex(cue?.index ?? null)
  }, 250)
}

function stopCuePolling() {
  if (intervalRef.current) {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }
}

useEffect(() => () => stopCuePolling(), [])
```

Wire to `onStateChange`:

```ts
onStateChange: (e) => {
  if (e.data === YT.PlayerState.PLAYING) {
    startCuePolling()
  } else {
    stopCuePolling()
  }
}
```

---

## 5. Paging: Dividing Cues into Pages

Split `parsedCues` into fixed-size pages once (with `useMemo`). A page size of **10 cues** is a
good default for readability; expose it as a prop or constant.

```ts
const PAGE_SIZE = 10

const pages = useMemo(
  () => chunk(parsedCues, PAGE_SIZE),
  [parsedCues]
)

/** Utility: split an array into chunks of size n */
function chunk<T>(arr: T[], n: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n))
  return result
}
```

The **page index** for a given cue index:

```ts
function pageForCue(cueIndex: number, pageSize: number): number {
  return Math.floor((cueIndex - 1) / pageSize) // cueIndex is 1-based
}
```

---

## 6. Auto-Page-Advance

Advance the page whenever the active cue moves to a different page. Use `useEffect` watching
`activeCueIndex`:

```ts
const [currentPage, setCurrentPage] = useState(0)

useEffect(() => {
  if (activeCueIndex == null) return
  const targetPage = pageForCue(activeCueIndex, PAGE_SIZE)
  if (targetPage !== currentPage) {
    setCurrentPage(targetPage)
  }
}, [activeCueIndex])
```

**Design considerations:**

- **Debounce is not needed** — `activeCueIndex` is already driven by a 250 ms poll interval and
  changes at most once per cue boundary.
- **Seeking backward** is handled naturally: `pageForCue` computes the correct page from
  wherever the playback lands.
- If users **manually navigate pages** (previous/next buttons), set `currentPage` directly. The
  auto-advance will resume on the next cue boundary crossing, so do not fight the user by
  immediately jumping back.

---

## 7. Active-Cue Highlighting

Pass `activeCueIndex` into the transcript page renderer and apply a highlight style:

```tsx
function TranscriptPage({
  cues,
  activeCueIndex,
}: {
  cues: ParsedCue[]
  activeCueIndex: number | null
}) {
  return (
    <ol className="space-y-1">
      {cues.map(cue => (
        <li
          key={cue.index}
          data-cue-index={cue.index}
          className={
            cue.index === activeCueIndex
              ? 'bg-yellow-100 text-yellow-900 rounded px-2 py-0.5 font-medium'
              : 'px-2 py-0.5 text-gray-700'
          }
        >
          {cue.text}
        </li>
      ))}
    </ol>
  )
}
```

---

## 8. Auto-Scroll to Active Cue (within a Page)

When the active cue changes, scroll it into view inside the transcript container. Use a `ref` map
or a `data-cue-index` attribute with `querySelector`.

### Pattern A — `scrollIntoView` (simple)

```ts
useEffect(() => {
  if (activeCueIndex == null) return
  const el = containerRef.current?.querySelector(
    `[data-cue-index="${activeCueIndex}"]`
  )
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}, [activeCueIndex])
```

- `block: 'nearest'` scrolls only if the element is already out of view — prevents jarring jumps
  when the active cue is already visible near the center.
- `behavior: 'smooth'` gives a pleasant animation; use `'instant'` if the page also just changed
  (to avoid double-animation confusion).

### Pattern B — `IntersectionObserver` (detect visibility before scrolling)

Use `IntersectionObserver` to scroll only when the active cue has left the visible area of the
transcript container:

```ts
useEffect(() => {
  if (activeCueIndex == null || !containerRef.current) return

  const el = containerRef.current.querySelector(
    `[data-cue-index="${activeCueIndex}"]`
  ) as HTMLElement | null
  if (!el) return

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      observer.disconnect()
    },
    { root: containerRef.current, threshold: 1.0 }
  )
  observer.observe(el)

  return () => observer.disconnect()
}, [activeCueIndex])
```

- `threshold: 1.0` — fires when the element is fully out of view.
- `root: containerRef.current` — scopes the intersection check to the transcript container,
  not the viewport.

**Prefer Pattern A** (`scrollIntoView` directly) in the initial implementation. It is simpler and
covers the common case. Reach for `IntersectionObserver` only if scrollIntoView causes noticeable
unnecessary motion.

---

## 9. Seeking on Cue Click

Allow users to jump to a cue's start time by clicking it. Use the `seekTo` API from `YT.Player`:

```tsx
<li
  key={cue.index}
  data-cue-index={cue.index}
  className={...}
  onClick={() => {
    playerRef.current?.seekTo(cue.startSec, true)
    playerRef.current?.playVideo()
  }}
>
  {cue.text}
</li>
```

`seekTo(seconds, true)` — the second argument (`allowSeekAhead: true`) tells the player to
request buffering ahead of the seek point.

---

## 10. Combined State Shape

A minimal state interface for the transcript sync feature:

```ts
interface TranscriptSyncState {
  parsedCues: ParsedCue[]      // memoised from raw cues
  pages: ParsedCue[][]         // memoised pages
  currentPage: number          // 0-based page index (display +1)
  activeCueIndex: number | null // 1-based cue index, or null if in a gap
}
```

Derived values (computed, not stored in state):

```ts
const currentCues = pages[currentPage] ?? []
const totalPages = pages.length
```

---

## 11. Edge Cases

| Scenario | Handling |
|---|---|
| Cue with empty `startTime` (plain-text format) | `parseTimestamp` returns `-1`; binary search never matches it; cue is never active |
| Gap between cues (silence / no subtitle) | `findActiveCueBinary` returns `null`; highlight disappears — expected |
| Seek to a time before first cue | Returns `null` from lookup |
| Seek to a time after last cue | `endSec` check on last cue; returns `null` if past its end |
| Single-cue file | `pages` has one page; auto-advance is a no-op |
| `cues` array is empty | `pages` is `[]`; render empty state placeholder |
| Page manually advanced by user during playback | Auto-advance resumes on next cue boundary crossing |

---

## 12. Official References

- `TranscriptCue` type: `src/lib/parse-transcript.ts`
- Transcript API route: `src/app/api/videos/[id]/transcript/route.ts`
- YouTube IFrame API (`getCurrentTime`, `seekTo`, `onStateChange`): `docs/api/youtube-iframe-player.md`
- MDN `Element.scrollIntoView()`: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
- MDN `IntersectionObserver`: https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver
- MDN `Array.prototype.findIndex`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
