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
    const profileId = profile?.id;
    if (!profileId) return;

    let cancelled = false;

    async function setup() {
      try {
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');

        if (!Device.default.isDevice) return;

        // SDK 53+: NotificationBehavior uses shouldShowBanner / shouldShowList
        // (shouldShowAlert was removed). The old shape threw and aborted setup,
        // which is why no tokens were being registered.
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
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
        if (finalStatus !== 'granted') {
          console.log('[Push] permission not granted:', finalStatus);
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'a661965b-f384-43fa-8441-f9e5f78a0c3a',
        });

        if (cancelled) return;

        const { error } = await supabase.from('push_tokens').upsert(
          { user_id: profileId, token: token.data, platform: Platform.OS, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,token' }
        );
        if (error) console.log('[Push] token upsert failed:', error.message);
        else console.log('[Push] registered token:', token.data);

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
      } catch (err: any) {
        // Log the real reason so we can diagnose on a device (was swallowed).
        console.log('[Push] setup failed:', err?.message ?? err);
      }
    }

    setup();

    return () => {
      cancelled = true;
      // SDK 54: subscriptions are removed via their own .remove() method
      // (Notifications.removeNotificationSubscription was removed).
      try {
        notificationListener.current?.remove?.();
        responseListener.current?.remove?.();
      } catch {}
    };
  }, [profile?.id]);
}
