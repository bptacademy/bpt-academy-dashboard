-- =====================================================================
-- Notification Triggers
-- All triggers simply INSERT into the notifications table.
-- Push and email delivery is handled by the process-notifications
-- edge function (called by a cron job every 2 minutes).
-- =====================================================================

-- a) New message → notify all conversation members (except sender)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  member_id UUID;
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  FOR member_id IN
    SELECT user_id FROM conversation_members
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      member_id,
      'New message from ' || COALESCE(sender_name, 'Someone'),
      LEFT(NEW.content, 100),
      'new_message',
      jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- b) New enrollment → notify student + all admins
CREATE OR REPLACE FUNCTION notify_new_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
  program_title TEXT;
  admin_id UUID;
BEGIN
  SELECT full_name INTO student_name FROM profiles WHERE id = NEW.student_id;
  SELECT title INTO program_title FROM programs WHERE id = NEW.program_id;

  -- Notify the student
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    'Enrollment confirmed',
    'You have been enrolled in ' || COALESCE(program_title, 'a program'),
    'enrollment_confirmed',
    jsonb_build_object('program_id', NEW.program_id)
  );

  -- Notify all admins
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

-- c) New payment (status = 'completed') → notify student + admins
CREATE OR REPLACE FUNCTION notify_new_payment()
RETURNS TRIGGER AS $$
DECLARE
  student_name TEXT;
  admin_id UUID;
BEGIN
  SELECT full_name INTO student_name FROM profiles WHERE id = NEW.student_id;

  -- Notify the student
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    'Payment received',
    'Your payment of £' || NEW.amount || ' has been received.',
    'payment_receipt',
    jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount)
  );

  -- Notify all admins
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO notifications (recipient_id, title, body, type, data)
    VALUES (
      admin_id,
      'Payment received',
      COALESCE(student_name, 'A student') || ' paid £' || NEW.amount,
      'admin_new_payment',
      jsonb_build_object('payment_id', NEW.id, 'student_id', NEW.student_id, 'amount', NEW.amount)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_payment ON payments;
CREATE TRIGGER on_new_payment
  AFTER INSERT ON payments
  FOR EACH ROW WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION notify_new_payment();

-- d) New student profile (registration) → notify admins
CREATE OR REPLACE FUNCTION notify_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
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

-- e) Coach note added → notify student
-- Note: This trigger depends on a coach_notes table existing with
-- columns: id, student_id, coach_id. Create after coach_notes table exists.
CREATE OR REPLACE FUNCTION notify_coach_note()
RETURNS TRIGGER AS $$
DECLARE
  coach_name TEXT;
BEGIN
  SELECT full_name INTO coach_name FROM profiles WHERE id = NEW.coach_id;

  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.student_id,
    'New coach note',
    COALESCE(coach_name, 'Your coach') || ' added a note to your profile',
    'coach_note',
    jsonb_build_object('note_id', NEW.id, 'coach_id', NEW.coach_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create this trigger if the coach_notes table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coach_notes'
  ) THEN
    DROP TRIGGER IF EXISTS on_coach_note ON coach_notes;
    CREATE TRIGGER on_coach_note
      AFTER INSERT ON coach_notes
      FOR EACH ROW EXECUTE FUNCTION notify_coach_note();
  END IF;
END;
$$;
