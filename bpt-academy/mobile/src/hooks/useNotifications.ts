import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications } from '../lib/notifications';

export function useNotifications(userId: string | null) {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (!userId) return;

    // Register push token for this user
    registerForPushNotifications(userId);

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
      }
    );

    // Handle notification tap → navigate to relevant screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, any> | null;
        if (!data) return;

        const type: string = data.type ?? '';

        switch (type) {
          case 'new_message':
            navigation.navigate('Chat', { conversationId: data.conversation_id });
            break;
          case 'enrollment_confirmed':
            navigation.navigate('Programs');
            break;
          case 'payment_receipt':
            navigation.navigate('Payments');
            break;
          case 'coach_note':
            navigation.navigate('Progress');
            break;
          case 'session_reminder':
            navigation.navigate('Schedule');
            break;
          case 'admin_new_enrollment':
          case 'admin_new_registration':
          case 'admin_new_payment':
            navigation.navigate('Dashboard');
            break;
          default:
            console.log('Unhandled notification type:', type);
        }
      }
    );

    // Subscribe to new notifications in real-time via Supabase Realtime
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification via Realtime:', payload.new);
          // Optionally: trigger a local in-app notification or badge update here
        }
      )
      .subscribe();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
