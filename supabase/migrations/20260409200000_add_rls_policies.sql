-- Migration: add missing RLS policies for videos table and transcripts storage
-- Related issue: #26
-- Parent PRD: #25
--
-- Adds:
--   1. UPDATE policy on public.videos so authenticated users can only update their own rows
--   2. DELETE policy on storage.objects for the 'transcripts' bucket so authenticated users
--      can only delete objects under their own folder (transcripts/{user_id}/*)

-- 1. UPDATE policy on videos table
-- Allows the row owner to update columns (e.g. tags, transcript_path, transcript_format).
-- USING ensures the user can only target rows they own; WITH CHECK prevents re-assigning ownership.
CREATE POLICY "Users can update their own videos"
  ON public.videos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. DELETE policy on transcripts storage bucket
-- Allows authenticated users to delete objects only within their own folder:
--   transcripts/{user_id}/<filename>
CREATE POLICY "Users can delete their own transcripts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'transcripts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
