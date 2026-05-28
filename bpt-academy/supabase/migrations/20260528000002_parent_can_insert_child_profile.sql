-- Allow parents to insert a profile row for their junior child
-- The built-in "Users can insert own profile" policy only allows auth.uid() = id
-- which blocks parents creating a child profile with a different ID

DROP POLICY IF EXISTS "Parents can insert junior profiles" ON profiles;

CREATE POLICY "Parents can insert junior profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    is_junior = true
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
    )
  );
