-- =====================================================================
-- Fix: Send welcome notification to new student on registration
-- Previously only notified admins; student received nothing.
-- Also fixes enrollment notification to include program name clearly.
-- =====================================================================

-- Updated registration trigger: notify student (welcome) + admins
CREATE OR REPLACE FUNCTION notify_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Welcome notification to the new student themselves
  INSERT INTO notifications (recipient_id, title, body, type, data)
  VALUES (
    NEW.id,
    'Welcome to BPT Academy! 🎾',
    'Hi ' || COALESCE(NEW.full_name, 'there') || '! Your account has been created. You can now browse programs and enroll. Welcome to the academy!',
    'welcome',
    jsonb_build_object('student_id', NEW.id)
  );

  -- Notify all admins
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

-- Updated enrollment trigger: clearer message with program name
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
    'Enrollment confirmed 🎾',
    'You''ve been successfully enrolled in ' || COALESCE(program_title, 'a program') || '. See you on the court!',
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
