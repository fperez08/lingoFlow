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

2. **Install dependencies**

   ```bash
   pnpm install
   ```

## Environment Setup

Create a `.env.local` file in the project root with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values can be found in your [Supabase dashboard](https://supabase.com/dashboard) under **Project Settings → API**.

## Running the App

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Tests

```bash
pnpm test
```

## Other Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
