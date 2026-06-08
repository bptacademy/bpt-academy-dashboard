// Invisible screen — figures out where to resume onboarding and redirects
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
const _BG = require('../../../assets/volpair-bg-v2.png');

export default function OnboardingResumeScreen({ navigation }: any) {
  const { session } = useAuth();

  useEffect(() => {
    resume();
  }, []);

  const resume = async () => {
    const authId = session?.user?.id;
    if (!authId) {
      navigation.replace('Question0Name');
      return;
    }

    // Always fetch fresh from DB
    const { data: freshUser } = await supabase
      .from('users')
      .select('id, profile_complete, full_name, city, looking_for, visible_to, bio')
      .eq('auth_id', authId)
      .maybeSingle();

    // Brand new user — no users row yet. Go to Question0Name to start onboarding.
    if (!freshUser) {
      navigation.replace('Question0Name');
      return;
    }

    // Profile complete — Navigation will switch to MainTabs automatically
    if (freshUser.profile_complete) {
      return;
    }

    // No name yet — start at the beginning
    if (!freshUser.full_name) {
      navigation.replace('Question0Name');
      return;
    }

    // Check which platform is connected
    const { data: conn } = await supabase
      .from('platform_connections')
      .select('id, platform, last_synced_at')
      .eq('user_id', freshUser.id)
      .maybeSingle();

    // No platform connection yet — resume questions, or prompt platform select if questions are done
    if (!conn) {
      if (!freshUser.city) {
        navigation.replace('Question1Location');
      } else if (!freshUser.looking_for) {
        navigation.replace('Question2Intent', { city: freshUser.city });
      } else if (!freshUser.visible_to) {
        navigation.replace('Question3Visibility', { city: freshUser.city, looking_for: freshUser.looking_for });
      } else {
        // All questions done — nudge platform select with skip option
        navigation.replace('PlatformSelect', { skipOption: true });
      }
      return;
    }

    const isOTC = conn.platform === 'on_the_court';

    // OTC users: skip SyncingProfile (no match history to sync)
    // Go straight to onboarding questions if not yet filled in
    if (isOTC || conn.last_synced_at) {
      if (!freshUser.city) {
        navigation.replace('Question1Location');
      } else if (!freshUser.looking_for) {
        navigation.replace('Question2Intent', { city: freshUser.city });
      } else if (!freshUser.visible_to) {
        navigation.replace('Question3Visibility', { city: freshUser.city, looking_for: freshUser.looking_for });
      } else {
        navigation.replace('PhotoUpload', {
          city: freshUser.city,
          looking_for: freshUser.looking_for,
          visible_to: freshUser.visible_to,
          bio: freshUser.bio,
        });
      }
      return;
    }

    // Playtomic/other: re-run sync
    navigation.replace('SyncingProfile', {
      platform: conn.platform,
      skipAuth: true,
    });
  };

  return null;
}
