import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (_req: Request) => {
  try {
    const now = new Date();

    // Find all sessions where:
    // - attendance_deadline has passed
    // - attendance_completed = false
    // - auto_completed = false
    // - program is active
    // - at least 1 active enrolled student
    const { data: sessions, error: sessErr } = await supabase
      .from('program_sessions')
      .select('id, program_id, title, attendance_deadline, module_id')
      .eq('attendance_completed', false)
      .eq('auto_completed', false)
      .not('attendance_deadline', 'is', null)
      .lte('attendance_deadline', now.toISOString());

    if (sessErr) throw sessErr;
    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    let processed = 0;

    for (const session of sessions) {
      // Get active enrolled students for this program
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('program_id', session.program_id)
        .eq('status', 'active');

      if (!enrollments || enrollments.length === 0) {
        // No active students — just mark as completed
        await supabase
          .from('program_sessions')
          .update({ attendance_completed: true, auto_completed: true })
          .eq('id', session.id);
        continue;
      }

      // Mark each student as attended
      for (const enrollment of enrollments) {
        await supabase
          .from('session_attendance')
          .upsert({
            session_id: session.id,
            student_id: enrollment.student_id,
            attended: true,
            marked_at: now.toISOString(),
            marked_by: null, // system
          }, { onConflict: 'session_id,student_id' });
      }

      // Mark session as auto-completed
      await supabase
        .from('program_sessions')
        .update({ attendance_completed: true, auto_completed: true })
        .eq('id', session.id);

      // Get coaches for this program to issue penalties
      const { data: coaches } = await supabase
        .from('program_coaches')
        .select('coach_id')
        .eq('program_id', session.program_id);

      const month = now.toISOString().slice(0, 7); // e.g. "2026-04"

      for (const coach of (coaches ?? [])) {
        // Upsert penalty — increment strike_count if record exists for this month
        const { data: existing } = await supabase
          .from('coach_penalties')
          .select('id, strike_count')
          .eq('coach_id', coach.coach_id)
          .eq('program_id', session.program_id)
          .eq('month', month)
          .maybeSingle();

        let newStrikeCount = 1;
        if (existing) {
          newStrikeCount = existing.strike_count + 1;
          await supabase
            .from('coach_penalties')
            .update({ strike_count: newStrikeCount })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('coach_penalties')
            .insert({
              coach_id: coach.coach_id,
              program_id: session.program_id,
              session_id: session.id,
              month,
              strike_count: 1,
              reason: `Auto-completed attendance for session: ${session.title}`,
            });
        }

        // Notify coach (in-app + push + email via trigger)
        await supabase.from('notifications').insert({
          recipient_id: coach.coach_id,
          title: '⚠️ Attendance auto-completed',
          body: `Attendance for "${session.title}" was auto-completed because it wasn't taken in time. Strike ${newStrikeCount} recorded for this month.`,
          type: 'attendance_auto_completed',
          read: false,
        });

        // Notify all admins if strike count >= 2
        if (newStrikeCount >= 2) {
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'super_admin']);

          const { data: coachProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', coach.coach_id)
            .single();

          const { data: programData } = await supabase
            .from('programs')
            .select('title')
            .eq('id', session.program_id)
            .single();

          for (const admin of (admins ?? [])) {
            await supabase.from('notifications').insert({
              recipient_id: admin.id,
              title: `🚨 Coach penalty — ${newStrikeCount} strikes`,
              body: `${coachProfile?.full_name ?? 'A coach'} has ${newStrikeCount} attendance strikes this month in "${programData?.title ?? 'a program'}". Review action required.`,
              type: 'coach_penalty_alert',
              data: {
                coach_id: coach.coach_id,
                program_id: session.program_id,
                strike_count: newStrikeCount,
                month,
              },
              read: false,
            });
          }
        }
      }

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('auto-complete-attendance error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
