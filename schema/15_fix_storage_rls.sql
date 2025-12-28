-- Fix Storage RLS for chat-media bucket

-- 1. Allow authenticated users to upload files
create policy "Authenticated users can upload files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'chat-media');

-- 2. Allow anyone to view files (public bucket)
create policy "Anyone can view chat media"
on storage.objects for select
to public
using (bucket_id = 'chat-media');

-- 3. Allow users to delete their own files (optional)
create policy "Users can delete own files"
on storage.objects for delete
to authenticated
using (bucket_id = 'chat-media' and auth.uid()::text = (storage.foldername(name))[1]);
