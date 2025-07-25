
'use server';
/**
 * @fileOverview A Genkit flow to send a custom broadcast push notification to all users.
 *
 * - broadcastNotification - The main function to trigger the broadcast process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getDbAdmin, getMessagingAdmin } from '@/lib/firebase-server';
import { FieldValue, FieldPath, Timestamp } from 'firebase-admin/firestore';

const BroadcastInputSchema = z.object({
  title: z.string().min(1, 'Judul tidak boleh kosong.'),
  body: z.string().min(1, 'Isi pesan tidak boleh kosong.'),
  link: z.string().optional().describe('An optional URL to open when the notification is clicked. Defaults to the homepage.'),
  userIds: z.array(z.string()).optional().describe('An optional array of user IDs to send the notification to. If empty, sends to all users.'),
});
export type BroadcastInput = z.infer<typeof BroadcastInputSchema>;

const BroadcastOutputSchema = z.object({
  success: z.boolean(),
  notificationsSent: z.number(),
  errors: z.array(z.string()),
});
export type BroadcastOutput = z.infer<typeof BroadcastOutputSchema>;


export async function broadcastNotification(input: BroadcastInput): Promise<BroadcastOutput> {
  return broadcastNotificationFlow(input);
}

const broadcastNotificationFlow = ai.defineFlow(
  {
    name: 'broadcastNotificationFlow',
    inputSchema: BroadcastInputSchema,
    outputSchema: BroadcastOutputSchema,
  },
  async ({ title, body, link, userIds }) => {
    const db = getDbAdmin();
    const messaging = getMessagingAdmin();

    let notificationsSent = 0;
    const errors: string[] = [];
    const targetLink = link || '/';

    if (!db || !messaging) {
      const errorMsg = "Firebase Admin SDK is not initialized. Cannot send broadcast.";
      console.error(errorMsg);
      return { success: false, notificationsSent, errors: [errorMsg] };
    }

    try {
      let usersSnapshot;
      if (userIds && userIds.length > 0) {
        // Fetch only selected users
        usersSnapshot = await db.collection('users').where(FieldPath.documentId(), 'in', userIds).get();
      } else {
        // Fetch all users
        usersSnapshot = await db.collection('users').get();
      }
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens;
        
        // Prepare notification for in-app center
        const notificationData = {
            type: 'broadcast' as const,
            title: title,
            body: body,
            isRead: false,
            createdAt: Timestamp.now(),
            link: targetLink
        };
        await db.collection('users').doc(userId).collection('notifications').add(notificationData);

        if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
          continue; // Skip push notification if they don't have tokens
        }
        
        const tokensToRemove: string[] = [];
        for (const token of fcmTokens) {
            try {
                await messaging.send({
                    token,
                    webpush: {
                        notification: {
                            title: title,
                            body: body,
                            icon: '/icons/icon-192x192.png',
                            tag: `broadcast-${Date.now()}-${Math.random()}`,
                            data: {
                                link: targetLink,
                            }
                        },
                    }
                });
                notificationsSent++;
            } catch (error: any) {
                const errorCode = error.code;
                errors.push(`User ${userId} token error: ${errorCode}`);
                if (errorCode === 'messaging/invalid-registration-token' ||
                    errorCode === 'messaging/registration-token-not-registered') {
                  tokensToRemove.push(token);
                }
            }
        }

        if (tokensToRemove.length > 0) {
            await db.collection('users').doc(userId).update({
                fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
            });
        }
      }

      console.log(`Broadcast complete. Sent ${notificationsSent} notifications.`);
      return { success: true, notificationsSent, errors };

    } catch (error: any) {
      console.error("Error in broadcastNotificationFlow:", error);
      errors.push(error.message);
      return { success: false, notificationsSent, errors };
    }
  }
);
