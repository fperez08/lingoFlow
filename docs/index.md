# LingoFlow — Documentation Index

LingoFlow is a local-first, single-user web app for studying languages via YouTube videos and local video files with synced transcripts.

---

## Project docs (`docs/project/`)

| File | Covers |
|---|---|
| [`player-feature.md`](project/player-feature.md) | Player shell, floating mini-player, playback progress indicator, cue-synced transcript — Issues #119–#121 |
| [`local-video-playback.md`](project/local-video-playback.md) | Local-video foundation: new data model, streaming API, HTML5 player — Issue #138 |
| [`local-upload-import.md`](project/local-upload-import.md) | Direct upload import flow: UI modal changes, multipart API route, VideoService.importLocalVideo — Issue #139 |

---

## API / reference docs (`docs/api/`)

| File | Covers |
|---|---|
| [`youtube-iframe-player.md`](api/youtube-iframe-player.md) | YouTube IFrame Player API: loading, creating a player instance, event handling |
| [`transcript-sync.md`](api/transcript-sync.md) | `TranscriptCue` interface, active-cue detection, paging, auto-scroll, seek-on-click |

---

## Key source paths

```
src/
  app/
    api/
      videos/route.ts                   # GET /api/videos
      videos/import/route.ts            # POST /api/videos/import
      videos/[id]/route.ts              # GET / PATCH / DELETE /api/videos/:id
      videos/[id]/transcript/route.ts   # GET /api/videos/:id/transcript
      videos/[id]/stream/route.ts       # GET /api/videos/:id/stream  (local video, Range-aware)
    (app)/
      dashboard/page.tsx
      player/[id]/page.tsx
      vocabulary/page.tsx
  components/
    PlayerLoader.tsx
    PlayerClient.tsx
  lib/
    db.ts               # openDb, initializeSchema, ensureDataDirs
    videos.ts           # Zod schemas + Video / InsertVideoParams / UpdateVideoParams types
    video-store.ts      # SqliteVideoStore — CRUD
    video-service.ts    # VideoService — import / update / delete business logic
    api-schemas.ts      # Zod schemas for API request bodies
    youtube.ts          # fetchYoutubeMetadata, extractYoutubeId, E2E stub map
    transcripts.ts      # writeTranscript / deleteTranscript
    parse-transcript.ts # parseSrt / parseVtt / parseTxt → TranscriptCue[]
    vocabulary.ts       # MOCK_VOCAB + types
    server/
      composition.ts    # DI root — exports videoStore, videoService
```

Data directory: `.lingoflow-data/` (gitignored)
- `lingoflow.db` — SQLite database
- `transcripts/` — transcript files
- `videos/` — local video files (added in Issue #138)
