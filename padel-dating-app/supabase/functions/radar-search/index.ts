// radar-search Edge Function
// Returns nearby active Volpair users within a given radius.
// POST { lat, lon, radius_miles, active_within_hours }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
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

    // Verify Volpair JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Get current user's Volpair id
    const { data: volpairUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (userError || !volpairUser) {
      return new Response(JSON.stringify({ error: 'User record not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const currentUserId = volpairUser.id;

    const { lat, lon, radius_miles, active_within_hours } = await req.json();

    if (!lat || !lon || !radius_miles || !active_within_hours) {
      return new Response(JSON.stringify({ error: 'lat, lon, radius_miles, active_within_hours are required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const radiusMeters = Number(radius_miles) * 1609.34;
    const activeHours = Number(active_within_hours);

    // Query nearby users using earthdistance
    const { data: players, error: queryError } = await supabase.rpc('radar_search_players', {
      p_lat: Number(lat),
      p_lon: Number(lon),
      p_radius_meters: radiusMeters,
      p_current_user_id: currentUserId,
      p_active_hours: activeHours,
    });

    if (queryError) {
      // Fallback: run raw query via postgrest if RPC not available
      console.error('RPC error, trying direct query:', queryError.message);

      const { data: rawPlayers, error: rawError } = await supabase
        .from('users')
        .select(`
          id, full_name, city, last_active_at, last_lat, last_lon,
          player_stats!left(level_value, total_matches, win_rate, play_style, platform)
        `)
        .eq('radar_visible', true)
        .eq('profile_complete', true)
        .neq('id', currentUserId)
        .not('last_lat', 'is', null)
        .not('last_lon', 'is', null)
        .gt('last_active_at', new Date(Date.now() - activeHours * 3600 * 1000).toISOString())
        .limit(100);

      if (rawError) throw rawError;

      // Filter by distance client-side (JS haversine) since earthdistance may not be accessible via PostgREST directly
      function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      const nearby = (rawPlayers || [])
        .filter(u => haversineMeters(Number(lat), Number(lon), u.last_lat, u.last_lon) <= radiusMeters)
        .map(u => {
          const distM = haversineMeters(Number(lat), Number(lon), u.last_lat, u.last_lon);
          const stats = Array.isArray(u.player_stats)
            ? u.player_stats.find((s: any) => s.platform === 'playtomic') || u.player_stats[0]
            : u.player_stats;
          return {
            id: u.id,
            full_name: u.full_name,
            city: u.city,
            last_active_at: u.last_active_at,
            last_lat: u.last_lat,
            last_lon: u.last_lon,
            level_value: stats?.level_value ?? null,
            total_matches: stats?.total_matches ?? null,
            win_rate: stats?.win_rate ?? null,
            play_style: stats?.play_style ?? null,
            distance_miles: distM / 1609.34,
            volpair_score: null,
          };
        })
        .sort((a, b) => a.distance_miles - b.distance_miles)
        .slice(0, 50);

      // Fetch photo URLs
      const result = await Promise.all(nearby.map(async (p) => {
        let photo_url: string | null = null;
        try {
          const { data: files } = await supabase.storage.from('avatars').list(`${p.id}/`, { limit: 1 });
          if (files && files.length > 0) {
            const { data: signed } = await supabase.storage
              .from('avatars')
              .createSignedUrl(`${p.id}/${files[0].name}`, 3600);
            photo_url = signed?.signedUrl ?? null;
          }
        } catch (_) {}
        return { ...p, photo_url };
      }));

      return new Response(JSON.stringify({ players: result }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // RPC succeeded — enrich with volpair_scores and photos
    const enriched = await Promise.all((players || []).map(async (p: any) => {
      let photo_url: string | null = null;
      try {
        const { data: files } = await supabase.storage.from('avatars').list(`${p.id}/`, { limit: 1 });
        if (files && files.length > 0) {
          const { data: signed } = await supabase.storage
            .from('avatars')
            .createSignedUrl(`${p.id}/${files[0].name}`, 3600);
          photo_url = signed?.signedUrl ?? null;
        }
      } catch (_) {}
      return { ...p, photo_url };
    }));

    return new Response(JSON.stringify({ players: enriched }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('radar-search error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
