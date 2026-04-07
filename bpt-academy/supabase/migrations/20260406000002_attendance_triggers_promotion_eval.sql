-- ── Fix 1: Allow evaluate_promotion_cycle to run on 'eligible' too ───────────
-- Previously it bailed out if status != 'active', meaning absences after
-- reaching eligible status were silently ignored.
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
  -- Allow re-evaluation of active AND eligible cycles
  if v_cycle.status not in ('active', 'eligible') then return; end if;

  -- Resolve program
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

  -- Recalculate metrics
  v_active_weeks := get_active_weeks(v_cycle.student_id, v_program_id, v_cycle.cycle_start_date);
  v_att_pct      := get_attendance_pct(v_cycle.student_id, v_program_id, v_cycle.cycle_start_date);
  v_perf_pct     := get_performance_pct(v_cycle.student_id, v_program_id);

  -- Update stats
  update promotion_cycles set
    active_weeks_so_far = v_active_weeks,
    attendance_pct      = v_att_pct,
    performance_pct     = v_perf_pct,
    last_evaluated_at   = now(),
    program_id          = v_program_id
  where id = p_cycle_id;

  -- If all criteria met and currently active → flip to eligible
  if v_active_weeks >= v_cycle.min_active_weeks
  and v_att_pct     >= v_cycle.required_attendance_pct
  and v_perf_pct    >= 80
  and v_cycle.status = 'active'
  then
    update promotion_cycles set status = 'eligible' where id = p_cycle_id;
    insert into notifications (recipient_id, title, body, type)
    values (
      v_cycle.student_id,
      '⭐ You''re eligible for promotion!',
      'You''ve hit the attendance and performance targets. Your coach will review and approve your promotion soon.',
      'promotion'
    );
  end if;

  -- If criteria no longer met and currently eligible → revert to active
  if (v_active_weeks < v_cycle.min_active_weeks
  or v_att_pct      < v_cycle.required_attendance_pct
  or v_perf_pct     < 80)
  and v_cycle.status = 'eligible'
  then
    update promotion_cycles set status = 'active' where id = p_cycle_id;
  end if;
end;
$$;

-- ── Fix 2: Auto-evaluate after any session_attendance INSERT or UPDATE ────────
create or replace function trigger_eval_on_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id uuid;
  v_program_id uuid;
begin
  -- Find the student's active/eligible promotion cycle
  select pc.id, pc.program_id into v_cycle_id, v_program_id
  from promotion_cycles pc
  where pc.student_id = NEW.student_id
    and pc.status in ('active', 'eligible')
  order by pc.created_at desc
  limit 1;

  if v_cycle_id is not null then
    perform evaluate_promotion_cycle(v_cycle_id);
  end if;

  return NEW;
end;
$$;

drop trigger if exists after_attendance_change on session_attendance;
create trigger after_attendance_change
  after insert or update of attended
  on session_attendance
  for each row
  execute function trigger_eval_on_attendance();
