-- Migration: Fix Storage RLS Policies for documents bucket
-- This migration updates the RLS policies to correctly handle the user_<uuid> path prefix
-- and ensures users can only access their own files.

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

-- Drop existing policies on storage.objects for the documents bucket
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to view files" ON storage.objects;

-- ============================================================================
-- CREATE NEW SECURE POLICIES
-- ============================================================================

-- Helper function comment:
-- storage.foldername(name) returns an array of folder segments
-- For path "user_abc123/folder/file.pdf", it returns ARRAY['user_abc123', 'folder']
-- The [1] accessor gets the first segment (1-indexed in PostgreSQL)

-- SELECT: Users can only view files in their own directory
CREATE POLICY "Users can view their own files in documents bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text)
);

-- INSERT: Users can only upload files to their own directory
CREATE POLICY "Users can upload files to their own directory in documents bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text)
);

-- UPDATE: Users can only update/move files within their own directory
-- Both USING (for selecting rows to update) and WITH CHECK (for validating new values)
-- must match the user's directory
CREATE POLICY "Users can update their own files in documents bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text)
);

-- DELETE: Users can only delete files in their own directory
CREATE POLICY "Users can delete their own files in documents bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text)
);

-- ============================================================================
-- VERIFICATION QUERIES (run these manually to verify the policies)
-- ============================================================================

-- List all policies on storage.objects:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test if a user can access a specific path (replace with actual user ID):
-- SELECT ('user_' || 'your-user-uuid-here') = (storage.foldername('user_your-user-uuid-here/folder/file.pdf'))[1];
