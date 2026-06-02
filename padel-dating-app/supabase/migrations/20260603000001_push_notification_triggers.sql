-- Push notification triggers for volpair
-- Fires send-notification edge function on key events:
--   1. New Volley (connection INSERT with pending status)
--   2. Mutual match (connection UPDATE to accepted)
--   3. New Serve/message (serves INSERT)
--
-- Key is read from app_settings to avoid hardcoding and to survive key rotations.

-- Helper function: send a push notification via send-notification edge function
CREATE OR REPLACE FUNCTION volpair_send_push(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _key text;
BEGIN
  SELECT value INTO _key FROM app_settings WHERE key = 'service_role_key';
  IF _key IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url := 'https://qmdewocktouqoibbqurh.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object(
      'userId', p_user_id,
      'title', p_title,
      'body', p_body,
      'data', p_data
    )
  );
END;
$$;

-- ─── Trigger 1: New Volley received ───────────────────────────────────────────
-- Fires when someone sends a Volley (connection INSERT, status = pending)
-- Notifies the other user (initiator -> recipient)
CREATE OR REPLACE FUNCTION trg_fn_notify_new_volley()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _sender_name text;
BEGIN
  -- Only fire for new pending connections (Volleys)
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT full_name INTO _sender_name FROM users WHERE id = NEW.user_id;

  PERFORM volpair_send_push(
    NEW.target_user_id,
    '💘 New Volley!',
    COALESCE(_sender_name, 'Someone') || ' sent you a Volley',
    jsonb_build_object('type', 'volley', 'userId', NEW.user_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_volley ON connections;
CREATE TRIGGER trg_notify_new_volley
  AFTER INSERT ON connections
  FOR EACH ROW EXECUTE FUNCTION trg_fn_notify_new_volley();

-- ─── Trigger 2: Mutual match (both Volleyed each other) ───────────────────────
-- Fires when a connection is updated to 'accepted' (mutual match detected)
CREATE OR REPLACE FUNCTION trg_fn_notify_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _name_a text;
  _name_b text;
BEGIN
  -- Only fire on status change to accepted
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN RETURN NEW; END IF;

  SELECT full_name INTO _name_a FROM users WHERE id = NEW.user_id;
  SELECT full_name INTO _name_b FROM users WHERE id = NEW.target_user_id;

  -- Notify both users
  PERFORM volpair_send_push(
    NEW.user_id,
    '🎉 It''s a Match!',
    'You and ' || COALESCE(_name_b, 'someone') || ' matched! Send your first Serve.',
    jsonb_build_object('type', 'match', 'connectionId', NEW.id, 'matchedUserId', NEW.target_user_id)
  );

  PERFORM volpair_send_push(
    NEW.target_user_id,
    '🎉 It''s a Match!',
    'You and ' || COALESCE(_name_a, 'someone') || ' matched! Send your first Serve.',
    jsonb_build_object('type', 'match', 'connectionId', NEW.id, 'matchedUserId', NEW.user_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_match ON connections;
CREATE TRIGGER trg_notify_match
  AFTER UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION trg_fn_notify_match();

-- ─── Trigger 3: New Serve (message) received ─────────────────────────────────
-- Fires when a new serve (message) is inserted
CREATE OR REPLACE FUNCTION trg_fn_notify_new_serve()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _sender_name text;
  _recipient_id uuid;
BEGIN
  -- Find the other user in this connection
  SELECT
    CASE WHEN c.user_id = NEW.sender_id THEN c.target_user_id
         ELSE c.user_id END
  INTO _recipient_id
  FROM connections c WHERE c.id = NEW.connection_id;

  IF _recipient_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO _sender_name FROM users WHERE id = NEW.sender_id;

  PERFORM volpair_send_push(
    _recipient_id,
    '🎾 New Serve from ' || COALESCE(_sender_name, 'your match'),
    NEW.body,
    jsonb_build_object('type', 'serve', 'connectionId', NEW.connection_id, 'senderId', NEW.sender_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_serve ON serves;
CREATE TRIGGER trg_notify_new_serve
  AFTER INSERT ON serves
  FOR EACH ROW EXECUTE FUNCTION trg_fn_notify_new_serve();
