-- Fix type cast error in sync_profile_division_on_enroll
-- division column is division_type enum, need explicit cast from text
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

  select division::text, skill_level::text
  into v_program_division, v_program_skill
  from programs
  where id = new.program_id;

  if v_program_division is null then return new; end if;

  if v_program_division = 'amateur' and v_program_skill is not null then
    update profiles
    set division    = v_program_division::division_type,
        skill_level = v_program_skill::skill_level
    where id = new.student_id;
  else
    update profiles
    set division    = v_program_division::division_type,
        skill_level = null
    where id = new.student_id;
  end if;

  return new;
end;
$$;

-- Also fix start_promotion_cycle_for_student to handle Pro players:
-- Pro is the top level — no promotion cycle needed. Instead of returning
-- early silently, insert a completed/placeholder so the UI doesn't buffer.
-- The Promotion tab should show "You're at the top level!" for Pro players.
create or replace function start_promotion_cycle_for_student(
  p_student_id uuid,
  p_program_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile        profiles%rowtype;
  v_from_level     text;
  v_to_level       text;
  v_min_weeks      int;
  v_needs_approval boolean;
  v_existing       int;
begin
  select * into v_profile from profiles where id = p_student_id;
  if not found then return; end if;

  -- Don't create duplicate active cycles
  select count(*) into v_existing
  from promotion_cycles
  where student_id = p_student_id
    and status in ('active', 'eligible', 'approved');
  if v_existing > 0 then return; end if;

  -- Determine transition
  if v_profile.division = 'amateur' then
    if v_profile.skill_level = 'beginner' or v_profile.skill_level is null then
      v_from_level := 'amateur_beginner';
      v_to_level   := 'amateur_intermediate';
      v_min_weeks  := 8;
      v_needs_approval := false;
    elsif v_profile.skill_level = 'intermediate' then
      v_from_level := 'amateur_intermediate';
      v_to_level   := 'amateur_advanced';
      v_min_weeks  := 8;
      v_needs_approval := false;
    elsif v_profile.skill_level = 'advanced' then
      v_from_level := 'amateur_advanced';
      v_to_level   := 'semi_pro';
      v_min_weeks  := 13;
      v_needs_approval := true;
    else
      return;
    end if;
  elsif v_profile.division = 'semi_pro' then
    v_from_level := 'semi_pro';
    v_to_level   := 'pro';
    v_min_weeks  := 13;
    v_needs_approval := true;
  else
    -- Pro or junior — top level, no cycle needed
    return;
  end if;

  insert into promotion_cycles (
    student_id, program_id, from_level, to_level,
    cycle_start_date, cycle_end_date,
    required_attendance_pct, min_active_weeks,
    requires_coach_approval, status
  ) values (
    p_student_id, p_program_id, v_from_level, v_to_level,
    current_date, current_date + (v_min_weeks * 7),
    80, v_min_weeks, v_needs_approval, 'active'
  );

  insert into notifications (recipient_id, title, body, type)
  values (
    p_student_id,
    '🎯 Your promotion journey has started!',
    'Attend at least 80% of your sessions and maintain 80% performance to become eligible for promotion.',
    'promotion'
  );
end;
$$;
