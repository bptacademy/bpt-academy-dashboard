// evaluate-promotions Edge Function
// Scheduled via Supabase cron (pg_cron) to run every hour.
// Calls evaluate_all_promotion_cycles() which checks every
// active cycle and flips to 'eligible' when thresholds are met.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Only allow POST (from pg_cron / Supabase scheduler)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('evaluate_all_promotion_cycles')

  if (error) {
    console.error('Promotion evaluation failed:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`Evaluated ${data} promotion cycles`)
  return new Response(
    JSON.stringify({ success: true, cycles_evaluated: data }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
