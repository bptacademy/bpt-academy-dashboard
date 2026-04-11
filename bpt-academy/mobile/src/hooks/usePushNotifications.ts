import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Module-level: notification handler (must be set before any notifications arrive) ───

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Android notification channel ────────────────────────────────────────────

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#16A34A',
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePushNotifications(): void {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Only register on physical devices — Expo Go simulator doesn't support push
    if (!Device.isDevice) {
      console.log('[PushNotifications] Skipping — not a physical device');
      return;
    }

    if (!profile?.id) {
      console.log('[PushNotifications] Skipping — no profile yet');
      return;
    }

    async function registerForPushNotifications() {
      try {
        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('[PushNotifications] Permission not granted');
          return;
        }

        // Get Expo push token
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'a661965b-f384-43fa-8441-f9e5f78a0c3a',
        });

        // Upsert token into push_tokens table
        const { error } = await supabase
          .from('push_tokens')
          .upsert(
            {
              user_id: profile!.id,
              token: token.data,
              platform: Platform.OS,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,token' }
          );

        if (error) {
          console.error('[PushNotifications] Failed to save token:', error.message);
        } else {
          console.log('[PushNotifications] Token registered:', token.data);
        }
      } catch (err) {
        console.error('[PushNotifications] Error registering:', err);
      }
    }

    registerForPushNotifications();

    // Foreground notification listener — just let the handler show it
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // No custom handling needed — setNotificationHandler above takes care of display
    });

    // Response listener — when user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      const type = data?.type as string | undefined;

      try {
        if (type === 'reenrollment_request') {
          navigation.navigate('ReEnrollment', {
            enrollmentId: data.enrollmentId,
            programId: data.programId,
            studentId: data.studentId,
            ...data,
          });
        } else if (type === 'attendance_confirmation_request') {
          navigation.navigate('AttendanceConfirm', {
            sessionId: data.sessionId,
            programId: data.programId,
            studentId: data.studentId,
            ...data,
          });
        } else {
          navigation.navigate('Notifications');
        }
      } catch (err) {
        console.error('[PushNotifications] Navigation error:', err);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [profile?.id]);
}
