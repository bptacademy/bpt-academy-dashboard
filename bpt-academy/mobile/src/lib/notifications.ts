import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const EAS_PROJECT_ID = 'a661965b-f384-43fa-8441-f9e5f78a0c3a';

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return;
  }

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

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });

    const token = tokenData.data;
    const platform = Platform.OS as 'ios' | 'android';

    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      console.error('Failed to register push token:', error);
    } else {
      console.log('Push token registered:', token);
    }
  } catch (err) {
    console.error('Error getting push token:', err);
  }
}

export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });

    if (!tokenData?.data) return;

    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', tokenData.data);

    if (error) {
      console.error('Failed to unregister push token:', error);
    } else {
      console.log('Push token unregistered');
    }
  } catch (err) {
    console.error('Error unregistering push token:', err);
  }
}
