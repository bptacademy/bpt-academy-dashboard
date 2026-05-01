/**
 * notifications.ts — client helpers to trigger push notifications
 * Calls the send-notification edge function for key events.
 */

import { supabase } from './supabase';

const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

async function sendNotification(
  receiverUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`${FUNCTIONS_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId: receiverUserId, title, body, data }),
    });
  } catch (e) {
    // Non-fatal — notifications are best-effort
    console.log('Notification send failed (non-fatal):', e);
  }
}

/** Someone sent you a Volley */
export async function notifyVolley(receiverUserId: string, senderName: string) {
  await sendNotification(
    receiverUserId,
    '💘 New Volley!',
    `${senderName} sent you a Volley`,
    { type: 'volley', screen: 'Connect' }
  );
}

/** Mutual Volley match */
export async function notifyMatch(receiverUserId: string, senderName: string, connectionId: string) {
  await sendNotification(
    receiverUserId,
    "🎾 It's a match!",
    `You and ${senderName} both sent a Volley. The court is yours.`,
    { type: 'match', connectionId, screen: 'MutualVolleyMatch' }
  );
}

/** New message (Serve) */
export async function notifyNewServe(receiverUserId: string, senderName: string, connectionId: string) {
  await sendNotification(
    receiverUserId,
    `🎾 ${senderName}`,
    'Sent you a Serve',
    { type: 'serve', connectionId, screen: 'Conversation' }
  );
}
