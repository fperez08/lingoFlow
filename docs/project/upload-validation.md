# Upload Validation Rules — Issue #141

## Validation Rules

| Rule | Value |
|------|-------|
| Allowed MIME types | `video/mp4`, `video/webm`, `video/quicktime` |
| Allowed extensions | `.mp4`, `.webm`, `.mov` |
| Maximum file size | 500 MB (`524_288_000` bytes) |

`video/quicktime` is the correct MIME type for `.mov` files.

---

## Client Enforcement

### 1. `accept` attribute on the file input
Restrict the browser file picker to only show accepted formats:
```tsx
<input
  type="file"
  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
/>
```
Both MIME types and extensions are listed for cross-browser reliability. Remove `video/*` and `.mkv`.

### 2. Pre-submit validation in `useImportVideoForm.handleSubmit`
After checking `if (!videoFile)`, add:
```ts
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_VIDEO_SIZE = 524_288_000

if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
  setSubmitError('Unsupported format. Please use MP4, WebM, or MOV.')
  return
}
if (videoFile.size > MAX_VIDEO_SIZE) {
  setSubmitError('File is too large. Maximum size is 500 MB.')
  return
}
```

### Error display
Validation errors set `submitError` → rendered in `data-testid="import-error"` banner (existing pattern).

---

## Server Enforcement

### Zod schema in `src/lib/api-schemas.ts`
Replace the bare `z.custom` video field with a schema that includes type and size refines:
```ts
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
const MAX_VIDEO_SIZE = 524_288_000

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

export const ImportLocalVideoRequestSchema = z.object({
  video: videoFileSchema,
  // ... title, author, transcript, tags unchanged
})
```

### HTTP response on failure
The existing route handler pattern already returns `400` with the first Zod issue message:
```ts
if (!result.success) {
  return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
}
```
No route handler changes needed — schema changes propagate automatically.

---

## Consistency Requirement

Both client and server must enforce the **same rules** using the **same constants**:

- Export `ALLOWED_VIDEO_TYPES` and `MAX_VIDEO_SIZE` from `src/lib/api-schemas.ts` (or a shared constants module).
- Import them in `useImportVideoForm.ts` for client validation.
- This ensures a file rejected client-side is also rejected server-side, and vice versa.

```ts
// src/lib/api-schemas.ts — export for reuse
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export const MAX_VIDEO_SIZE = 524_288_000 // 500 MB
```

```ts
// src/hooks/useImportVideoForm.ts
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE } from '@/lib/api-schemas'
```

---

## Summary of Changes Required

| File | Change |
|------|--------|
| `src/lib/api-schemas.ts` | Export `ALLOWED_VIDEO_TYPES`, `MAX_VIDEO_SIZE`; add `videoFileSchema` with type + size refines; use it in `ImportLocalVideoRequestSchema` |
| `src/hooks/useImportVideoForm.ts` | Import constants; add type + size checks in `handleSubmit` before `setIsSubmitting(true)` |
| `src/components/ImportVideoModal.tsx` | Update `accept` attribute: `"video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"` |
