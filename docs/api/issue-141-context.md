# Issue #141 — Upload Validation & Size Enforcement: Context

## Current State — Client-Side Validation (added in #139)

### `ImportVideoModal.tsx`
The video file input uses:
```tsx
<input
  type="file"
  accept="video/*,.mp4,.webm,.mov,.mkv"
  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
/>
```
**Problems:**
- `video/*` accepts *any* video MIME type (e.g. `.mkv`, `.avi`, `.flv`)
- `.mkv` is explicitly listed but is not in the allowed set for #141
- No `onChange` size check; the file is set unconditionally

### `useImportVideoForm.ts` — `handleSubmit`
Pre-submit checks for local mode:
```ts
if (!videoFile) { setSubmitError('Video file is required'); return }
if (!title.trim()) { setSubmitError('Title is required'); return }
```
No type or size validation beyond presence check.

### `canSubmit` guard
```ts
if (!videoFile || !title.trim()) return false
```
Only checks existence, not format/size.

### Error display pattern
`submitError` string is rendered in the modal:
```tsx
{submitError && (
  <div data-testid="import-error" className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm">
    {submitError}
  </div>
)}
```
Server `400` JSON `{ error: string }` is caught and forwarded to `submitError` via:
```ts
const data = await response.json()
throw new Error(data.error || 'Failed to import video')
```
So server validation messages surface in the same UI component automatically.

---

## Current State — Server-Side Validation

### `ImportLocalVideoRequestSchema` in `src/lib/api-schemas.ts`
```ts
video: z.custom<File>(isFileLike, 'Video file is required'),
```
Only checks that a file-like object is present. **No MIME type check. No size check.**

### Route handler `src/app/api/videos/import/route.ts`
```ts
const result = ImportLocalVideoRequestSchema.safeParse({ video, title, author, transcript, tags })
if (!result.success) {
  return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
}
```
Errors use `result.error.issues[0].message` (Zod 4 pattern — correct).

No additional checks on `video.size` or `video.type` after schema parse.

---

## Gaps (what #141 must add)

| Layer | Missing |
|-------|---------|
| Client — `accept` attribute | Must restrict to `video/mp4,video/webm,video/quicktime` only; remove `video/*` and `.mkv` |
| Client — `onChange` or pre-submit | No MIME type check on `videoFile.type` |
| Client — `onChange` or pre-submit | No size check on `videoFile.size` |
| Server — Zod schema | `video` field lacks `.refine()` for MIME type |
| Server — Zod schema | `video` field lacks `.refine()` for max size |

---

## Zod 4 File Validation Patterns

### MIME type allowlist + size cap
```ts
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
const MAX_VIDEO_SIZE = 524_288_000 // 500 MB in bytes

const videoFileSchema = z
  .custom<File>(isFileLike, 'Video file is required')
  .refine(
    (f) => ALLOWED_VIDEO_TYPES.includes(f.type as typeof ALLOWED_VIDEO_TYPES[number]),
    'Unsupported format. Allowed: MP4, WebM, MOV'
  )
  .refine(
    (f) => f.size <= MAX_VIDEO_SIZE,
    'File exceeds 500 MB limit'
  )
```

### Using in schema (replaces bare `z.custom`)
```ts
export const ImportLocalVideoRequestSchema = z.object({
  video: videoFileSchema,
  // ...rest unchanged
})
```

### Error access (Zod 4 — use `.issues`, not `.errors`)
```ts
result.error.issues[0].message  // ✓ Zod 4
result.error.errors[0].message  // ✗ Zod 3 — property renamed
```

---

## Client Patterns

### `accept` attribute — restrict to exact formats
```tsx
<input
  type="file"
  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
/>
```
Using both MIME types and extensions improves cross-browser coverage.

### `onChange` pre-validation (immediate feedback on file pick)
```ts
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_VIDEO_SIZE = 524_288_000

onChange={(e) => {
  const file = e.target.files?.[0] || null
  if (file) {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setVideoFileError('Unsupported format. Allowed: MP4, WebM, MOV')
      setVideoFile(null)
      return
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setVideoFileError('File exceeds 500 MB limit')
      setVideoFile(null)
      return
    }
    setVideoFileError(null)
  }
  setVideoFile(file)
}}
```
Alternatively, perform the same checks inside `handleSubmit` (before the `fetch`) and set `submitError`.

### Pre-submit guard in `handleSubmit`
```ts
if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
  setSubmitError('Unsupported format. Allowed: MP4, WebM, MOV')
  return
}
if (videoFile.size > MAX_VIDEO_SIZE) {
  setSubmitError('File exceeds 500 MB limit')
  return
}
```

---

## Server Patterns

### Check `file.size` and `file.type` via Zod refine (preferred)
Add `.refine()` chains to `videoFileSchema` as shown above. Validated before any I/O (buffer read, DB write).

### Manual checks as fallback (inside route handler, after parse)
```ts
const MAX = 524_288_000
const ALLOWED = ['video/mp4', 'video/webm', 'video/quicktime']
if (video.size > MAX) {
  return NextResponse.json({ error: 'File exceeds 500 MB limit' }, { status: 400 })
}
if (!ALLOWED.includes(video.type)) {
  return NextResponse.json({ error: 'Unsupported format. Allowed: MP4, WebM, MOV' }, { status: 400 })
}
```
Prefer Zod refine to keep validation co-located with schema.

---

## User Feedback Patterns in Existing Modals

- **`submitError`** (string | null) — set in `handleSubmit` or caught from server `400` — rendered as red banner with `data-testid="import-error"`.
- **`previewError`** (string | null) — inline below the YouTube URL input with `text-error` class.
- Pattern: field-level errors appear inline under the input; form-level errors (including server errors) appear at the top of the form via the `submitError` banner.
- For video file validation, setting `submitError` in `handleSubmit` (or in `onChange` with a dedicated `videoFileError` state and inline display) matches existing patterns.
