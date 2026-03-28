import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  try {
    const now = new Date();
    // Target sessions starting between 23h and 25h from now (~24h window)
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find sessions starting in ~24h
    const { data: sessions, error: sessionsError } = await supabase
      .from('program_sessions')
      .select('id, scheduled_at, program_id, programs(title)')
      .gte('scheduled_at', in23h.toISOString())
      .lte('scheduled_at', in25h.toISOString());

    if (sessionsError) throw sessionsError;

    if (!sessions || sessions.length === 0) {
      return new Response('No sessions to remind', { status: 200 });
    }

    let queued = 0;
    let skipped = 0;

    for (const session of sessions) {
      const programTitle = (session.programs as any)?.title ?? 'your program';
      const sessionTime = new Date(session.scheduled_at).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Get all active enrolled students for this program
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('program_id', session.program_id)
        .eq('status', 'active');

      if (enrollError) {
        console.error(`Enrollment fetch error for session ${session.id}:`, enrollError);
        continue;
      }

      for (const enrollment of enrollments ?? []) {
        // Idempotency check: skip if reminder already sent for this session+student
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('recipient_id', enrollment.student_id)
          .eq('type', 'session_reminder')
          .contains('data', { session_id: session.id })
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Queue the reminder notification (process-notifications will send push)
        const { error: insertError } = await supabase.from('notifications').insert({
          recipient_id: enrollment.student_id,
          title: 'Session tomorrow',
          body: `Your ${programTitle} session is tomorrow at ${sessionTime}`,
          type: 'session_reminder',
          data: {
            session_id: session.id,
            program_id: session.program_id,
          },
        });

        if (insertError) {
          console.error(
            `Failed to insert reminder for student ${enrollment.student_id}:`,
            insertError
          );
        } else {
          queued++;
        }
      }
    }

    const summary = `Session reminders: ${queued} queued, ${skipped} skipped (already sent)`;
    console.log(summary);
    return new Response(summary, { status: 200 });
  } catch (err) {
    console.error('session-reminders fatal error:', err);
    return new Response('Error: ' + (err as Error).message, { status: 500 });
  }
});
