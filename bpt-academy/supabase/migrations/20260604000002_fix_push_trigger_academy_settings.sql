-- ─── Fix push notification trigger ───────────────────────────────────────────
-- Previous version used current_setting('app.service_role_key', true) which
-- returns NULL on Supabase (ALTER DATABASE SET is blocked).
-- Fix: read service_role_key from academy_settings table instead.
-- Applied: 2026-06-04

CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_service_key text;
BEGIN
  -- Read service role key from academy_settings
  SELECT value INTO v_service_key
  FROM academy_settings
  WHERE key = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING '[push] service_role_key missing from academy_settings — skipping push';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/push-on-notify',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'recipient_id', NEW.recipient_id,
      'title',        NEW.title,
      'body',         NEW.body,
      'type',         NEW.type,
      'data',         COALESCE(NEW.data, '{}'::jsonb)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_on_notify ON notifications;

CREATE TRIGGER trg_push_on_notify
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_push_on_insert();
