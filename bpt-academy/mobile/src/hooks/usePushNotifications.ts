// Push notifications require a native build (EAS) — not supported in Expo Go.
// This hook is a no-op in development and activates automatically in production builds.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function usePushNotifications(): void {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // Skip entirely in Expo Go / dev client without native push support
    // expo-notifications requires a proper EAS build to function
    const isExpoGo = typeof (globalThis as any).expo?.modules?.ExpoModulesCore === 'undefined'
      && !(globalThis as any).__ExpoModulesConstants;

    if (__DEV__) {
      // In dev/Expo Go, silently skip — push notifications not available
      return;
    }

    if (!profile?.id) return;

    let cancelled = false;

    async function setup() {
      try {
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');

        if (!Device.default.isDevice) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#16A34A',
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'a661965b-f384-43fa-8441-f9e5f78a0c3a',
        });

        if (cancelled) return;

        await supabase.from('push_tokens').upsert(
          { user_id: profile.id, token: token.data, platform: Platform.OS, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,token' }
        );

        notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as Record<string, any>;
          const type = data?.type as string | undefined;
          try {
            if (type === 'reenrollment_request') {
              navigation.navigate('ReEnrollment', { ...data });
            } else if (type === 'attendance_confirmation_request') {
              navigation.navigate('AttendanceConfirm', { ...data });
            } else {
              navigation.navigate('Notifications');
            }
          } catch {}
        });
      } catch (err) {
        console.log('[Push] Not available in this environment');
      }
    }

    setup();

    return () => {
      cancelled = true;
      import('expo-notifications').then((N) => {
        if (notificationListener.current) N.removeNotificationSubscription(notificationListener.current);
        if (responseListener.current) N.removeNotificationSubscription(responseListener.current);
      }).catch(() => {});
    };
  }, [profile?.id]);
}
