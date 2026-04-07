import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  try {
    const now = new Date();
    let totalQueued = 0;
    let totalSkipped = 0;

    // ── 1. Student reminders: sessions starting in ~24h ─────────────────
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: upcomingSessions } = await supabase
      .from('program_sessions')
      .select('id, scheduled_at, program_id, programs(title, coach_id)')
      .gte('scheduled_at', in23h.toISOString())
      .lte('scheduled_at', in25h.toISOString());

    for (const session of upcomingSessions ?? []) {
      const programTitle = (session.programs as any)?.title ?? 'your program';
      const sessionTime = new Date(session.scheduled_at).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      });

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('program_id', session.program_id)
        .eq('status', 'active');

      for (const enrollment of enrollments ?? []) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('recipient_id', enrollment.student_id)
          .eq('type', 'session_reminder')
          .contains('data', { session_id: session.id })
          .maybeSingle();

        if (existing) { totalSkipped++; continue; }

        const { error } = await supabase.from('notifications').insert({
          recipient_id: enrollment.student_id,
          title: 'Session tomorrow 🎾',
          body: `Your ${programTitle} session is tomorrow at ${sessionTime}. See you on the court!`,
          type: 'session_reminder',
          data: { session_id: session.id, program_id: session.program_id },
        });

        if (!error) totalQueued++;
      }
    }

    // ── 2. Coach/Admin attendance reminders: sessions ended in last 2h ──
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const { data: endedSessions } = await supabase
      .from('program_sessions')
      .select('id, scheduled_at, duration_minutes, program_id, programs(title, coach_id)')
      .lte('scheduled_at', now.toISOString())
      .gte('scheduled_at', twoHoursAgo.toISOString());

    for (const session of endedSessions ?? []) {
      const durationMs = (session.duration_minutes ?? 60) * 60 * 1000;
      const endTime = new Date(new Date(session.scheduled_at).getTime() + durationMs);
      if (endTime > now) continue;

      const { count } = await supabase
        .from('session_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id);

      if ((count ?? 0) > 0) { totalSkipped++; continue; }

      const programTitle = (session.programs as any)?.title ?? 'a program';
      const coachId = (session.programs as any)?.coach_id;
      const sessionLabel = new Date(session.scheduled_at).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });

      const recipientIds = new Set<string>();
      if (coachId) recipientIds.add(coachId);

      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'super_admin']);

      for (const a of admins ?? []) recipientIds.add(a.id);

      for (const recipientId of recipientIds) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('recipient_id', recipientId)
          .eq('type', 'attendance_reminder')
          .contains('data', { session_id: session.id })
          .maybeSingle();

        if (existing) { totalSkipped++; continue; }

        const isCoach = recipientId === coachId;
        const { error } = await supabase.from('notifications').insert({
          recipient_id: recipientId,
          title: '📋 Attendance needed',
          body: isCoach
            ? `Please mark attendance for ${programTitle} (${sessionLabel}).`
            : `${programTitle} (${sessionLabel}) ended without attendance recorded.`,
          type: 'attendance_reminder',
          data: { session_id: session.id, program_id: session.program_id },
        });

        if (!error) totalQueued++;
      }
    }

    // ── 3. Wednesday 12pm: weekly attendance confirmation blast ──────────
    // Runs every day at 07:00 UTC — only fires the confirmation blast on Wednesdays
    const londonNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const isWednesday = londonNow.getDay() === 3;

    if (isWednesday) {
      // Get all active students enrolled in programs with sessions in the next 7 days
      const { data: targets } = await supabase.rpc('get_weekly_confirmation_targets');

      for (const target of targets ?? []) {
        // Idempotency: skip if already notified today for this session
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('recipient_id', target.student_id)
          .eq('type', 'attendance_confirmation_request')
          .contains('data', { session_id: target.session_id })
          .maybeSingle();

        if (existing) { totalSkipped++; continue; }

        const sessionDate = new Date(target.session_time);
        const sessionLabel = sessionDate.toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long',
          hour: '2-digit', minute: '2-digit',
        });

        const deadlineLabel = new Date(target.editable_until).toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        });

        // Pre-create a pending confirmation record
        await supabase
          .from('attendance_confirmations')
          .upsert({
            session_id: target.session_id,
            student_id: target.student_id,
            status: 'pending',
            editable_until: target.editable_until,
          }, { onConflict: 'session_id,student_id' });

        const { error } = await supabase.from('notifications').insert({
          recipient_id: target.student_id,
          title: '🎾 Will you attend this week?',
          body: `${target.program_title} — ${sessionLabel}. Please confirm your attendance. You can change your answer until ${deadlineLabel}.`,
          type: 'attendance_confirmation_request',
          data: {
            session_id: target.session_id,
            program_title: target.program_title,
            session_time: target.session_time,
            editable_until: target.editable_until,
          },
        });

        if (!error) totalQueued++;
      }
    }

    const summary = `Session reminders: ${totalQueued} queued, ${totalSkipped} skipped`;
    console.log(summary);
    return new Response(summary, { status: 200 });

  } catch (err) {
    console.error('session-reminders fatal error:', err);
    return new Response('Error: ' + (err as Error).message, { status: 500 });
  }
});
