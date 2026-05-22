-- Fix end_program_cycle to also handle pending_next_cycle + pending_payment students
-- and clean up waiting list entries when a program ends

CREATE OR REPLACE FUNCTION end_program_cycle(p_program_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_title TEXT;
  enr RECORD;
BEGIN
  SELECT title INTO v_title FROM programs WHERE id = p_program_id;

  -- Mark active + pending_next_cycle students as completed and notify them
  FOR enr IN
    SELECT id, student_id
    FROM enrollments
    WHERE program_id = p_program_id
      AND status IN ('active', 'pending_next_cycle')
  LOOP
    UPDATE enrollments SET status = 'completed' WHERE id = enr.id;
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      enr.student_id,
      '🏁 Program Complete!',
      'Your ' || COALESCE(v_title, 'program') || ' has ended. Great work! You can now browse and join a new program.',
      'enrollment',
      jsonb_build_object('program_id', p_program_id)
    );
  END LOOP;

  -- Cancel pending_payment students (never confirmed) and notify them
  FOR enr IN
    SELECT id, student_id
    FROM enrollments
    WHERE program_id = p_program_id
      AND status = 'pending_payment'
  LOOP
    UPDATE enrollments SET status = 'cancelled' WHERE id = enr.id;
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      enr.student_id,
      '⚠️ Program Ended',
      'The ' || COALESCE(v_title, 'program') || ' you were registered for has now ended. Please contact your coach if you have any questions.',
      'enrollment',
      jsonb_build_object('program_id', p_program_id)
    );
  END LOOP;

  -- Clear waiting list for this program
  DELETE FROM program_waiting_list WHERE program_id = p_program_id;

  -- Deactivate the program
  UPDATE programs
  SET end_date = CURRENT_DATE, is_active = false
  WHERE id = p_program_id;

END;
$$;
