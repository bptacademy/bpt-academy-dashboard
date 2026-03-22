-- Allow coaches/admins to upload to training-videos bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('training-videos', 'training-videos', true, 524288000)
on conflict (id) do nothing;

-- Anyone authenticated can view videos (bucket is public)
create policy "Public video access"
  on storage.objects for select
  using (bucket_id = 'training-videos');

-- Only coaches/admins can upload
create policy "Coaches can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'training-videos' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('coach', 'admin')
    )
  );

-- Coaches can delete their own uploads
create policy "Coaches can delete videos"
  on storage.objects for delete
  using (
    bucket_id = 'training-videos' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('coach', 'admin')
    )
  );
