-- Allow parents to insert a profile row for their junior child
-- The built-in "Users can insert own profile" policy only allows auth.uid() = id
-- which blocks parents creating a child profile with a different ID
-- NOTE: We use auth.users.raw_user_meta_data to get the role — avoids infinite
-- recursion that occurs when querying profiles from within a profiles policy

DROP POLICY IF EXISTS "Parents can insert junior profiles" ON profiles;

CREATE POLICY "Parents can insert junior profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    is_junior = true
    AND (
      SELECT raw_user_meta_data->>'role'
      FROM auth.users
      WHERE id = auth.uid()
    ) = 'parent'
  );
