# Word-Level Karaoke Highlighting — Reference Notes

> Relevant to: **Issue #122 — Word-level karaoke highlighting and replay**
>
> Covers proportional timing interpolation for simulating per-word highlighting within a cue,
> word tokenization, click-to-seek for individual words, CSS/Tailwind approach, and
> performance patterns for React.

---

## 1. Overview

Transcript files (SRT/VTT) provide only **cue-level timestamps** — a start time and end time for
the entire subtitle line. There are no per-word timestamps. To produce a karaoke-style effect,
we **interpolate** which word should be highlighted based on how much of the cue's duration has
elapsed.

The effect is purely a UI concern layered on top of the existing cue-timing system from
`docs/api/transcript-sync.md`. No changes to the data model or API are required.

---

## 2. Word Tokenization

### Strategy

Split the cue's `text` field on whitespace, preserving punctuation attached to words (commas,
periods, etc. stay glued to their word). This matches natural reading cadence — a word and its
trailing punctuation are perceived as a single unit.

```ts
/**
 * Split a cue's text into an array of word tokens.
 * Punctuation-only tokens (e.g. standalone "—") are kept as their own entries
 * so the rendered output matches the original text exactly when joined with spaces.
 */
function tokenizeWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}
```

**Examples:**

| Input | Output |
|---|---|
| `"Hello, world!"` | `["Hello,", "world!"]` |
| `"It's a test — really."` | `["It's", "a", "test", "—", "really."]` |
| `"  extra   spaces  "` | `["extra", "spaces"]` |
| `""` (empty cue) | `[]` |

### `useMemo` for tokenization

Tokenize only when the active cue changes, not on every poll tick:

```ts
const words = useMemo(
  () => (activeCue ? tokenizeWords(activeCue.text) : []),
  [activeCue]
)
```

`activeCue` here is the `ParsedCue | null` from `findActiveCueBinary` (see
`docs/api/transcript-sync.md` §3). Since `ParsedCue` objects are produced by `parseCues` (a
`useMemo` over the raw `cues` array), object identity is stable between ticks — `useMemo` will
not re-run while the same cue is active.

---

## 3. Proportional Timing Formula

### Inputs

| Variable | Type | Description |
|---|---|---|
| `startSec` | `number` | Cue start time in seconds (from `ParsedCue.startSec`) |
| `endSec` | `number` | Cue end time in seconds (from `ParsedCue.endSec`) |
| `currentTimeSec` | `number` | Current playback time from `player.getCurrentTime()` |
| `wordCount` | `number` | `words.length` |

### Formula

```ts
/**
 * Return the 0-based index of the word that should currently be highlighted.
 * Returns -1 if the cue has no words or timing is invalid.
 */
function activeWordIndex(
  startSec: number,
  endSec: number,
  currentTimeSec: number,
  wordCount: number,
): number {
  if (wordCount === 0 || endSec <= startSec) return -1

  const cueDuration = endSec - startSec
  const elapsed = Math.max(0, currentTimeSec - startSec)
  // progress is 0.0 at cue start, 1.0 at cue end
  const progress = Math.min(elapsed / cueDuration, 1)
  // Map progress to a word index (clamp to last word)
  return Math.min(Math.floor(progress * wordCount), wordCount - 1)
}
```

**Walk-through example:**

- Cue runs from `83.0 s` to `85.0 s` (duration = 2 s), cue text = `"She sells sea shells"` (4 words).
- At `t = 83.5 s`: elapsed = 0.5, progress = 0.25 → index `Math.floor(0.25 × 4) = 1` → **"sells"**
- At `t = 84.0 s`: elapsed = 1.0, progress = 0.50 → index `Math.floor(0.50 × 4) = 2` → **"sea"**
- At `t = 84.9 s`: elapsed = 1.9, progress = 0.95 → index `Math.min(3, 3) = 3` → **"shells"**
- At `t = 85.0 s` (cue end): progress clamps to 1.0 → index `wordCount - 1` → **"shells"** (last word stays highlighted until cue exits)

### Single-word cues

If `wordCount === 1`, `Math.floor(progress × 1)` is always `0`. The single word is highlighted
for the entire cue duration. This is correct.

### Cues with empty/invalid timing

If `startSec` is `-1` (plain-text format; see `transcript-sync.md` §2), `endSec <= startSec` is
true, so the formula returns `-1` (no word highlighted). Guard downstream accordingly.

---

## 4. Storing Active Word Index in React State

The active word index changes on every poll tick while a cue is active. **Do not store it in
React state** — that would cause a re-render every 250 ms even for inactive transcript lines.

Instead, store it in a **ref** and update the DOM directly:

```ts
const activeWordIdxRef = useRef<number>(-1)
```

Update it inside the existing cue-polling interval (see `transcript-sync.md` §4):

```ts
intervalRef.current = setInterval(() => {
  const player = playerRef.current
  if (!player) return
  const t = player.getCurrentTime()

  // Existing: find active cue
  const cue = findActiveCueBinary(parsedCues, t)
  const newCueIndex = cue?.index ?? null
  if (newCueIndex !== activeCueIndexRef.current) {
    setActiveCueIndex(newCueIndex)  // triggers React re-render for cue change only
    activeCueIndexRef.current = newCueIndex
  }

  // New: update active word index imperatively
  if (cue && cue.endSec > cue.startSec) {
    const words = wordTokensRef.current  // stable ref to current word array
    const idx = activeWordIndex(cue.startSec, cue.endSec, t, words.length)
    if (idx !== activeWordIdxRef.current) {
      activeWordIdxRef.current = idx
      applyWordHighlight(idx)  // direct DOM update — no React state
    }
  } else {
    if (activeWordIdxRef.current !== -1) {
      activeWordIdxRef.current = -1
      applyWordHighlight(-1)
    }
  }
}, 250)
```

`wordTokensRef` is a ref kept in sync with the `words` array derived from `useMemo`:

```ts
const wordTokensRef = useRef<string[]>([])
useEffect(() => {
  wordTokensRef.current = words
}, [words])
```

---

## 5. DOM-Based Word Highlight (`applyWordHighlight`)

Assign `data-word-index` attributes to each word `<span>` and toggle a CSS class directly,
bypassing React reconciliation entirely for the sub-250 ms highlight updates.

```ts
const cueContainerRef = useRef<HTMLElement | null>(null)

function applyWordHighlight(targetIdx: number) {
  const container = cueContainerRef.current
  if (!container) return
  container.querySelectorAll<HTMLSpanElement>('[data-word-index]').forEach(span => {
    const idx = Number(span.dataset.wordIndex)
    if (idx <= targetIdx) {
      span.classList.add('word-active')
      span.classList.remove('word-inactive')
    } else {
      span.classList.add('word-inactive')
      span.classList.remove('word-active')
    }
  })
}
```

Using `idx <= targetIdx` (rather than `idx === targetIdx`) produces a **progressive fill** effect —
all words up to and including the current word are highlighted. Change to `idx === targetIdx` for
a single-word spotlight effect.

---

## 6. Rendering Word Spans

In the active cue's render, replace the plain text with individual `<span>` elements:

```tsx
function ActiveCueWords({
  words,
  cue,
  containerRef,
  onWordClick,
}: {
  words: string[]
  cue: ParsedCue
  containerRef: React.RefObject<HTMLElement>
  onWordClick: (seekSec: number) => void
}) {
  return (
    <span ref={containerRef as React.RefObject<HTMLSpanElement>} className="inline">
      {words.map((word, i) => (
        <span
          key={i}
          data-word-index={i}
          className="word-inactive cursor-pointer select-none"
          onClick={() => onWordClick(cue.startSec)}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}
```

> **Note:** All words in a cue share the same `startSec` for seek purposes — per-word seek is not
> possible without per-word timestamps. Clicking any word in the cue seeks to `cue.startSec`.
> This matches the same behaviour as clicking the cue row itself (see `transcript-sync.md` §9).

Non-active cues continue to render plain text (no spans), which keeps the DOM small and avoids
tokenizing every cue on every render.

---

## 7. CSS / Tailwind Classes

Define the highlight states as Tailwind utility classes. Add them to `src/app/globals.css` (or
a component stylesheet) so they are available for the imperative DOM updates in §5:

```css
/* src/app/globals.css */
.word-inactive {
  @apply text-gray-700 transition-colors duration-100;
}

.word-active {
  @apply text-yellow-500 font-semibold transition-colors duration-100;
}
```

The `transition-colors duration-100` gives a 100 ms crossfade between states, which looks smooth
even with the 250 ms polling interval.

### Tailwind-only alternative (class names on the span directly)

If you prefer not to use `@apply`, use inline conditional Tailwind classes in the React render.
This works only if the word highlight is driven by React state (not the imperative approach):

```tsx
<span
  className={
    i <= activeWordIdx
      ? 'text-yellow-500 font-semibold transition-colors duration-100'
      : 'text-gray-700 transition-colors duration-100'
  }
>
```

**Choose the imperative approach (§5) for production** — it avoids re-rendering the entire cue's
word list on every poll tick.

---

## 8. Click-to-Seek for Word Spans

Individual word spans seek to the **cue's start time** (the finest granularity available without
per-word timestamps):

```ts
function handleWordClick(seekSec: number) {
  playerRef.current?.seekTo(seekSec, true)
  playerRef.current?.playVideo()
}
```

Pass this as `onWordClick` to `<ActiveCueWords>` (shown in §6). The `allowSeekAhead: true`
argument to `seekTo` ensures the player buffers ahead of the seek point
(see `youtube-iframe-player.md` §3).

### Cue-row click vs. word click

Both the cue row and individual word spans call `seekTo(cue.startSec, true)`. The cue-row click
handler (from `transcript-sync.md` §9) can be retained as-is; word clicks fire the same seek.
Use `event.stopPropagation()` on the word `<span>` only if the cue `<li>` also has an `onClick`
that would double-fire:

```tsx
<span
  data-word-index={i}
  onClick={(e) => {
    e.stopPropagation()
    onWordClick(cue.startSec)
  }}
>
```

---

## 9. Performance Considerations

### Why not React state for word index?

At a 250 ms poll interval with a typical cue of ~8 words, the word index changes roughly every
30–60 ms (250 ms / 8 words). Storing the index in React state would trigger React reconciliation
at up to 4× per second for the entire transcript panel. The imperative DOM approach in §5
eliminates this overhead entirely.

### Minimize span creation

Only the **active cue** is rendered as word spans (§6). All other cues remain as plain text
strings inside their `<li>` elements. This keeps the total number of `[data-word-index]` spans
small (usually ≤ 20 at any moment).

### `useMemo` for word tokens

Re-tokenization is O(n) on the cue text length. Memoize it on `activeCue` identity:

```ts
const words = useMemo(
  () => (activeCue ? tokenizeWords(activeCue.text) : []),
  [activeCue]   // stable reference — only changes when cue boundary is crossed
)
```

Because `ParsedCue` objects are created once (in `parseCues` inside a `useMemo`), object identity
is stable across poll ticks within the same cue. `useMemo` will not re-run during a cue.

### Polling interval

250 ms (the same interval used for active-cue detection) is sufficient. A finer interval (e.g.
100 ms) gives no perceptible improvement in karaoke smoothness because typical cues are 1–3
seconds long and contain 5–15 words — the per-word window is already 100–300 ms at 250 ms polling.

### `querySelectorAll` cost

`querySelectorAll('[data-word-index]')` on the active cue container (not the full document)
iterates at most ~20 elements. This is negligible.

---

## 10. Full Integration Sketch

```tsx
// Inside the transcript panel component (simplified)

const words = useMemo(
  () => (activeCue ? tokenizeWords(activeCue.text) : []),
  [activeCue]
)

const wordTokensRef = useRef<string[]>([])
useEffect(() => { wordTokensRef.current = words }, [words])

const cueContainerRef = useRef<HTMLSpanElement>(null)
const activeWordIdxRef = useRef(-1)

// applyWordHighlight and polling setup as shown in §4 and §5

return (
  <ol className="space-y-1">
    {currentCues.map(cue => (
      <li
        key={cue.index}
        data-cue-index={cue.index}
        className={cue.index === activeCueIndex ? 'bg-yellow-50 rounded px-2 py-0.5' : 'px-2 py-0.5 text-gray-700'}
        onClick={() => {
          playerRef.current?.seekTo(cue.startSec, true)
          playerRef.current?.playVideo()
        }}
      >
        {cue.index === activeCueIndex ? (
          <ActiveCueWords
            words={words}
            cue={cue}
            containerRef={cueContainerRef}
            onWordClick={(sec) => {
              playerRef.current?.seekTo(sec, true)
              playerRef.current?.playVideo()
            }}
          />
        ) : (
          cue.text
        )}
      </li>
    ))}
  </ol>
)
```

---

## 11. Edge Cases

| Scenario | Handling |
|---|---|
| Cue text is an empty string | `tokenizeWords` returns `[]`; `activeWordIndex` returns `-1`; no spans rendered |
| Single-word cue | Word is highlighted for the entire cue duration |
| Cue with only punctuation (`"—"`) | Treated as one token; highlighted for the full cue |
| `endSec <= startSec` (malformed cue) | `activeWordIndex` returns `-1`; fallback to plain cue highlight only |
| Seek to within a cue (mid-cue) | `elapsed` is calculated from `currentTimeSec - startSec`; correct word is highlighted immediately |
| Very fast speech (many words, short cue) | Formula still distributes proportionally; some words may share the same index bucket — acceptable |
| Player paused mid-cue | Polling stops; last highlighted word remains highlighted — correct UX |
| `activeCue` becomes `null` (gap between cues) | `words` memoizes to `[]`; `applyWordHighlight(-1)` clears all word highlights |

---

## 12. Official References

- `TranscriptCue` / `ParsedCue` types: `src/lib/parse-transcript.ts`
- Active-cue detection & polling: `docs/api/transcript-sync.md` §3–§4
- `seekTo` API: `docs/api/youtube-iframe-player.md` §3
- Cue click-to-seek pattern: `docs/api/transcript-sync.md` §9
- MDN `Element.querySelectorAll`: https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll
- MDN `String.prototype.split`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split
- React `useMemo`: https://react.dev/reference/react/useMemo
- React `useRef`: https://react.dev/reference/react/useRef
- Tailwind CSS `transition` utilities: https://tailwindcss.com/docs/transition-property
