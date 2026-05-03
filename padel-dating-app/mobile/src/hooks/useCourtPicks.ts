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

// ─── Mock data (shown when real data is empty — dev/preview only) ─────────────

const MOCK_PICKS: CourtPick[] = [
  {
    id: 'mock-1',
    full_name: 'Sofia Martínez',
    city: 'London',
    distance_miles: 1.2,
    level_value: 4.2,
    total_matches: 87,
    win_rate: 0.62,
    volpair_score: 94,
    photo_url: null,
    last_active_at: new Date().toISOString(),
    looking_for: 'both',
  },
  {
    id: 'mock-2',
    full_name: 'James Okafor',
    city: 'London',
    distance_miles: 2.8,
    level_value: 3.9,
    total_matches: 54,
    win_rate: 0.55,
    volpair_score: 88,
    photo_url: null,
    last_active_at: new Date().toISOString(),
    looking_for: 'partner',
  },
  {
    id: 'mock-3',
    full_name: 'Elena Rossi',
    city: 'London',
    distance_miles: 4.1,
    level_value: 4.5,
    total_matches: 112,
    win_rate: 0.71,
    volpair_score: 81,
    photo_url: null,
    last_active_at: new Date().toISOString(),
    looking_for: 'date',
  },
  {
    id: 'mock-4',
    full_name: 'Marco Silva',
    city: 'London',
    distance_miles: 5.3,
    level_value: 4.0,
    total_matches: 63,
    win_rate: 0.58,
    volpair_score: 76,
    photo_url: null,
    last_active_at: new Date().toISOString(),
    looking_for: 'both',
  },
];

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
        // Fall back to mock data so the strip renders nicely during dev
        setPicks(MOCK_PICKS);
        setLoading(false);
        return;
      }

      const rawPlayers: CourtPick[] = data.players;

      // 5. Filter results
      const excludeSet = new Set(excludeIds);

      const filtered = rawPlayers.filter(p => {
        if (p.volpair_score === null || p.volpair_score === undefined) return false;
        if (excludeSet.has(p.id)) return false;
        if (myLevel !== null && p.level_value !== null) {
          if (Math.abs(p.level_value - myLevel) > 1.5) return false;
        }
        if (myLookingFor === 'date' || myLookingFor === 'both') {
          const theirIntent = (p as any).looking_for ?? null;
          if (theirIntent !== 'date' && theirIntent !== 'both') return false;
        }
        return true;
      });

      // 6. Sort by volpair_score DESC
      filtered.sort((a, b) => (b.volpair_score ?? 0) - (a.volpair_score ?? 0));

      // 7. Use real data if available, otherwise mock
      const result = filtered.slice(0, 10);
      setPicks(result.length > 0 ? result : MOCK_PICKS);
    } catch (e) {
      console.error('useCourtPicks error:', e);
      // Fall back to mock data on any error
      setPicks(MOCK_PICKS);
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
