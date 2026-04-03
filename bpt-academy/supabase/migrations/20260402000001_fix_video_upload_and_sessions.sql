-- =============================================
-- Migration: fix video upload RLS + storage policy
-- 2026-04-02
-- =============================================

-- ── Storage: add super_admin to upload policy ──────────────────
drop policy if exists "Coaches can upload videos" on storage.objects;
create policy "Coaches can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'training-videos' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

drop policy if exists "Coaches can delete videos" on storage.objects;
create policy "Coaches can delete videos"
  on storage.objects for delete
  using (
    bucket_id = 'training-videos' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

-- ── videos table: ensure insert/update policies include super_admin ──
drop policy if exists "Coaches can insert videos" on videos;
create policy "Coaches can insert videos"
  on videos for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

drop policy if exists "Coaches can update videos" on videos;
create policy "Coaches can update videos"
  on videos for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
    )
  );

drop policy if exists "Admins can delete videos" on videos;
create policy "Admins can delete videos"
  on videos for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );
