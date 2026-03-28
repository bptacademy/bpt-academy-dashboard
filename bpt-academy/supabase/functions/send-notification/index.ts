import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'office@bptacademy.uk';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationPayload {
  recipient_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  send_push?: boolean;
  send_email?: boolean;
  email_subject?: string;
  email_html?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const {
      recipient_id,
      title,
      body,
      type,
      data = {},
      send_push = false,
      send_email = false,
      email_subject,
      email_html,
    } = payload;

    if (!recipient_id || !title || !body || !type) {
      return new Response('Missing required fields: recipient_id, title, body, type', { status: 400 });
    }

    // 1. Insert notification record
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        recipient_id,
        title,
        body,
        type,
        data,
        push_sent: false,
        email_sent: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert notification:', insertError);
      return new Response('Failed to create notification: ' + insertError.message, { status: 500 });
    }

    let pushSent = false;
    let emailSent = false;

    // 2. Send push notification
    if (send_push) {
      const { data: tokens, error: tokenError } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', recipient_id);

      if (tokenError) {
        console.error('Failed to fetch push tokens:', tokenError);
      } else if (tokens && tokens.length > 0) {
        const messages = tokens.map((t) => ({
          to: t.token,
          sound: 'default',
          title,
          body,
          data: { ...data, type },
        }));

        const pushRes = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });

        if (pushRes.ok) {
          pushSent = true;
        } else {
          console.error('Expo push error:', await pushRes.text());
        }
      }
    }

    // 3. Send email notification
    if (send_email) {
      // Check if user has email notifications enabled
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_notifications_enabled')
        .eq('id', recipient_id)
        .single();

      if (profile?.email_notifications_enabled) {
        const { data: authUser } = await supabase.auth.admin.getUserById(recipient_id);
        const email = authUser?.user?.email;

        if (email) {
          const finalHtml = email_html ?? buildEmailHtml(title, body);
          const finalSubject = email_subject ?? title;

          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: email,
              subject: finalSubject,
              html: finalHtml,
            }),
          });

          if (emailRes.ok) {
            emailSent = true;
          } else {
            console.error('Resend error:', await emailRes.text());
          }
        }
      }
    }

    // 4. Update sent flags
    if (pushSent || emailSent) {
      await supabase
        .from('notifications')
        .update({
          push_sent: pushSent,
          email_sent: emailSent,
        })
        .eq('id', notification.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        push_sent: pushSent,
        email_sent: emailSent,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-notification error:', err);
    return new Response('Error: ' + (err as Error).message, { status: 500 });
  }
});

function buildEmailHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a2744; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
    .header p { color: #8fa8d0; margin: 4px 0 0; font-size: 13px; }
    .content { padding: 32px; }
    .content h2 { color: #1a2744; margin-top: 0; font-size: 18px; }
    .content p { color: #444; line-height: 1.6; font-size: 15px; }
    .footer { background: #f4f4f4; padding: 16px 32px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e8e8e8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BPT Academy</h1>
      <p>Britain Padel Tour</p>
    </div>
    <div class="content">
      <h2>${title}</h2>
      <p>${body}</p>
    </div>
    <div class="footer">
      BPT Academy &middot; bptacademy.uk<br>
      You are receiving this because you have an active account with BPT Academy.
    </div>
  </div>
</body>
</html>`;
}
