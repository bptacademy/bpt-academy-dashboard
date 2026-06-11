// process-notifications Edge Function (volpair)
// Runs on a pg_cron schedule (every 5 minutes).
// Picks up unprocessed notifications (push_sent = false) and delivers:
//   - Expo push notifications for PUSH_TYPES
//   - Resend email notifications for EMAIL_TYPES
//
// Safety rules (learned from BPT Academy blast incident 2026-06-11):
//   1. Only process notifications created in the last 7 days (recency guard).
//   2. Always check email_sent = false before sending email (double-send guard).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'hello@volpair.app';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Notification types that should trigger an email to the recipient
const EMAIL_TYPES = new Set([
  'welcome',
  'match',           // mutual volley match
  'volley',          // new volley received
  'message',         // new message (serve)
]);

// Notification types that should trigger a push notification
const PUSH_TYPES = new Set([
  'welcome',
  'match',
  'volley',
  'message',
  'post_match_prompt',
  'announcement',
]);

Deno.serve(async () => {
  try {
    // Safety guard 1: only process notifications created in the last 7 days.
    // Prevents historical notifications from being re-emailed after any column
    // reset, migration, or redeployment (blast prevention).
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pending, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('push_sent', false)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!pending || pending.length === 0) {
      return new Response('No pending notifications', { status: 200 });
    }

    let processed = 0;
    let pushErrors = 0;
    let emailErrors = 0;

    for (const notif of pending) {
      // Fetch user preferences
      const { data: user } = await supabase
        .from('users')
        .select('email_notifications_enabled')
        .eq('id', notif.recipient_id)
        .single();

      // Default to true if not set
      const emailEnabled = user?.email_notifications_enabled !== false;

      // --- Push notification ---
      if (PUSH_TYPES.has(notif.type)) {
        const { data: tokens, error: tokenErr } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', notif.recipient_id);

        if (tokenErr) {
          console.error(`Token fetch error for notif ${notif.id}:`, tokenErr);
          pushErrors++;
        } else if (tokens && tokens.length > 0) {
          const messages = tokens.map((t: { token: string }) => ({
            to: t.token,
            sound: 'default',
            title: notif.title,
            body: notif.body,
            data: { ...(notif.data ?? {}), type: notif.type },
          }));

          const pushRes = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });

          if (!pushRes.ok) {
            console.error(`Expo push error for notif ${notif.id}:`, await pushRes.text());
            pushErrors++;
          }
        }
      }

      // --- Email notification ---
      // Safety guard 2: check email_sent = false before sending.
      // Prevents double-sending if the notification is picked up more than once.
      if (EMAIL_TYPES.has(notif.type) && emailEnabled && !notif.email_sent) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(notif.recipient_id);
          const email = authUser?.user?.email;

          if (email && RESEND_API_KEY) {
            const html = buildEmailHtml(notif.title, notif.body, notif.type);
            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: FROM_EMAIL,
                to: email,
                subject: notif.title,
                html,
              }),
            });

            if (emailRes.ok) {
              await supabase
                .from('notifications')
                .update({ email_sent: true })
                .eq('id', notif.id);
            } else {
              const errText = await emailRes.text();
              console.error(`Resend error for notif ${notif.id}:`, errText);
              emailErrors++;
            }
          }
        } catch (emailErr) {
          console.error(`Email processing error for notif ${notif.id}:`, emailErr);
          emailErrors++;
        }
      }

      // Mark push_sent = true (prevents reprocessing)
      await supabase
        .from('notifications')
        .update({ push_sent: true })
        .eq('id', notif.id);

      processed++;
    }

    const summary = `Processed ${processed} notifications (push errors: ${pushErrors}, email errors: ${emailErrors})`;
    console.log(summary);
    return new Response(summary, { status: 200 });
  } catch (err) {
    console.error('process-notifications fatal error:', err);
    return new Response('Error: ' + (err as Error).message, { status: 500 });
  }
});

function buildEmailHtml(title: string, body: string, type?: string): string {
  const isWelcome = type === 'welcome';
  const isMatch = type === 'match';

  const ctaHtml = isWelcome
    ? `<div style="text-align:center;margin-top:24px;">
        <a href="https://volpair.app" style="background:#00D4C8;color:#0f172a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Open volpair</a>
       </div>`
    : isMatch
    ? `<div style="text-align:center;margin-top:24px;">
        <a href="https://volpair.app" style="background:#7C3AED;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">See Your Match</a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td align="center" style="padding-bottom:28px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#00D4C8;letter-spacing:2px;">volpair</p>
          <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:3px;text-transform:uppercase;">Every rally starts with a match.</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(0,212,200,0.2);padding:36px;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f1f5f9;">${title}</h2>
          <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6;">${body}</p>
          ${ctaHtml}
        </td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);">© 2026 volpair · volpair.app</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
