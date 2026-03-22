-- Ensure all authenticated users can read basic profile info
-- (needed for messaging — admins listing students, students listing coaches)
drop policy if exists "Authenticated users can read profiles" on profiles;

create policy "Authenticated users can read profiles"
  on profiles for select
  using (auth.role() = 'authenticated');
