-- =============================================
-- Migration: Fix division not being set on
-- registration and enrollment
-- 2026-03-26
-- =============================================
-- Root causes:
-- 1. handle_new_user() trigger ignored division
--    and skill_level from registration metadata
-- 2. Enrolling in a program never updated the
--    student's profile division/skill_level
-- =============================================

-- ── Fix 1: handle_new_user trigger ───────────────────────────
create or replace function handle_new_user()
returns trigger as $$
declare
  user_role_val     user_role;
  user_division_val text;
  user_skill_val    text;
begin
  begin
    user_role_val := coalesce(new.raw_user_meta_data->>'role', 'student')::user_role;
  exception when others then
    user_role_val := 'student';
  end;

  user_division_val := new.raw_user_meta_data->>'division';
  user_skill_val    := new.raw_user_meta_data->>'skill_level';

  insert into public.profiles (id, full_name, role, phone, division, skill_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    user_role_val,
    new.raw_user_meta_data->>'phone',
    user_division_val,
    user_skill_val
  )
  on conflict (id) do update set
    division    = coalesce(excluded.division, profiles.division),
    skill_level = coalesce(excluded.skill_level, profiles.skill_level);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ── Fix 2: update profile division on enrollment ─────────────
-- When a student enrolls in a program, automatically set their
-- profile division (and skill_level if applicable) to match
-- the program they joined.
create or replace function sync_profile_division_on_enroll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program_division  text;
  v_program_skill     text;
begin
  if new.status != 'active' then return new; end if;

  select division, skill_level
  into v_program_division, v_program_skill
  from programs
  where id = new.program_id;

  if v_program_division is null then return new; end if;

  -- Update profile division; skill_level only for amateur sub-levels
  if v_program_division = 'amateur' and v_program_skill is not null then
    update profiles
    set division    = v_program_division,
        skill_level = v_program_skill
    where id = new.student_id;
  else
    -- For semi_pro, pro: set division, clear skill_level (not applicable)
    update profiles
    set division    = v_program_division,
        skill_level = case when v_program_division = 'amateur' then skill_level else null end
    where id = new.student_id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_division_on_enroll on enrollments;
create trigger sync_division_on_enroll
  after insert or update of status on enrollments
  for each row execute function sync_profile_division_on_enroll();

-- ── Fix 3: backfill Josep's division from his enrollment ──────
-- His enrollment is cancelled but we know he's a Pro player.
-- Update his profile division to 'pro' based on the program
-- he enrolled in.
update profiles
set division    = 'pro',
    skill_level = null
where id = '629f2752-3aa4-4221-a8ed-ee629bd9131e'
  and division is null;
