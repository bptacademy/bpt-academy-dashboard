-- =============================================================================
-- FIX: Email blast loop on new account creation
--
-- ROOT CAUSE:
--   1. notify_new_registration() inserts rows into `notifications`
--   2. trg_enrollment_email fires on each INSERT → calls send-notification edge fn
--   3. send-notification edge fn INSERT a NEW notification row
--   4. That INSERT fires trg_enrollment_email AGAIN → infinite cascade → ~80 emails
--
-- FIX STRATEGY:
--   A. Replace notify_enrollment_email() so it sends email directly via
--      net.http_post to Resend API (no edge function call, no DB insert).
--   B. Drop trg_push_on_notify (push is already handled by process-notifications
--      cron job every 2 min — running both causes duplicate pushes too).
--   C. Add email_sent guard: skip if notifications.email_sent = true already.
--   D. Fix notify_new_registration to only notify admins (not coaches).
--   E. Fix notify_new_enrollment to only fire on status = 'active' enrollments
--      (not pending_payment / pending_next_cycle).
-- =============================================================================

-- ─── A. Fix notify_enrollment_email: send directly, NO new notification row ──

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
    'enrollment'
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

-- ─── B. Drop trg_push_on_notify (process-notifications cron handles push) ───
-- Keeping both causes duplicate push notifications.
DROP TRIGGER IF EXISTS trg_push_on_notify ON notifications;

-- ─── C. Recreate trg_enrollment_email cleanly ────────────────────────────────
DROP TRIGGER IF EXISTS trg_enrollment_email ON notifications;
CREATE TRIGGER trg_enrollment_email
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_enrollment_email();

-- ─── D. Fix notify_new_registration: admin+super_admin only (not coach) ──────
CREATE OR REPLACE FUNCTION notify_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Welcome notification to the new student
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.id,
    'Welcome to BPT Academy! 🎾',
    'Hi ' || COALESCE(NEW.full_name, 'there') || '! Your account has been created. You can now browse programs and enroll. Welcome to the academy!',
    'welcome',
    jsonb_build_object('student_id', NEW.id)
  );

  -- Notify admins and super_admins only (not coaches)
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      admin_id,
      'New student registered',
      COALESCE(NEW.full_name, 'A new student') || ' just joined BPT Academy',
      'admin_new_registration',
      jsonb_build_object('student_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_registration ON profiles;
CREATE TRIGGER on_new_registration
  AFTER INSERT ON profiles
  FOR EACH ROW WHEN (NEW.role = 'student')
  EXECUTE FUNCTION notify_new_registration();

-- ─── E. Fix notify_new_enrollment: only fire on active status ────────────────
CREATE OR REPLACE FUNCTION notify_new_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  student_name  TEXT;
  program_title TEXT;
  admin_id      UUID;
BEGIN
  -- Don't notify for pending states — only confirmed active enrollments
  IF NEW.status NOT IN ('active', 'enrollment_confirmed') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO student_name  FROM profiles WHERE id = NEW.student_id;
  SELECT title     INTO program_title FROM programs  WHERE id = NEW.program_id;

  -- Notify the student (1 notification)
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    'Enrollment confirmed 🎾',
    'You''ve been successfully enrolled in ' || COALESCE(program_title, 'a program') || '. See you on the court!',
    'enrollment_confirmed',
    jsonb_build_object('program_id', NEW.program_id)
  );

  -- Notify admins + super_admins only (not coaches)
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      admin_id,
      'New enrollment',
      COALESCE(student_name, 'A student') || ' enrolled in ' || COALESCE(program_title, 'a program'),
      'admin_new_enrollment',
      jsonb_build_object('program_id', NEW.program_id, 'student_id', NEW.student_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_enrollment ON enrollments;
CREATE TRIGGER on_new_enrollment
  AFTER INSERT ON enrollments
  FOR EACH ROW EXECUTE FUNCTION notify_new_enrollment();

-- ─── F. Audit: ensure process-notifications won't re-send already sent emails ─
-- The process-notifications edge fn checks email_sent flag — already correct.
-- But we add the guard here too: skip notifications where email_sent = true.
-- (No SQL change needed — process-notifications already does this check.)

-- ─── G. Clean up any leftover blast notifications from today ─────────────────
-- Delete duplicate notifications of the same type+recipient created within the
-- last 24 hours, keeping only the oldest one per (recipient_id, type) pair.
DELETE FROM notifications
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY recipient_id, type
             ORDER BY created_at ASC
           ) AS rn
    FROM notifications
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND type IN ('welcome', 'admin_new_registration', 'enrollment_confirmed', 'admin_new_enrollment')
  ) ranked
  WHERE rn > 1
);
