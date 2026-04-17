# Issue #140 — Auto Thumbnail Generation: Context & Design

## ffmpeg Availability

**No ffmpeg dependency exists in the project.** `package.json` has no `fluent-ffmpeg`, `@ffmpeg-installer/ffmpeg`, or similar packages. No ffmpeg binary in `node_modules/.bin/`. No system ffmpeg on the CI runner.

**Required addition:** Install `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` so the project bundles its own ffmpeg binary:

```bash
pnpm add fluent-ffmpeg @ffmpeg-installer/ffmpeg
pnpm add -D @types/fluent-ffmpeg
```

`@ffmpeg-installer/ffmpeg` resolves the platform-correct ffmpeg binary path at runtime via `ffmpegInstaller.path`. This avoids any system dependency.

---

## Schema Change: `thumbnail_path` Column

Add a nullable `TEXT` column to the `videos` table.

**`src/lib/db.ts` — `initializeSchema`:** Add one `addColumnIfMissing` call:

```ts
addColumnIfMissing('thumbnail_path', 'TEXT')
```

The existing `addColumnIfMissing` helper is safe to call unconditionally (catches the "already exists" error). The column is `NULL` for all rows until a thumbnail is generated.

---

## Type Changes

### `src/lib/videos.ts`

Add `thumbnail_path` to both schemas and the inferred `Video` type:

```ts
// VideoSchema
thumbnail_path: z.string().nullable().optional(),

// InsertVideoParamsSchema
thumbnail_path: z.string().nullable().optional(),

// UpdateVideoParamsSchema
thumbnail_path: z.string().nullable().optional(),
```

### `src/lib/video-store.ts`

Add to `VideoRow` interface:

```ts
thumbnail_path: string | null
```

Update `rowToVideo` to pass it through:

```ts
thumbnail_path: row.thumbnail_path ?? null,
```

Update `insert` SQL and parameters to include `thumbnail_path`.

Update `update` to handle `thumbnail_path` updates (needed to persist path after async extraction).

---

## New API Route: `GET /api/videos/[id]/thumbnail`

**File:** `src/app/api/videos/[id]/thumbnail/route.ts`

**Behaviour:**
1. Look up video by `id`; return 404 if not found.
2. If `thumbnail_path` is null or the file does not exist on disk, return 404.
3. Read the JPEG file and stream it back with `Content-Type: image/jpeg` and `Cache-Control: public, max-age=31536000, immutable`.

```ts
export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const video = videoStore.getById(id)
  if (!video || !video.thumbnail_path) return new Response(null, { status: 404 })

  try {
    const buf = fs.readFileSync(video.thumbnail_path)
    return new Response(buf, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}
```

---

## Thumbnail Storage

Thumbnails are stored in `.lingoflow-data/thumbnails/` (alongside `transcripts/` and `videos/`).

- One file per video: `<videoId>.jpg`
- Absolute path stored in `thumbnail_path` column (same convention as `local_video_path` and `transcript_path`).
- `ensureDataDirs` in `src/lib/db.ts` must create the `thumbnails/` subdirectory.

---

## ffmpeg Extraction

Extract a single frame at **1 second** into the video, output as JPEG.

```ts
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export function extractThumbnail(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .screenshots({
        timestamps: [1],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x?',   // preserve aspect ratio, width 640px
      })
  })
}
```

`size: '640x?'` keeps thumbnails small. 1-second offset avoids black frames common at position 0.

---

## Fallback Behaviour

- `thumbnail_path` is `NULL` in the DB → the thumbnail API route returns 404.
- `VideoCard` receives `thumbnail_url` prop (or a derived `thumbnailApiUrl`). If the URL is empty/null it already renders a placeholder SVG (existing code, no change needed unless the prop name changes).
- If a `<img>` tag pointing to `/api/videos/[id]/thumbnail` receives a 404, an `onError` handler on the `<img>` can hide the image and show the SVG placeholder instead.
- Thumbnail failure during import must **not** cause the import to fail (see `thumbnail-generation.md`).

---

## CSP / Image Config

`next.config.ts` `img-src` currently allows `'self'`. Since `/api/videos/[id]/thumbnail` is a same-origin route, **no CSP changes are needed**.

No `next/image` remote patterns need updating because `VideoCard` uses a plain `<img>` tag (already bypasses Next.js image optimisation).
