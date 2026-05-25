// radar-search Edge Function
// Returns nearby active Volpair users within a given radius.
// POST { lat, lon, radius_miles, active_within_hours }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Resolve first photo URL for a user.
// photos bucket is PUBLIC — use direct URL. avatars bucket is private — use signed URL.
async function resolvePhotoUrl(supabase: any, userId: string, photos: string[] | null): Promise<string | null> {
  // Try photos array first (uploaded via EditProfile / onboarding)
  if (photos && photos.length > 0) {
    const first = photos[0];
    // Already a full URL
    if (first.startsWith('http')) return first;
    // Stored path — photos bucket is public
    const clean = first.replace(/^\/photos\//, '').replace(/^photos\//, '');
    return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/photos/${clean}`;
  }
  // Fallback: check avatars bucket (private, needs signed URL)
  try {
    const { data: files } = await supabase.storage.from('avatars').list(`${userId}/`, { limit: 1 });
    if (files && files.length > 0) {
      const { data: signed } = await supabase.storage
        .from('avatars')
        .createSignedUrl(`${userId}/${files[0].name}`, 3600);
      return signed?.signedUrl ?? null;
    }
  } catch (_) {}
  return null;
}

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
    const { data: volpairUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!volpairUser) {
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

    // ── Try RPC first (uses earthdistance for efficient radius query) ──────────
    const { data: rpcPlayers, error: rpcError } = await supabase.rpc('radar_search_players', {
      lat: Number(lat),
      lon: Number(lon),
      radius_miles: Number(radius_miles),
      current_user_id: currentUserId,
      active_hours: activeHours,
    });

    if (!rpcError && rpcPlayers && rpcPlayers.length > 0) {
      // Fetch photos for RPC results — get photos array from users table
      const userIds = rpcPlayers.map((p: any) => p.id);
      const { data: photoRows } = await supabase
        .from('users')
        .select('id, photos')
        .in('id', userIds);
      const photoMap = new Map((photoRows ?? []).map((r: any) => [r.id, r.photos]));

      const enriched = await Promise.all(rpcPlayers.map(async (p: any) => {
        const photos = photoMap.get(p.id) ?? null;
        const photo_url = await resolvePhotoUrl(supabase, p.id, photos);
        return { ...p, photo_url };
      }));

      return new Response(JSON.stringify({ players: enriched }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Fallback: JS haversine filter ─────────────────────────────────────────
    console.log('RPC error or empty, using fallback:', rpcError?.message);

    const { data: rawPlayers, error: rawError } = await supabase
      .from('users')
      .select(`
        id, full_name, city, last_active_at, last_lat, last_lon, photos,
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
        const statsArr = Array.isArray(u.player_stats) ? u.player_stats : [u.player_stats].filter(Boolean);
        const stats = statsArr.find((s: any) => s.platform === 'playtomic')
          ?? statsArr.find((s: any) => s.platform === 'self_reported')
          ?? statsArr[0];
        return {
          id: u.id,
          full_name: u.full_name,
          city: u.city,
          last_active_at: u.last_active_at,
          last_lat: u.last_lat,
          last_lon: u.last_lon,
          photos: u.photos,
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

    // Fetch volpair scores for these users
    if (nearby.length > 0) {
      const nearbyIds = nearby.map(p => p.id);
      const { data: scores } = await supabase
        .from('volpair_scores')
        .select('user_a_id, user_b_id, total_score')
        .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
        .in(currentUserId < nearbyIds[0] ? 'user_b_id' : 'user_a_id', nearbyIds);

      const scoreMap = new Map<string, number>();
      for (const s of (scores ?? [])) {
        const otherId = s.user_a_id === currentUserId ? s.user_b_id : s.user_a_id;
        scoreMap.set(otherId, s.total_score);
      }
      nearby.forEach(p => { (p as any).volpair_score = scoreMap.get(p.id) ?? null; });
    }

    // Resolve photo URLs
    const result = await Promise.all(nearby.map(async (p) => {
      const photo_url = await resolvePhotoUrl(supabase, p.id, (p as any).photos);
      const { photos: _photos, ...rest } = p as any;
      return { ...rest, photo_url };
    }));

    return new Response(JSON.stringify({ players: result }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('radar-search error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
