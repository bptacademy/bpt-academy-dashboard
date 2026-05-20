-- Fix: notify_pending_payment_enrollment used NEW.created_at which doesn't
-- exist on enrollments table. The correct column is enrolled_at.
-- Also use COALESCE(NEW.enrolled_at, now()) as a safe fallback.

CREATE OR REPLACE FUNCTION notify_pending_payment_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name  TEXT;
  v_program_title TEXT;
  v_program_cycle TEXT;
  v_recipient     RECORD;
  v_subject       TEXT;
  v_body          TEXT;
  v_ts            TEXT;
BEGIN
  IF NEW.status <> 'pending_payment' THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;
  SELECT title, current_cycle_start_date INTO v_program_title, v_program_cycle FROM programs WHERE id = NEW.program_id;

  -- Use enrolled_at (correct column); fall back to now() if null
  v_ts := TO_CHAR(COALESCE(NEW.enrolled_at, now()) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC');

  v_subject := 'New Enrollment Payment Pending — ' || COALESCE(v_student_name, 'Student') || ' · ' || COALESCE(v_program_title, 'Program');
  v_body    := 'Hi, ' || COALESCE(v_student_name, 'A student') || ' has enrolled in ' || COALESCE(v_program_title, 'a program')
    || ' and confirmed their payment. Please review and approve in the BPT Academy dashboard.'
    || ' Student: ' || COALESCE(v_student_name, '—')
    || ' | Program: ' || COALESCE(v_program_title, '—')
    || ' | Date: ' || v_ts
    || ' — BPT Academy';

  FOR v_recipient IN
    SELECT id, role FROM profiles WHERE role IN ('coach', 'admin', 'super_admin')
  LOOP
    IF v_recipient.role = 'super_admin' THEN
      INSERT INTO notifications (recipient_id, title, body, type, data)
      VALUES (
        v_recipient.id, v_subject, v_body, 'pending_payment_admin',
        jsonb_build_object('enrollment_id', NEW.id, 'student_id', NEW.student_id, 'program_id', NEW.program_id)
      );
    ELSE
      INSERT INTO notifications (recipient_id, title, body, type, data)
      VALUES (
        v_recipient.id,
        '💳 New Enrollment — Payment Pending',
        COALESCE(v_student_name, 'A student') || ' has enrolled in ' || COALESCE(v_program_title, 'a program') || ' and confirmed payment. Awaiting your approval.',
        'admin_new_enrollment',
        jsonb_build_object('enrollment_id', NEW.id, 'student_id', NEW.student_id, 'program_id', NEW.program_id)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
