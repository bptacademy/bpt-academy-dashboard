import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (_req: Request) => {
  try {
    const now = new Date();

    // Find sessions where:
    // - attendance_completed = false
    // - attendance_deadline exists and has NOT passed yet
    // - program is active with enrolled students
    // - session date was yesterday (window opened at 23:59 yesterday)
    const { data: sessions, error } = await supabase
      .from('program_sessions')
      .select('id, program_id, title, attendance_deadline, scheduled_at')
      .eq('attendance_completed', false)
      .not('attendance_deadline', 'is', null)
      .gt('attendance_deadline', now.toISOString());

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    let sent = 0;

    for (const session of sessions) {
      const deadline = new Date(session.attendance_deadline);
      const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Skip if more than 23h remaining (too early) or less than 1h remaining (too late — auto-complete will handle it)
      if (hoursRemaining > 23 || hoursRemaining < 1) continue;

      // Check there are active enrolled students
      const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('program_id', session.program_id)
        .eq('status', 'active');

      if (!count || count === 0) continue;

      // Get coaches for this program
      const { data: coaches } = await supabase
        .from('program_coaches')
        .select('coach_id')
        .eq('program_id', session.program_id);

      if (!coaches || coaches.length === 0) continue;

      const isLastChance = hoursRemaining <= 4;
      const hours = Math.ceil(hoursRemaining);

      for (const coach of coaches) {
        await supabase.from('notifications').insert({
          recipient_id: coach.coach_id,
          title: isLastChance
            ? `⚠️ Last chance — attendance closes in ${hours}h`
            : `📋 Reminder: take attendance for today's session`,
          body: isLastChance
            ? `"${session.title}" attendance closes in ${hours} hours. If not completed, all students will be auto-marked as present and a strike will be recorded.`
            : `Don't forget to take attendance for "${session.title}". You have until midnight tonight.`,
          type: 'attendance_reminder',
          data: {
            session_id: session.id,
            program_id: session.program_id,
            hours_remaining: hours,
            is_last_chance: isLastChance,
          },
          read: false,
        });
      }

      sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('attendance-reminders error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
