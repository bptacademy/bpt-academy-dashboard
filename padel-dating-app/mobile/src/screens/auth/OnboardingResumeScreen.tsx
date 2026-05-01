// Invisible screen — figures out where to resume onboarding and redirects
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function OnboardingResumeScreen({ navigation }: any) {
  const { session } = useAuth();

  useEffect(() => {
    resume();
  }, []);

  const resume = async () => {
    // Get the auth user ID from the live session
    const authId = session?.user?.id;
    if (!authId) {
      navigation.replace('PlatformSelect');
      return;
    }

    // Always fetch fresh from DB — don't rely on cached AuthContext user
    const { data: freshUser } = await supabase
      .from('users')
      .select('id, profile_complete, city, looking_for, visible_to, bio')
      .eq('auth_id', authId)
      .maybeSingle();

    if (!freshUser) {
      navigation.replace('PlatformSelect');
      return;
    }

    // Profile already complete — go straight to the app
    if (freshUser.profile_complete) {
      navigation.replace('MainTabs');
      return;
    }

    // Check if platform already connected
    const { data: conn } = await supabase
      .from('platform_connections')
      .select('id, last_synced_at')
      .eq('user_id', freshUser.id)
      .maybeSingle();

    if (!conn) {
      navigation.replace('PlatformSelect');
      return;
    }

    if (!conn.last_synced_at) {
      navigation.replace('SyncingProfile', {
        platform: 'playtomic',
        platformEmail: null,
        platformPassword: null,
        skipAuth: true,
      });
      return;
    }

    // Resume at the right onboarding step
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
  };

  return null;
}
