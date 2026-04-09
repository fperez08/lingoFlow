-- Create videos table
CREATE TABLE public.videos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  youtube_url text NOT NULL,
  youtube_id text NOT NULL,
  title text NOT NULL,
  author_name text NOT NULL,
  thumbnail_url text NOT NULL,
  transcript_path text NOT NULL,
  transcript_format text NOT NULL CHECK (transcript_format IN ('srt', 'vtt', 'txt')),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own videos
CREATE POLICY "Users can view their own videos"
  ON public.videos FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own videos
CREATE POLICY "Users can insert their own videos"
  ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
  ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- Create transcripts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('transcripts', 'transcripts', false)
ON CONFLICT DO NOTHING;

-- Policy: Users can upload their own transcripts
CREATE POLICY "Users can upload their own transcripts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Users can read their own transcripts
CREATE POLICY "Users can read their own transcripts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'transcripts' AND auth.uid()::text = (storage.foldername(name))[1]);
