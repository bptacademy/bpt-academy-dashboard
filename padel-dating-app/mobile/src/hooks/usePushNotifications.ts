/**
 * usePushNotifications — registers device push token and handles incoming notifications
 *
 * Call this once inside MainTabs (after login).
 * - Requests permission
 * - Gets Expo push token
 * - Saves token to push_tokens table
 * - Sets up foreground notification handler
 *
 * NOTE: Push tokens only work on real devices (not Expo Go simulator).
 * The token registration still runs — it just won't receive pushes in Expo Go.
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Show notifications as banners even when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (_) {
  // Silently ignore in Expo Go where native module may be unavailable
}

export function usePushNotifications(
  onNotification?: (notification: Notifications.Notification) => void
) {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotifications(user.id);

    try {
      // Foreground notification received
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          onNotification?.(notification);
        }
      );

      // User tapped a notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data as any;
          console.log('Notification tapped:', data);
        }
      );
    } catch (_) {
      // Silently ignore in Expo Go
    }

    return () => {
      try {
        if (notificationListener.current && Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current && Notifications.removeNotificationSubscription) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      } catch (_) {
        // Silently ignore in Expo Go where native module is unavailable
      }
    };
  }, [user?.id]);
}

async function registerForPushNotifications(userId: string) {
  try {
    // Check/request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '402b07e4-ccc8-4ceb-8b83-5e94a3f6327f',
    });

    const token = tokenData.data;
    const platform = Platform.OS as 'ios' | 'android';

    // Save to DB (upsert — safe to call multiple times)
    const { data: volpairUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!volpairUser) return;

    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform },
      { onConflict: 'user_id,token' }
    );

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Volpair',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0ACCB5',
      });
    }

    console.log('Push token registered:', token);
  } catch (e) {
    // Silently fail in Expo Go / simulator
    console.log('Push registration skipped:', e);
  }
}
