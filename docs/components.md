# LingoFlow — Component Reference

> **Purpose**: Catalogue of all React components in `src/components/`, with purpose, props, and key behaviour.
> **Last updated**: 2026-07, HEAD: main.

---

## Shell Components

### `Providers`
**File**: `src/components/Providers.tsx` | **Directive**: `'use client'`

Root provider tree. Wraps all pages.

```tsx
<QueryClientProvider client={queryClient}>
  <ApiClientProvider>
    {children}
  </ApiClientProvider>
</QueryClientProvider>
```

- `QueryClientProvider` — TanStack React Query v5 singleton.
- `ApiClientProvider` — injects `FetchApiClient` into context. Tests can supply a stub by passing `client` prop.

---

### `Sidebar`
**File**: `src/components/Sidebar.tsx` | **Directive**: server component (no `'use client'`)

Fixed left navigation bar (hidden on mobile, shown `md:flex`). Width: 256px (`w-64`).  
Renders the app name `LingoFlow` / tagline, then `<nav>` with links to `/dashboard` and `/vocabulary`.

**Props**: none.

---

### `TopBar`
**File**: `src/components/TopBar.tsx` | **Directive**: server component

Fixed top bar (full width on mobile, offset by sidebar on `md:`). Contains `<DarkModeToggle />` right-aligned.

**Props**: none.

---

### `DarkModeToggle`
**File**: `src/components/DarkModeToggle.tsx` | **Directive**: `'use client'`

Toggles the `dark` class on `<html>`. Reads initial state from `document.documentElement.classList` (defaults to light on SSR). Renders a sun/moon SVG icon.

**Props**: none.

---

## Dashboard Components

### `VideoCard`
**File**: `src/components/VideoCard.tsx` | **Directive**: `'use client'`

Grid card representing a single video in the library.

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` | UUID |
| `title` | `string` | |
| `author_name` | `string` | |
| `thumbnail_url` | `string` | Used for non-local videos; local videos use `/api/videos/:id/thumbnail` |
| `source_type` | `'youtube' \| 'local'` (optional) | When `'local'`, thumbnail served from API |
| `tags` | `string[]` | Displayed as pill labels |
| `created_at` | `string` | ISO 8601; formatted as `Mon D, YYYY` |
| `onDelete` | `() => void` (optional) | Shows delete button (🗑️) on hover |
| `onEdit` | `() => void` (optional) | Shows edit button (✏️) on hover |

**`data-testid`**: `video-card-{id}`, `edit-button`, `delete-button`.

Thumbnail links to `/player/{id}`. Hover shows a play overlay. Action buttons appear top-right on hover.

---

### `ImportVideoModal`
**File**: `src/components/ImportVideoModal.tsx` | **Directive**: `'use client'`

Full-screen frosted-glass overlay (`fixed inset-0 bg-black/40 backdrop-blur-[6px] z-50`). Clicking the backdrop closes the modal.

| Prop | Type | Notes |
|---|---|---|
| `isOpen` | `boolean` | Renders nothing when `false` |
| `onClose` | `() => void` | Called on backdrop click or Cancel |
| `onSuccess` | `() => void` | Called after successful import |

Delegates all form state to `useImportVideoForm({ onSuccess, onClose })`. Supports:
- **Video file** input (`.mp4`, `.webm`, `.mov`)
- **Title** (required) and **Author** (optional) text inputs
- **Transcript** — toggle between "Upload File" (`.srt`, `.vtt`, `.txt`) and "Paste Text"
- **Tags** — comma-separated string (sent as `tags` FormData field)

**`data-testid`**: `import-modal`, `video-file-input`, `local-title-input`, `local-author-input`, `transcript-mode-upload`, `transcript-mode-paste`, `transcript-input`, `transcript-paste-input`, `tags-input`, `submit-import-button`, `import-error`.

---

### `EditVideoModal`
**File**: `src/components/EditVideoModal.tsx` | **Directive**: `'use client'`

Full-screen frosted-glass overlay (`fixed inset-0 … z-50`). Clicking the backdrop closes. Directly calls `PATCH /api/videos/:id` (does not use `useImportVideoForm`).

| Prop | Type | Notes |
|---|---|---|
| `video` | `VideoCardProps \| null` | Null → renders nothing |
| `onClose` | `() => void` | |
| `onSave` | `(updatedVideo: VideoCardProps) => void` | Called with API response after successful save |

Manages local state: `tags` (array), `tagInput` (typed text), `transcript` (File), `isSaving`, `error`.  
Tag entry: type a tag and press Enter; remove via × button per chip.  
Tags sent as JSON-serialised array: `FormData.append('tags', JSON.stringify(tags))`.

**`data-testid`**: `edit-modal`, `tag-input`, `remove-tag-{tag}`, `save-button`, `edit-error`.

---

### `DeleteVideoModal`
**File**: `src/components/DeleteVideoModal.tsx` | **Directive**: `'use client'`

Confirmation dialog. Full-screen frosted-glass overlay.

| Prop | Type | Notes |
|---|---|---|
| `video` | `VideoCardProps \| null` | Null → renders nothing |
| `onClose` | `() => void` | |
| `onConfirm` | `() => void` | Caller invokes the actual `DELETE /api/videos/:id` |
| `isDeleting` | `boolean` | Disables confirm button while deleting |

**`data-testid`**: `delete-modal`, `cancel-button`, `confirm-delete-button`.

---

### `Toast`
**File**: `src/components/Toast.tsx` | **Directive**: `'use client'`

Self-dismissing toast notification.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `message` | `string` | — | |
| `type` | `'success' \| 'error' \| 'info'` | — | Applied as CSS class `toast-{type}` |
| `duration` | `number` | `5000` | Auto-dismiss after this many ms |
| `onClose` | `() => void` | — | Called after `duration` elapses |

Uses `useEffect` with `setTimeout` for auto-dismiss. Renders with `role="alert"`.

---

## Player Components

### `PlayerLoader`
**File**: `src/components/PlayerLoader.tsx` | **Directive**: `'use client'`

Orchestrates data loading for the player route. Renders loading/error states, then delegates to `PlayerClient`.

| Prop | Type |
|---|---|
| `id` | `string` |

Uses `usePlayerData(id)` (React Query `useQueries`) to parallel-fetch the video record and transcript cues.  
On success renders `<PlayerClient video={video} cues={cues ?? []} />`.

---

### `PlayerClient`
**File**: `src/components/PlayerClient.tsx` | **Directive**: `'use client'`

Main interactive shell for the player page. Owns all playback + vocabulary UI state.

| Prop | Type | Notes |
|---|---|---|
| `video` | `Video` | Video record from DB |
| `cues` | `TranscriptCue[]` (optional) | When omitted, fetches via `GET /api/videos/:id/transcript` |

**State**:

| Variable | Type | Purpose |
|---|---|---|
| `cues` | `TranscriptCue[]` | Transcript cues (from prop or fallback fetch) |
| `loadingTranscript` | `boolean` | True while fallback fetch is in progress |
| `activeCueIndex` | `number` | Manually-selected cue (used when mini-player not playing) |
| `isMiniPlayerOpen` | `boolean` | Controls whether `LocalVideoPlayer` is rendered |
| `playbackTime` | `{ current: number, duration: number }` | Updated from `LocalVideoPlayer` polling (250 ms) |
| `requestedSeekTime` | `number \| null` | One-shot seek target; cleared by `onSeekApplied` |
| `selectedWord` | `{ word, contextSentence } \| null` | Controls `WordSidebar` visibility |

**Active-cue resolution**:  
`playbackCueIndex` = `cues.findIndex(now >= start && now < end)` (−1 when paused).  
`highlightedCueIndex` = `playbackCueIndex >= 0 ? playbackCueIndex : activeCueIndex`.

**`data-testid`**: `player-client`.

Renders: `LessonHero` → `PlaybackProgress` (when mini-player open) → transcript cue list (`cue-{i}`) → `LocalVideoPlayer` (conditional) → `WordSidebar` (conditional).

---

### `LessonHero`
**File**: `src/components/LessonHero.tsx` | **Directive**: `'use client'`

Hero section at the top of the player page. Displays title, author, and tag pills alongside a Play button.

| Prop | Type |
|---|---|
| `video` | `Video` |
| `onPlay` | `() => void` |

**`data-testid`**: `lesson-hero`, `play-button`.

---

### `PlaybackProgress`
**File**: `src/components/PlaybackProgress.tsx` | **Directive**: `'use client'`

Display-only progress bar. **No click-to-seek**. Rendered by `PlayerClient` only while `isMiniPlayerOpen` is true.

| Prop | Type | Notes |
|---|---|---|
| `currentTime` | `number` | Seconds |
| `duration` | `number` | Seconds (0 while metadata not loaded) |

Renders a filled bar (`width: ${pct}%`) plus time labels in `M:SS` format.

**`data-testid`**: `playback-progress`, `progress-bar-fill`, `current-time`, `duration`.

---

### `LocalVideoPlayer` (mini-player)
**File**: `src/components/LocalVideoPlayer.tsx` | **Directive**: `'use client'`

Floating `<video>` mini-player. Position: fixed bottom-right (mobile), fixed top-right on `md:`.

```
fixed bottom-4 right-4 z-50 w-80    (mobile)
md:bottom-auto md:top-20             (desktop)
```

| Prop | Type | Notes |
|---|---|---|
| `videoId` | `string` | Builds `src="/api/videos/{videoId}/stream"` |
| `title` | `string` | `title` attribute on `<video>` |
| `onClose` | `() => void` | Close button → pause + call `onClose` |
| `onTimeUpdate` | `(current, duration) => void` (optional) | Called every 250 ms while playing |
| `seekToTime` | `number \| null` (optional) | Setting this triggers a one-shot `currentTime` assignment |
| `onSeekApplied` | `() => void` (optional) | Called immediately after seek applied |

**Internal state**: `isPlaying` (boolean), `speed` (`SpeedOption`).

**Transport controls** (dark bar below video):
- Rewind 10s (`rewind-button`) — `currentTime -= 10`
- Play/Pause toggle (`mini-player-play-pause`) — `aria-label` toggles between `"Pause"` / `"Play"`
- Fast-forward 10s (`fastforward-button`) — `currentTime += 10`
- Speed `<select>` (`mini-player-speed`) — options: `0.5× 0.75× 1× 1.25× 1.5× 2×`

**Time polling**: `setInterval` at 250 ms while playing. Starts on `onPlay` event, stops on `onPause`/`onEnded`/unmount.

**`data-testid`**: `mini-player`, `local-video`, `mini-player-close`, `rewind-button`, `mini-player-play-pause`, `fastforward-button`, `mini-player-speed`.

---

### `CueText`
**File**: `src/components/CueText.tsx` | **Directive**: `'use client'`

Renders a single transcript cue as tokenised, clickable words.

| Prop | Type | Notes |
|---|---|---|
| `text` | `string` | Raw cue text |
| `vocabMap` | `Map<string, VocabInfo>` | Keyed by lowercased word |
| `onWordClick` | `(word, sentence) => void` | `word` = raw token, `sentence` = full cue text |

Calls `tokenizeCueText(text)` from `@/lib/tokenize-transcript`. Punctuation tokens render as plain `<span>`; word tokens render as `role="button"` `<span>` with:
- Vocabulary status colours: `mastered` → green, `learning` → yellow, `new` → red
- Default hover style for unknown words

**`data-testid`**: `word-{normalized}` (per word token).

---

### `WordSidebar`
**File**: `src/components/WordSidebar.tsx` | **Directive**: `'use client'`

Slide-over word-detail panel. Rendered by `PlayerClient` when `selectedWord` is non-null.

**Positioning**: `fixed top-0 right-0 z-50 h-full w-80`. Accompanied by a transparent `fixed inset-0 z-40` backdrop that closes on click.

| Prop | Type | Notes |
|---|---|---|
| `word` | `string` | Raw word (display capitalised) |
| `contextSentence` | `string` | Full cue text shown in "Context" section |
| `vocabEntry` | `VocabInfo \| undefined` | DB entry if word is tracked; undefined = unseen |
| `onClose` | `() => void` | Backdrop click or close button or `Escape` key |
| `onStatusChange` | `(word, status) => void` (optional) | Called when mastered/unknown toggle clicked |
| `isUpdating` | `boolean` (optional, default `false`) | Disables toggle while mutation pending |

Status toggle: if `mastered`, button says "Mark as unknown" (red); otherwise "Mark as known" (green).  
Escape key listener attached via `document.addEventListener('keydown', …)`.

**`data-testid`**: `word-sidebar`, `word-sidebar-close`, `sidebar-word`, `sidebar-context`, `status-toggle`.

---

## Z-Index Layering

| Layer | z-index | Element |
|---|---|---|
| `Sidebar` | 50 | Fixed left nav |
| `TopBar` | 40 | Fixed top bar |
| `LocalVideoPlayer` mini-player | 50 | Fixed floating player |
| `WordSidebar` backdrop | 40 | Click-away overlay |
| `WordSidebar` panel | 50 | Slide-over panel |
| Modals (Import / Edit / Delete) | 50 | Full-screen overlay |

> **Note**: `LocalVideoPlayer` (`z-50`) and `WordSidebar` (`z-50`) can co-exist — the sidebar renders after the player in the DOM and visually covers it. The `WordSidebar` backdrop (`z-40`) does not block the `LocalVideoPlayer`; clicking outside the sidebar panel closes only the sidebar.
