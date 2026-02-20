'use server';
/**
 * @fileOverview A Genkit flow to send a custom broadcast notification to all users' in-app notification centers.
 *
 * - broadcastNotification - The main function to trigger the broadcast process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getDbAdmin } from '@/lib/firebase-server';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';

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

    let notificationsSent = 0;
    const errors: string[] = [];
    const targetLink = link || '/';

    if (!db) {
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
      
      const batch = db.batch();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Prepare notification for in-app center
        const notificationData = {
            type: 'broadcast' as const,
            title: title,
            body: body,
            isRead: false,
            createdAt: Timestamp.now(),
            link: targetLink
        };
        
        const newNotifRef = db.collection('users').doc(userId).collection('notifications').doc();
        batch.set(newNotifRef, notificationData);
        notificationsSent++;
        
        // Commit batches in chunks if necessary (Firestore limit is 500 per batch)
        if (notificationsSent % 450 === 0) {
            await batch.commit();
        }
      }

      await batch.commit();

      console.log(`Broadcast complete. Recorded ${notificationsSent} internal notifications.`);
      return { success: true, notificationsSent, errors };

    } catch (error: any) {
      console.error("Error in broadcastNotificationFlow:", error);
      errors.push(error.message);
      return { success: false, notificationsSent, errors };
    }
  }
);
