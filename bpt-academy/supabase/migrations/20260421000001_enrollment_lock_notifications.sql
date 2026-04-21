-- =============================================================================
-- Enrollment Lock + Payment Notifications
--
-- FEATURE 1: Enrollment Lock is enforced on the mobile client side
--   (ProgramsScreen + ProgramDetailScreen now check pending_payment,
--    pending_next_cycle, and active statuses before showing Pay & Enroll)
--
-- FEATURE 2A: When student confirms payment (enrollment INSERT with status = 'pending_payment'):
--   - Notify all coaches + admins + super_admins (in-app)
--   - Notify super_admins with type 'pending_payment_admin' → triggers email
--
-- FEATURE 2B: When coach/admin approves payment (enrollment UPDATE to active or pending_next_cycle):
--   - Notify the student with type 'payment_confirmed_student' → triggers email
-- =============================================================================

-- ─── Step 1: Extend notify_enrollment_email to handle 2 new notification types ──

CREATE OR REPLACE FUNCTION notify_enrollment_email()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_name  TEXT;
  v_resend_key TEXT := 're_hQRJcxbr_8NnMWVmgBoGjJjoaBWYZhmRt';
  v_from  TEXT := 'hello@bptacademy.uk';
  v_html  TEXT;
BEGIN
  -- Only act on types that warrant an email
  IF NEW.type NOT IN (
    'reenrollment_request',
    'enrollment_confirmed',
    'welcome',
    'admin_new_registration',
    'enrollment',
    'pending_payment_admin',
    'payment_confirmed_student'
  ) THEN
    RETURN NEW;
  END IF;

  -- Skip if already email_sent (prevents double-fire on update)
  IF NEW.email_sent = TRUE THEN
    RETURN NEW;
  END IF;

  -- Fetch recipient email from auth.users (never from profiles)
  SELECT au.email, p.full_name
    INTO v_email, v_name
    FROM auth.users au
    JOIN profiles p ON p.id = au.id
   WHERE au.id = NEW.recipient_id;

  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build minimal HTML email body
  v_html := '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0">'
    || '<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">'
    || '<div style="background:#1a2744;padding:24px 32px"><h1 style="color:#fff;margin:0;font-size:22px">BPT Academy</h1>'
    || '<p style="color:#8fa8d0;margin:4px 0 0;font-size:13px">Britain Padel Tour</p></div>'
    || '<div style="padding:32px"><h2 style="color:#1a2744;margin-top:0;font-size:18px">' || NEW.title || '</h2>'
    || '<p style="color:#444;line-height:1.6;font-size:15px">' || NEW.body || '</p></div>'
    || '<div style="background:#f4f4f4;padding:16px 32px;text-align:center;font-size:12px;color:#999;border-top:1px solid #e8e8e8">'
    || 'BPT Academy &middot; bptacademy.uk</div></div></body></html>';

  -- Send directly to Resend — NO insertion into notifications
  PERFORM net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_resend_key
    ),
    body    := jsonb_build_object(
      'from',    v_from,
      'to',      v_email,
      'subject', NEW.title,
      'html',    v_html
    )
  );

  -- Mark this notification as email_sent so process-notifications won't re-send
  UPDATE notifications SET email_sent = TRUE WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Step 2: Function to notify on new pending_payment enrollment ─────────────

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
  -- Only fire on INSERT with status = pending_payment
  IF NEW.status <> 'pending_payment' THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;
  SELECT title, current_cycle_start_date INTO v_program_title, v_program_cycle FROM programs WHERE id = NEW.program_id;

  v_ts := TO_CHAR(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI UTC');

  -- Build email subject/body for admin notification
  v_subject := 'New Enrollment Payment Pending — ' || COALESCE(v_student_name, 'Student') || ' · ' || COALESCE(v_program_title, 'Program');
  v_body    := 'Hi, ' || COALESCE(v_student_name, 'A student') || ' has enrolled in ' || COALESCE(v_program_title, 'a program')
    || ' and confirmed their payment. Please review and approve in the BPT Academy dashboard.'
    || ' Student: ' || COALESCE(v_student_name, '—')
    || ' | Program: ' || COALESCE(v_program_title, '—')
    || ' | Date: ' || v_ts
    || ' — BPT Academy';

  -- Notify all coaches, admins, and super_admins (in-app, no email)
  FOR v_recipient IN
    SELECT id, role FROM profiles WHERE role IN ('coach', 'admin', 'super_admin')
  LOOP
    IF v_recipient.role = 'super_admin' THEN
      -- super_admins get email trigger type
      INSERT INTO notifications (recipient_id, title, body, type, data)
      VALUES (
        v_recipient.id,
        v_subject,
        v_body,
        'pending_payment_admin',
        jsonb_build_object(
          'enrollment_id', NEW.id,
          'student_id', NEW.student_id,
          'program_id', NEW.program_id
        )
      );
    ELSE
      -- coaches and admins get in-app only
      INSERT INTO notifications (recipient_id, title, body, type, data)
      VALUES (
        v_recipient.id,
        '💳 New Enrollment — Payment Pending',
        COALESCE(v_student_name, 'A student') || ' has enrolled in ' || COALESCE(v_program_title, 'a program') || ' and confirmed payment. Awaiting your approval.',
        'admin_new_enrollment',
        jsonb_build_object(
          'enrollment_id', NEW.id,
          'student_id', NEW.student_id,
          'program_id', NEW.program_id
        )
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_pending_payment ON enrollments;
CREATE TRIGGER trg_notify_pending_payment
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_payment_enrollment();

-- ─── Step 3: Function to notify student when coach approves payment ───────────

CREATE OR REPLACE FUNCTION notify_payment_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name  TEXT;
  v_first_name    TEXT;
  v_program_title TEXT;
  v_cycle_start   TEXT;
  v_subject       TEXT;
  v_body          TEXT;
BEGIN
  -- Only fire on UPDATE where status changes to active or pending_next_cycle
  -- and old status was pending_payment (coach approving a payment)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('active', 'pending_next_cycle') THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'pending_payment' THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_student_name FROM profiles WHERE id = NEW.student_id;
  v_first_name := SPLIT_PART(COALESCE(v_student_name, 'Student'), ' ', 1);

  SELECT title, current_cycle_start_date INTO v_program_title, v_cycle_start FROM programs WHERE id = NEW.program_id;

  v_subject := 'You''re In! Payment Confirmed — ' || COALESCE(v_program_title, 'Your Program');
  v_body    := 'Hi ' || v_first_name || ', Great news! Your payment for ' || COALESCE(v_program_title, 'your program')
    || ' has been confirmed. You''re officially enrolled and ready to start training.'
    || ' Program: ' || COALESCE(v_program_title, '—')
    || ' | Start Date: ' || COALESCE(v_cycle_start::TEXT, 'TBC')
    || ' — The BPT Academy Team';

  -- Notify the student (type triggers email via trg_enrollment_email)
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    v_subject,
    v_body,
    'payment_confirmed_student',
    jsonb_build_object(
      'enrollment_id', NEW.id,
      'program_id', NEW.program_id,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_payment_approved ON enrollments;
CREATE TRIGGER trg_notify_payment_approved
  AFTER UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_approved();
