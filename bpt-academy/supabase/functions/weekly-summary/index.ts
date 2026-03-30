import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'hello@bptacademy.uk';

Deno.serve(async () => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);

    // Gather stats in parallel
    const [
      { count: totalStudents },
      { count: activeEnrollments },
      { data: recentPayments },
      { data: upcomingSessions },
      { data: admins },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student'),
      supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('payments')
        .select('amount, student_id, profiles!student_id(full_name)')
        .gte('created_at', weekStart.toISOString())
        .eq('status', 'completed'),
      supabase
        .from('program_sessions')
        .select('id, scheduled_at, programs(title)')
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', weekEnd.toISOString())
        .order('scheduled_at'),
      supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'super_admin']),
    ]);

    if (!admins || admins.length === 0) {
      return new Response('No admins found to email', { status: 200 });
    }

    const totalPaymentsAmount =
      recentPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

    // Build payment rows HTML
    const paymentRows =
      recentPayments && recentPayments.length > 0
        ? recentPayments
            .map(
              (p) =>
                `<tr>
                  <td style="padding:6px 0;color:#444;">${(p as any).profiles?.full_name ?? 'Unknown'}</td>
                  <td style="padding:6px 0;color:#444;text-align:right;">£${Number(p.amount).toFixed(2)}</td>
                </tr>`
            )
            .join('')
        : '<tr><td colspan="2" style="padding:6px 0;color:#999;">No payments this week</td></tr>';

    // Build session rows HTML
    const sessionRows =
      upcomingSessions && upcomingSessions.length > 0
        ? upcomingSessions
            .map((s) => {
              const date = new Date(s.scheduled_at).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return `<tr>
                <td style="padding:6px 0;color:#444;">${date}</td>
                <td style="padding:6px 0;color:#444;">${(s.programs as any)?.title ?? ''}</td>
              </tr>`;
            })
            .join('')
        : '<tr><td colspan="2" style="padding:6px 0;color:#999;">No sessions this week</td></tr>';

    const dateLabel = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const html = `<!DOCTYPE html>
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
    .stat-row { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat { background: #f0f4ff; border-radius: 8px; padding: 16px 24px; flex: 1; text-align: center; }
    .stat .num { font-size: 28px; font-weight: bold; color: #1a2744; }
    .stat .label { font-size: 12px; color: #666; margin-top: 4px; }
    h3 { color: #1a2744; margin: 24px 0 12px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; }
    .footer { background: #f4f4f4; padding: 16px 32px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e8e8e8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BPT Academy</h1>
      <p>Weekly Summary &mdash; ${dateLabel}</p>
    </div>
    <div class="content">
      <div class="stat-row">
        <div class="stat">
          <div class="num">${totalStudents ?? 0}</div>
          <div class="label">Total Students</div>
        </div>
        <div class="stat">
          <div class="num">${activeEnrollments ?? 0}</div>
          <div class="label">Active Enrollments</div>
        </div>
        <div class="stat">
          <div class="num">&pound;${totalPaymentsAmount.toFixed(0)}</div>
          <div class="label">Payments This Week</div>
        </div>
      </div>

      <h3>💳 Payments This Week</h3>
      <table>${paymentRows}</table>

      <h3>📅 Upcoming Sessions (Next 7 Days)</h3>
      <table>${sessionRows}</table>
    </div>
    <div class="footer">
      BPT Academy &middot; bptacademy.uk
    </div>
  </div>
</body>
</html>`;

    // Send to all admins
    let sent = 0;
    let errors = 0;

    for (const admin of admins) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(admin.id);
        const email = authUser?.user?.email;
        if (!email) continue;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: email,
            subject: `BPT Academy — Weekly Summary (${dateLabel})`,
            html,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          console.error(`Failed to send to admin ${admin.id}:`, await res.text());
          errors++;
        }
      } catch (err) {
        console.error(`Error sending to admin ${admin.id}:`, err);
        errors++;
      }
    }

    return new Response(
      `Weekly summary sent to ${sent} admin(s), ${errors} error(s)`,
      { status: 200 }
    );
  } catch (err) {
    console.error('weekly-summary fatal error:', err);
    return new Response('Error: ' + (err as Error).message, { status: 500 });
  }
});
