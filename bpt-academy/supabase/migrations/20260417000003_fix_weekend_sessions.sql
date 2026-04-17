-- Move all Saturday sessions to the following Monday
-- Move all Sunday sessions to the following Monday
UPDATE program_sessions
SET scheduled_at = scheduled_at + (
  CASE EXTRACT(DOW FROM scheduled_at)
    WHEN 6 THEN INTERVAL '2 days'  -- Saturday → Monday
    WHEN 0 THEN INTERVAL '1 day'   -- Sunday → Monday
  END
)
WHERE EXTRACT(DOW FROM scheduled_at) IN (0, 6);

-- Also fix modules.session_date where weekends exist
UPDATE modules
SET session_date = (session_date::date + (
  CASE EXTRACT(DOW FROM session_date::date)
    WHEN 6 THEN INTERVAL '2 days'
    WHEN 0 THEN INTERVAL '1 day'
  END
))::date
WHERE EXTRACT(DOW FROM session_date::date) IN (0, 6)
  AND session_date IS NOT NULL;
