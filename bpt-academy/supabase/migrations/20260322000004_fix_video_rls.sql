-- Drop the existing restrictive video select policy
drop policy if exists "Authenticated users can view published videos" on videos;

-- Recreate with correct check: any logged-in user can view published videos
create policy "Authenticated users can view published videos"
  on videos for select
  using (
    is_published = true
    and auth.uid() is not null
  );
