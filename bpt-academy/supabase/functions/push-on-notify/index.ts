import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { recipient_id, title, body: notifBody, type, data } = body as {
    recipient_id: string;
    title: string;
    body: string;
    type: string;
    data: Record<string, unknown>;
  };

  if (!recipient_id) {
    return new Response(JSON.stringify({ error: 'Missing recipient_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create admin Supabase client to read push tokens
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: tokens, error: tokensError } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', recipient_id);

  if (tokensError) {
    console.error('[push-on-notify] Failed to fetch tokens:', tokensError.message);
    return new Response(JSON.stringify({ error: tokensError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ message: 'No push tokens for user', recipient_id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Build Expo push messages
  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    sound: 'default',
    title: title ?? 'BPT Academy',
    body: notifBody ?? '',
    data: { ...(data ?? {}), type },
    badge: 1,
  }));

  // Send to Expo Push API
  let expoResponse: Response;
  try {
    expoResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (fetchErr) {
    console.error('[push-on-notify] Expo API fetch error:', fetchErr);
    return new Response(JSON.stringify({ error: 'Failed to reach Expo push API' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const expoResult = await expoResponse.json();
  console.log('[push-on-notify] Expo result:', JSON.stringify(expoResult));

  return new Response(
    JSON.stringify({ success: true, sent: messages.length, result: expoResult }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
});
