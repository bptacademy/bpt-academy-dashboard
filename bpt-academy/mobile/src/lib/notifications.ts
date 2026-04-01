// Notifications are temporarily disabled pending expo-notifications native setup.
// To re-enable: install expo-notifications, add google-services.json, and restore this file.

export async function registerForPushNotifications(_userId: string): Promise<void> {
  console.log('[notifications] Push notifications not yet configured — skipping registration.');
}

export async function unregisterPushToken(_userId: string): Promise<void> {
  console.log('[notifications] Push notifications not yet configured — skipping unregister.');
}
