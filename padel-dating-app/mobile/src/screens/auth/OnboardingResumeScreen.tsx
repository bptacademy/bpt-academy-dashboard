// Invisible screen — figures out where to resume onboarding and redirects
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function OnboardingResumeScreen({ navigation }: any) {
  const { user } = useAuth();

  useEffect(() => {
    resume();
  }, []);

  const resume = async () => {
    if (!user?.id) {
      navigation.replace('PlatformSelect');
      return;
    }

    // Check if platform already connected
    const { data: conn } = await supabase
      .from('platform_connections')
      .select('id, last_synced_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!conn) {
      // No platform connected yet — start from PlatformSelect
      navigation.replace('PlatformSelect');
      return;
    }

    if (!conn.last_synced_at) {
      // Connected but never synced — run the sync then go to preview
      navigation.replace('SyncingProfile', {
        platform: 'playtomic',
        platformEmail: null,
        platformPassword: null,
        skipAuth: true, // tell SyncingProfile to skip platform-auth and go straight to sync
      });
      return;
    }

    // Platform connected + synced — skip to questions
    // Figure out which question to resume at
    if (!user.city) {
      navigation.replace('Question1Location');
    } else if (!user.looking_for) {
      navigation.replace('Question2Intent', { city: user.city });
    } else if (!user.visible_to) {
      navigation.replace('Question3Visibility', { city: user.city, looking_for: user.looking_for });
    } else {
      navigation.replace('PhotoUpload', {
        city: user.city,
        looking_for: user.looking_for,
        visible_to: user.visible_to,
        bio: user.bio,
      });
    }
  };

  return null;
}
