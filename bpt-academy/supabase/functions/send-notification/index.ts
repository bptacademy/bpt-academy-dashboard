// IMPORTANT: Before deploying, set these env vars in Supabase Dashboard → Project Settings → Edge Functions:
//   RESEND_API_KEY   — your Resend API key (https://resend.com)
//   SUPABASE_SERVICE_ROLE_KEY — your Supabase service role secret key
//
// Deploy command:
//   npx supabase functions deploy send-notification --project-ref nobxhhnhakawhbimrate

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = 'https://nobxhhnhakawhbimrate.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'BPT Academy <notifications@bptacademy.co.uk>';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function buildEmailHtml(title: string, body: string, type: string): string {
  const typeColors: Record<string, string> = {
    announcement: '#3B82F6',
    promotion: '#16A34A',
    session_reminder: '#F59E0B',
    new_video: '#8B5CF6',
    message: '#EC4899',
  };
  const color = typeColors[type] ?? '#16A34A';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:${color};padding:28px 32px;">
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">BPT Academy</p>
      <h1 style="margin:8px 0 0;color:#FFFFFF;font-size:22px;font-weight:800;line-height:1.3;">${title}</h1>
    </div>
    <!-- Body -->
    <div style="padding:28px 32px;">
      ${body ? `<p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">${body.replace(/\n/g, '<br>')}</p>` : ''}
      <a href="#" style="display:inline-block;background:${color};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;">Open App</a>
    </div>
    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;background:#F9FAFB;">
      <p style="margin:0;color:#9CA3AF;font-size:12px;">You're receiving this because you're a member of BPT Academy. Open the app to manage your notification preferences.</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { notification_ids } = body;

    // notification_ids: array of notification IDs to send emails for
    if (!notification_ids?.length) {
      return new Response(JSON.stringify({ error: 'notification_ids required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch notifications with recipient info (only unsent)
    const { data: notifications } = await supabase
      .from('notifications')
      .select('id, recipient_id, title, body, type')
      .in('id', notification_ids)
      .eq('email_sent', false);

    if (!notifications?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get emails from auth.users for each recipient
    let sent = 0;
    const sentIds: string[] = [];

    for (const notif of notifications) {
      // Check if user has email notifications enabled
      const { data: pref } = await supabase
        .from('profiles')
        .select('email_notifications_enabled')
        .eq('id', notif.recipient_id)
        .single();

      if (pref?.email_notifications_enabled === false) continue;

      // Get email from auth
      const { data: { user } } = await supabase.auth.admin.getUserById(notif.recipient_id);
      if (!user?.email) continue;

      const html = buildEmailHtml(notif.title, notif.body ?? '', notif.type ?? 'announcement');
      const ok = await sendEmail(user.email, notif.title, html);

      if (ok) {
        sentIds.push(notif.id);
        sent++;
      }
    }

    // Mark as sent
    if (sentIds.length > 0) {
      await supabase.from('notifications').update({ email_sent: true }).in('id', sentIds);
    }

    return new Response(JSON.stringify({ sent, total: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
