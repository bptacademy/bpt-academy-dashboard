-- Push notification trigger: fires push-on-notify edge function on every notification insert

CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://nobxhhnhakawhbimrate.supabase.co/functions/v1/push-on-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_secret_kGcekGhRQ7-_QzUO-92MbA_Ewa3OrUV'
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
