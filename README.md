# LingoFlow

LingoFlow is a web app that lets you import local videos and manage their transcripts. Organise your content with tags, edit metadata, and keep all your video transcripts in one place.

## Features

- Import local video files with transcript files (`.srt`, `.vtt`, `.txt`) and tags
- View all imported videos on a personal dashboard
- Edit video tags and replace transcript files
- Delete videos from your dashboard
- Generate word definitions in context (requires Gemini API key)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/fperez08/lingoFlow.git
   cd lingoFlow
   ```

2. **Install dependencies and start**

   ```bash
   pnpm install
   ```

## Getting Started (one command)

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Gemini API Key Setup (for AI Definitions)

To enable dictionary definitions in the player sidebar, add a Gemini API key:

1. Create a `.env.local` file in the project root.
2. Add this variable:

   ```bash
   GOOGLE_GEMINI_API_KEY=your_api_key_here
   ```

3. Restart the dev server (`pnpm dev`) after changing env vars.

If this key is not configured, the app still works for import/player flows, but definition generation endpoint `/api/dictionary/define` returns `503 AI service not configured`.

## Local Data Storage

All data is stored locally — no cloud services needed:

| Path                           | Contents                  |
| ------------------------------ | ------------------------- |
| `.lingoflow-data/lingoflow.db` | SQLite database           |
| `.lingoflow-data/transcripts/` | Uploaded transcript files |

The `.lingoflow-data/` directory is excluded from git (see `.gitignore`).

## Out of Scope

This app is intentionally local-first and single-user. The following are **not** supported:

- Multi-user / authentication
- Cloud deployment
- Remote database (Supabase or similar)
- Import from YouTube URL

## Running Tests

```bash
pnpm test
```

## Other Scripts

| Script       | Description          |
| ------------ | -------------------- |
| `pnpm build` | Build for production |
| `pnpm lint`  | Run ESLint           |
