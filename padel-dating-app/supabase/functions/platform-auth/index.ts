// platform-auth Edge Function
// Called during onboarding when user connects their booking platform.
// Authenticates with the platform, stores encrypted tokens in platform_connections.
// Platform credentials never leave this function.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function playtomicLogin(email: string, password: string) {
  const res = await fetch('https://api.playtomic.io/v3/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Playtomic login failed (${res.status}). Please check your Playtomic email and password.`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    platformUserId: data.user_id as string,
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { platform, email, password } = await req.json();

    if (!platform || !email || !password) {
      return new Response(JSON.stringify({ error: 'platform, email and password are required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the Volpair JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Get or create the Volpair user record
    // The mobile app should have created this already, but we upsert here as a safety net
    let { data: volpairUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!volpairUser) {
      // Create it now — this handles race conditions and edge cases
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .upsert({
          auth_id: authUser.id,
          email: authUser.email ?? email,
          profile_complete: false,
          last_active_at: new Date().toISOString(),
        }, { onConflict: 'auth_id' })
        .select('id')
        .maybeSingle();

      if (insertError || !newUser) {
        return new Response(JSON.stringify({ error: `Could not create user record: ${insertError?.message}` }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
      volpairUser = newUser;
    }

    // Authenticate with the platform
    if (platform !== 'playtomic') {
      return new Response(JSON.stringify({ error: `Platform ${platform} not yet supported` }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const tokens = await playtomicLogin(email, password);

    // Store the connection
    const { error: upsertError } = await supabase
      .from('platform_connections')
      .upsert({
        user_id: volpairUser.id,
        platform,
        platform_user_id: tokens.platformUserId,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt,
        last_synced_at: null,
      }, { onConflict: 'user_id,platform' });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({
      success: true,
      platform_user_id: tokens.platformUserId,
    }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('platform-auth error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
