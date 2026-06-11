import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'hello@bptacademy.uk';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Notification types that should also trigger an email to the RECIPIENT
const EMAIL_TYPES = new Set([
  'enrollment_confirmed',
  'payment_receipt',
  'promotion_result',
  'welcome',           // sent to new student on registration
  'coach_note',
  'session_reminder',
  'waitlist_join',     // sent when student joins a waiting list
  'waitlist_approved', // sent when coach approves student from waiting list
]);

// Notification types that should trigger a push notification
const PUSH_TYPES = new Set([
  'new_message',
  'enrollment_confirmed',
  'payment_receipt',
  'coach_note',
  'admin_new_enrollment',
  'admin_new_registration',
  'admin_new_payment',
  'session_reminder',
  'announcement',
  'promotion_result',
  'welcome',
  'waitlist_join',
  'waitlist_approved',
]);

Deno.serve(async () => {
  try {
    // Safety guard: only process notifications created in the last 7 days.
    // This prevents old notifications (e.g. from before push_sent was added)
    // from being re-processed and re-emailed after a column reset or redeployment.
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch up to 50 unprocessed notifications (push_sent = false, recent only)
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
      // Fetch profile separately so we always get fresh data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email_notifications_enabled')
        .eq('id', notif.recipient_id)
        .single();

      // email_notifications_enabled defaults to TRUE; treat NULL as TRUE for safety
      const emailEnabled = profile?.email_notifications_enabled !== false;

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
      // Guard: skip if already emailed (prevents double-send on reprocessing)
      if (EMAIL_TYPES.has(notif.type) && emailEnabled && !notif.email_sent) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(notif.recipient_id);
          const email = authUser?.user?.email;

          if (email) {
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
  const isWelcome = type === 'welcome' || type === 'enrollment_confirmed';
  const isWaitlist = type === 'waitlist_join';
  const isApproved = type === 'waitlist_approved';

  const ctaHtml = isWelcome
    ? `<div style="text-align:center;margin-top:24px;">
        <a href="https://bptacademy.uk" style="background:#16A34A;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Open BPT Academy</a>
       </div>`
    : isApproved
    ? `<div style="text-align:center;margin-top:24px;">
        <a href="https://bptacademy.uk" style="background:#3B82F6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Pay &amp; Enroll Now</a>
       </div>`
    : '';

  const extraHtml = isWaitlist
    ? `<div style="background:#FFF7ED;border-left:4px solid #F59E0B;padding:16px 20px;border-radius:0 8px 8px 0;margin-top:20px;">
        <p style="margin:0;color:#92400E;font-size:14px;line-height:1.6;">
          One of our coaches will review your profile and may get in touch with you if a level assessment is needed before your spot can be confirmed.
        </p>
       </div>`
    : '';

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
      ${extraHtml}
      ${ctaHtml}
    </div>
    <div class="footer">
      BPT Academy &middot; bptacademy.uk<br>
      You are receiving this because you have an active account with BPT Academy.
    </div>
  </div>
</body>
</html>`;
}
