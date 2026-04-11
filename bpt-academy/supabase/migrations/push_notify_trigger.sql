-- Push notification trigger: fires push-on-notify edge function on every notification insert
-- NOTE: The service role key is stored in Supabase Vault / app settings, not hardcoded here.
-- The actual live function in the DB uses current_setting('app.service_role_key', true).

CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/push-on-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'recipient_id', NEW.recipient_id,
      'title', NEW.title,
      'body', NEW.body,
      'type', NEW.type,
      'data', COALESCE(NEW.data, '{}'::jsonb)
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
