/**
 * useCourtPicks — Layer 3 of ConnectHome
 *
 * Finds nearby Volpair users who are NOT in Layer 1 or 2,
 * filtered by compatible intent + level range, sorted by Volpair score.
 * Uses expo-location + radar-search edge function.
 */

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourtPick {
  id: string;
  full_name: string;
  city: string | null;
  distance_miles: number;
  level_value: number | null;
  total_matches: number | null;
  win_rate: number | null;
  volpair_score: number | null;
  photo_url: string | null;
  last_active_at: string;
  looking_for?: string | null;
}

// ─── Params ───────────────────────────────────────────────────────────────────

interface UseCourtPicksParams {
  excludeIds: string[];
  myLevel: number | null;
  myLookingFor: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCourtPicks({ excludeIds, myLevel, myLookingFor }: UseCourtPicksParams) {
  const { user } = useAuth();
  const [picks, setPicks] = useState<CourtPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [enabled, setEnabledState] = useState(false);

  const fetchPicks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLocationDenied(false);

    try {
      // 1. Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        setLoading(false);
        return;
      }

      // 2. Get current position
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      // 3. Update user's location in Supabase
      await supabase
        .from('users')
        .update({ last_lat: lat, last_lon: lon, last_location_at: new Date().toISOString() })
        .eq('id', user.id);

      // 4. Call radar-search edge function
      const { data, error } = await supabase.functions.invoke('radar-search', {
        body: { lat, lon, radius_miles: 25, active_within_hours: 168 },
      });

      if (error || !data?.players) {
        setPicks([]);
        setLoading(false);
        return;
      }

      const rawPlayers: CourtPick[] = data.players;

      // 5. Filter results
      const excludeSet = new Set(excludeIds);

      const filtered = rawPlayers.filter(p => {
        // Must have a volpair_score
        if (p.volpair_score === null || p.volpair_score === undefined) return false;

        // Exclude Layer 1 + 2 IDs
        if (excludeSet.has(p.id)) return false;

        // Level compatibility: within ±1.5
        if (myLevel !== null && p.level_value !== null) {
          if (Math.abs(p.level_value - myLevel) > 1.5) return false;
        }

        // Intent compatibility
        if (myLookingFor === 'date' || myLookingFor === 'both') {
          const theirIntent = (p as any).looking_for ?? null;
          if (theirIntent !== 'date' && theirIntent !== 'both') return false;
        }
        // If myLookingFor is 'partner' or 'exploring' (or null), show everyone

        return true;
      });

      // 6. Sort by volpair_score DESC
      filtered.sort((a, b) => (b.volpair_score ?? 0) - (a.volpair_score ?? 0));

      // 7. Cap at 10
      setPicks(filtered.slice(0, 10));
    } catch (e) {
      console.error('useCourtPicks error:', e);
      setPicks([]);
    } finally {
      setLoading(false);
    }
  }, [user, excludeIds, myLevel, myLookingFor]);

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val);
    if (val) {
      fetchPicks();
    }
  }, [fetchPicks]);

  return { picks, loading, locationDenied, enabled, setEnabled };
}
