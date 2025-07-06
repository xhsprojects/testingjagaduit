
'use server';
/**
 * @fileOverview A Genkit flow to send daily push notifications for upcoming financial events.
 *
 * This flow iterates through all users, checks for unpaid reminders due the next day
 * and recurring transactions scheduled for today, then sends a push notification.
 * This flow is designed to be triggered by a daily cron job.
 *
 * - sendDailyReminders - The main function to trigger the check process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getDbAdmin, getMessagingAdmin } from '@/lib/firebase-server';
import type { Reminder, RecurringTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// This flow doesn't require any input.
const SendRemindersOutputSchema = z.object({
  success: z.boolean(),
  usersChecked: z.number(),
  notificationsSent: z.number(),
  errors: z.array(z.string()),
  usersWithToken: z.number().describe('Number of users who have an FCM token.'),
  usersWithDueReminders: z.number().describe('Number of users with a token who also have reminders/transactions due.'),
});

export type SendRemindersOutput = z.infer<typeof SendRemindersOutputSchema>;

export async function sendDailyReminders(): Promise<SendRemindersOutput> {
  return dailyReminderFlow();
}

const dailyReminderFlow = ai.defineFlow(
  {
    name: 'dailyReminderFlow',
    inputSchema: z.void(),
    outputSchema: SendRemindersOutputSchema,
  },
  async () => {
    const db = getDbAdmin();
    const messaging = getMessagingAdmin();

    let usersChecked = 0;
    let notificationsSent = 0;
    let usersWithToken = 0;
    let usersWithDueReminders = 0;
    const errors: string[] = [];

    if (!db || !messaging) {
      const errorMsg = "Firebase Admin SDK is not initialized. Cannot send reminders.";
      console.error(errorMsg);
      return { success: false, usersChecked, notificationsSent, errors: [errorMsg], usersWithToken, usersWithDueReminders };
    }

    try {
      const usersSnapshot = await db.collection('users').get();
      usersChecked = usersSnapshot.size;

      const now = new Date();
      // Reminders due tomorrow (UTC)
      const startOfTomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const endOfTomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 23, 59, 59, 999));
      // Recurring transactions due today (UTC)
      const currentDayOfMonth = now.getUTCDate();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens;

        // Fetch Reminders due tomorrow
        const remindersSnapshot = await db.collection('users').doc(userId).collection('reminders')
          .where('isPaid', '==', false)
          .where('dueDate', '>=', Timestamp.fromDate(startOfTomorrow))
          .where('dueDate', '<=', Timestamp.fromDate(endOfTomorrow))
          .get();
          
        const dueReminders = remindersSnapshot.docs.map(doc => doc.data() as Reminder);

        // Fetch Recurring Transactions due today
        const recurringTxSnapshot = await db.collection('users').doc(userId).collection('recurringTransactions')
            .where('dayOfMonth', '==', currentDayOfMonth)
            .get();
        const dueRecurringTxs = recurringTxSnapshot.docs.map(doc => doc.data() as RecurringTransaction);
        
        if (dueReminders.length === 0 && dueRecurringTxs.length === 0) {
          continue; // No events due for this user
        }

        if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
            usersWithToken++;
        } else {
            continue; // No token, skip push notification logic for this user
        }
        
        usersWithDueReminders++;
        
        // Construct notification message & Firestore documents
        const eventMessages: string[] = [];
        const firestoreNotifications: any[] = [];
        
        if (dueReminders.length > 0) {
            const firstReminder = dueReminders[0];
            const totalAmount = dueReminders.reduce((sum, r) => sum + r.amount, 0);
            eventMessages.push(
                dueReminders.length === 1
                    ? `Tagihan "${firstReminder.name}" (${formatCurrency(totalAmount)}) jatuh tempo besok.`
                    : `${dueReminders.length} tagihan (${formatCurrency(totalAmount)}) jatuh tempo besok.`
            );
            dueReminders.forEach(reminder => {
                firestoreNotifications.push({
                    type: 'reminder',
                    title: `Tagihan Jatuh Tempo: ${reminder.name}`,
                    body: `Tagihan sebesar ${formatCurrency(reminder.amount)} akan jatuh tempo besok.`,
                    isRead: false,
                    createdAt: Timestamp.now(),
                    link: '/reminders',
                    relatedId: reminder.id,
                });
            });
        }
        if (dueRecurringTxs.length > 0) {
            const firstTx = dueRecurringTxs[0];
            eventMessages.push(
                 dueRecurringTxs.length === 1
                    ? `Transaksi otomatis "${firstTx.name}" dijadwalkan hari ini.`
                    : `${dueRecurringTxs.length} transaksi otomatis dijadwalkan hari ini.`
            );
            dueRecurringTxs.forEach(tx => {
                firestoreNotifications.push({
                    type: 'recurring_transaction',
                    title: `Transaksi Otomatis: ${tx.name}`,
                    body: `Transaksi ${tx.type === 'income' ? 'pemasukan' : 'pengeluaran'} sebesar ${formatCurrency(tx.amount)} dijadwalkan hari ini.`,
                    isRead: false,
                    createdAt: Timestamp.now(),
                    link: '/recurring',
                    relatedId: tx.id,
                });
            });
        }

        const notificationTitle = `🗓️ Agenda Keuangan Anda`;
        const notificationBody = eventMessages.join(' ');
        const targetLink = '/financial-calendar';

        // Add notifications to Firestore for in-app center
        const notifBatch = db.batch();
        const notificationsCollection = db.collection('users').doc(userId).collection('notifications');
        firestoreNotifications.forEach(notif => {
            const newNotifRef = notificationsCollection.doc();
            notifBatch.set(newNotifRef, notif);
        });
        await notifBatch.commit();

        const messages = fcmTokens.map(token => ({
            token,
            webpush: {
                notification: {
                    title: notificationTitle,
                    body: notificationBody,
                    icon: '/icons/icon-192x192.png',
                    tag: `financial-event-${userId}-${Date.now()}-${Math.random()}`, // Unique tag for each device
                    data: {
                        link: targetLink,
                    }
                },
            }
        }));
        
        // Send push notification if user has tokens
        try {
            const response = await messaging.sendEach(messages);
            notificationsSent += response.successCount;

            if (response.failureCount > 0) {
                const tokensToRemove: string[] = [];
                response.responses.forEach((resp, idx) => {
                  if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                      tokensToRemove.push(fcmTokens[idx]);
                    } else {
                      errors.push(`User ${userId} token error: ${errorCode}`);
                    }
                  }
                });

                if (tokensToRemove.length > 0) {
                  await db.collection('users').doc(userId).update({
                    fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
                  });
                }
            }
        } catch (error: any) {
            console.error(`Error sending multicast for user ${userId}:`, error);
            errors.push(`User ${userId}: ${error.code || error.message}`);
        }
      }

      console.log(`Daily event check complete. Sent ${notificationsSent} notifications.`);
      return { success: true, usersChecked, notificationsSent, errors, usersWithToken, usersWithDueReminders };

    } catch (error: any) {
      console.error("Error in dailyReminderFlow:", error);
      errors.push(error.message);
      return { success: false, usersChecked, notificationsSent, errors, usersWithToken, usersWithDueReminders };
    }
  }
);

    