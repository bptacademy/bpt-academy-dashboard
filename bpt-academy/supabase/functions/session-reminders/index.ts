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

    // ── 2. Coach/Admin attendance reminders: sessions ended in last 2h with no attendance ──
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Find sessions that ended between 2h ago and now with no attendance recorded
    const { data: endedSessions } = await supabase
      .from('program_sessions')
      .select('id, scheduled_at, duration_minutes, program_id, programs(title, coach_id)')
      .lte('scheduled_at', now.toISOString())  // started before now
      .gte('scheduled_at', twoHoursAgo.toISOString());  // started no more than 2h ago

    for (const session of endedSessions ?? []) {
      const durationMs = (session.duration_minutes ?? 60) * 60 * 1000;
      const endTime = new Date(new Date(session.scheduled_at).getTime() + durationMs);

      // Only process sessions that have already ended
      if (endTime > now) continue;

      // Skip if attendance already recorded
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

      // Collect recipients: assigned coach + all admins/super_admins
      const recipientIds = new Set<string>();

      if (coachId) recipientIds.add(coachId);

      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'super_admin']);

      for (const a of admins ?? []) recipientIds.add(a.id);

      for (const recipientId of recipientIds) {
        // Idempotency: skip if reminder already sent for this session+recipient
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
            ? `Please mark attendance for ${programTitle} (${sessionLabel}). Your students are waiting for their record.`
            : `${programTitle} session (${sessionLabel}) ended without attendance being recorded. Please follow up with the coach.`,
          type: 'attendance_reminder',
          data: { session_id: session.id, program_id: session.program_id },
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
