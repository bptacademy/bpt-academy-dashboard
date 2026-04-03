-- ============================================================
-- Parent / Junior Account System
-- ============================================================

-- 1. Add parent to user_role enum (if not exists)
-- NOTE: 'parent' may already exist in the enum. Use DO block to check first.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'parent' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'parent';
  END IF;
END $$;

-- 2. Add columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS parent_email text,
  ADD COLUMN IF NOT EXISTS child_email text,
  ADD COLUMN IF NOT EXISTS child_auth_id uuid,
  ADD COLUMN IF NOT EXISTS is_junior boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS graduated_at timestamptz;

-- 3. parent_access table
CREATE TABLE IF NOT EXISTS parent_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- 4. RLS on parent_access
ALTER TABLE parent_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parent_access' AND policyname = 'Parents can see their own links'
  ) THEN
    CREATE POLICY "Parents can see their own links"
      ON parent_access FOR SELECT
      USING (parent_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parent_access' AND policyname = 'Admins manage parent access'
  ) THEN
    CREATE POLICY "Admins manage parent access"
      ON parent_access FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
      );
  END IF;
END $$;

-- 5. Parents can read their children's profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Parents can view their children'
  ) THEN
    CREATE POLICY "Parents can view their children"
      ON profiles FOR SELECT
      USING (
        id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 6. Parents can read their children's enrollments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'Parents can view children enrollments'
  ) THEN
    CREATE POLICY "Parents can view children enrollments"
      ON enrollments FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 7. Parents can insert enrollments for children
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'enrollments' AND policyname = 'Parents can enroll children'
  ) THEN
    CREATE POLICY "Parents can enroll children"
      ON enrollments FOR INSERT
      WITH CHECK (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 8. Parents can view children's attendance
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'session_attendance' AND policyname = 'Parents can view children attendance'
  ) THEN
    CREATE POLICY "Parents can view children attendance"
      ON session_attendance FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 9. Parents can view children's progress
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'student_progress' AND policyname = 'Parents can view children progress'
  ) THEN
    CREATE POLICY "Parents can view children progress"
      ON student_progress FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 10. Parents can view children's coach notes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'coach_notes' AND policyname = 'Parents can view children coach notes'
  ) THEN
    CREATE POLICY "Parents can view children coach notes"
      ON coach_notes FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 11. Parents can view/insert payments for children
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Parents can view children payments'
  ) THEN
    CREATE POLICY "Parents can view children payments"
      ON payments FOR SELECT
      USING (
        student_id IN (
          SELECT student_id FROM parent_access WHERE parent_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 12. Auto-graduation function
CREATE OR REPLACE FUNCTION graduate_junior_to_student(p_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET role = 'student',
      is_junior = false,
      graduated_at = now()
  WHERE id = p_student_id
    AND is_junior = true
    AND date_of_birth <= (current_date - interval '16 years');

  INSERT INTO notifications (recipient_id, title, body, type)
  VALUES (
    p_student_id,
    '🎉 Welcome to the main division!',
    'You''ve turned 16 — your account has been upgraded to a full student account. You can now log in independently.',
    'system'
  );
END;
$$;
