# LingoFlow

LingoFlow is a web app that lets you import YouTube videos and manage their transcripts. Organise your content with tags, edit metadata, and keep all your video transcripts in one place.

## Features

- Import YouTube videos with transcript files (`.srt`, `.vtt`, `.txt`) and tags
- View all imported videos on a personal dashboard
- Edit video tags and replace transcript files
- Delete videos from your dashboard

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

No environment variables required. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Local Data Storage

All data is stored locally — no cloud services needed:

| Path | Contents |
|------|----------|
| `.lingoflow-data/lingoflow.db` | SQLite database |
| `.lingoflow-data/transcripts/` | Uploaded transcript files |

The `.lingoflow-data/` directory is excluded from git (see `.gitignore`).

## Out of Scope

This app is intentionally local-first and single-user. The following are **not** supported:
- Multi-user / authentication
- Cloud deployment
- Remote database (Supabase or similar)

## Running Tests

```bash
pnpm test
```

## Other Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
