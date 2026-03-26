-- =============================================
-- Migration: Promotion Engine
-- 2026-03-26
-- =============================================
-- Upgrades the promotion system to:
-- 1. Track active weeks (Option B — only weeks
--    with attendance count toward the minimum)
-- 2. Store performance score snapshot
-- 3. Auto-flag eligible when both thresholds met
-- 4. Enforce minimum active-week requirements
-- =============================================

-- ── Extend promotion_cycles ───────────────────────────────────
alter table promotion_cycles
  add column if not exists min_active_weeks    int not null default 8,
  add column if not exists active_weeks_so_far int not null default 0,
  add column if not exists attendance_pct      int not null default 0,
  add column if not exists performance_pct     int not null default 0,
  add column if not exists last_evaluated_at   timestamptz,
  add column if not exists rejection_note      text,
  add column if not exists program_id          uuid references programs(id);

-- min_active_weeks per transition:
--   amateur_beginner     → amateur_intermediate : 8  weeks (2 months)
--   amateur_intermediate → amateur_advanced     : 8  weeks (2 months)
--   amateur_advanced     → semi_pro             : 13 weeks (3 months)
--   semi_pro             → pro                  : 13 weeks (3 months)

-- ── Function: calculate active weeks ──────────────────────────
-- An "active week" = a calendar week where the student attended
-- at least one session. This is Option B — time only counts
-- when the student actually showed up.
create or replace function get_active_weeks(
  p_student_id  uuid,
  p_program_id  uuid,
  p_from_date   date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_weeks int;
begin
  select count(distinct date_trunc('week', ps.scheduled_at))
  into v_active_weeks
  from session_attendance sa
  join program_sessions ps on ps.id = sa.session_id
  where sa.student_id  = p_student_id
    and ps.program_id  = p_program_id
    and sa.attended    = true
    and ps.scheduled_at >= p_from_date::timestamptz;

  return coalesce(v_active_weeks, 0);
end;
$$;

-- ── Function: calculate attendance % ─────────────────────────
create or replace function get_attendance_pct(
  p_student_id  uuid,
  p_program_id  uuid,
  p_from_date   date
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total     int;
  v_attended  int;
begin
  -- Total sessions in the program from cycle start to now
  select count(*) into v_total
  from program_sessions
  where program_id   = p_program_id
    and scheduled_at >= p_from_date::timestamptz
    and scheduled_at <= now();

  if v_total = 0 then return 0; end if;

  -- Sessions the student attended
  select count(*) into v_attended
  from session_attendance sa
  join program_sessions ps on ps.id = sa.session_id
  where sa.student_id  = p_student_id
    and ps.program_id  = p_program_id
    and sa.attended    = true
    and ps.scheduled_at >= p_from_date::timestamptz
    and ps.scheduled_at <= now();

  return round((v_attended::numeric / v_total) * 100);
end;
$$;

-- ── Function: calculate performance % ────────────────────────
-- Average of all module scores for the student in their program.
-- Only counts modules that have been scored (score is not null).
create or replace function get_performance_pct(
  p_student_id uuid,
  p_program_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg int;
begin
  select round(avg(sp.score))
  into v_avg
  from student_progress sp
  join modules m on m.id = sp.module_id
  where sp.student_id = p_student_id
    and m.program_id  = p_program_id
    and sp.score      is not null;

  return coalesce(v_avg, 0);
end;
$$;

-- ── Function: evaluate a single promotion cycle ───────────────
-- Called by the auto-check. Updates the cycle's stats and
-- flips status to 'eligible' when all criteria are met.
create or replace function evaluate_promotion_cycle(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle         promotion_cycles%rowtype;
  v_active_weeks  int;
  v_att_pct       int;
  v_perf_pct      int;
  v_program_id    uuid;
begin
  select * into v_cycle from promotion_cycles where id = p_cycle_id;
  if not found then return; end if;
  if v_cycle.status not in ('active') then return; end if;

  -- Resolve program: use stored program_id or find student's active enrollment
  v_program_id := v_cycle.program_id;
  if v_program_id is null then
    select program_id into v_program_id
    from enrollments
    where student_id = v_cycle.student_id
      and status = 'active'
    order by enrolled_at desc
    limit 1;
  end if;

  if v_program_id is null then return; end if;

  -- Calculate all three metrics
  v_active_weeks := get_active_weeks(v_cycle.student_id, v_program_id, v_cycle.cycle_start_date);
  v_att_pct      := get_attendance_pct(v_cycle.student_id, v_program_id, v_cycle.cycle_start_date);
  v_perf_pct     := get_performance_pct(v_cycle.student_id, v_program_id);

  -- Update the cycle with latest stats
  update promotion_cycles set
    active_weeks_so_far = v_active_weeks,
    attendance_pct      = v_att_pct,
    performance_pct     = v_perf_pct,
    last_evaluated_at   = now(),
    program_id          = v_program_id
  where id = p_cycle_id;

  -- Check if all criteria met → flip to eligible
  if v_active_weeks  >= v_cycle.min_active_weeks
  and v_att_pct      >= v_cycle.required_attendance_pct
  and v_perf_pct     >= 80
  then
    update promotion_cycles
    set status = 'eligible'
    where id = p_cycle_id;

    -- Notify the student
    insert into notifications (recipient_id, title, body, type)
    select
      v_cycle.student_id,
      '⭐ You''re eligible for promotion!',
      'You''ve hit the attendance and performance targets. Your coach will review and approve your promotion soon.',
      'promotion';
  end if;
end;
$$;

-- ── Function: evaluate ALL active cycles (called by cron) ─────
create or replace function evaluate_all_promotion_cycles()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id  uuid;
  v_count     int := 0;
begin
  for v_cycle_id in
    select id from promotion_cycles where status = 'active'
  loop
    perform evaluate_promotion_cycle(v_cycle_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── Function: start promotion cycle automatically ─────────────
-- Called when a student is enrolled in a program.
-- Looks up their current level and starts the right cycle.
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
  v_profile       profiles%rowtype;
  v_from_level    text;
  v_to_level      text;
  v_min_weeks     int;
  v_needs_approval boolean;
  v_existing      int;
begin
  select * into v_profile from profiles where id = p_student_id;
  if not found then return; end if;

  -- Don't create duplicate active cycles
  select count(*) into v_existing
  from promotion_cycles
  where student_id = p_student_id
    and status in ('active', 'eligible', 'approved');
  if v_existing > 0 then return; end if;

  -- Determine from/to levels based on profile
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
      return; -- unknown level
    end if;
  elsif v_profile.division = 'semi_pro' then
    v_from_level := 'semi_pro';
    v_to_level   := 'pro';
    v_min_weeks  := 13;
    v_needs_approval := true;
  else
    return; -- pro or junior — no auto cycle
  end if;

  insert into promotion_cycles (
    student_id,
    program_id,
    from_level,
    to_level,
    cycle_start_date,
    cycle_end_date,
    required_attendance_pct,
    min_active_weeks,
    requires_coach_approval,
    status
  ) values (
    p_student_id,
    p_program_id,
    v_from_level,
    v_to_level,
    current_date,
    current_date + (v_min_weeks * 7),  -- initial end date estimate
    80,
    v_min_weeks,
    v_needs_approval,
    'active'
  );

  -- Notify student
  insert into notifications (recipient_id, title, body, type)
  values (
    p_student_id,
    '🎯 Your promotion journey has started!',
    'Attend at least 80% of your sessions and maintain 80% performance to become eligible for promotion.',
    'promotion'
  );
end;
$$;

-- ── Trigger: auto-start cycle on enrollment ───────────────────
create or replace function trigger_promotion_on_enroll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' then
    perform start_promotion_cycle_for_student(new.student_id, new.program_id);
  end if;
  return new;
end;
$$;

drop trigger if exists auto_start_promotion_cycle on enrollments;
create trigger auto_start_promotion_cycle
  after insert or update of status on enrollments
  for each row execute function trigger_promotion_on_enroll();
