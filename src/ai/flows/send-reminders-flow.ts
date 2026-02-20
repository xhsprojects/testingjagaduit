'use server';
/**
 * @fileOverview A Genkit flow to process and record in-app notifications for upcoming financial events.
 *
 * This flow iterates through all users, checks for unpaid reminders due the next day
 * and recurring transactions scheduled for today, then adds an in-app notification.
 * This flow is designed to be triggered by a daily cron job.
 *
 * - sendDailyReminders - The main function to trigger the check process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getDbAdmin } from '@/lib/firebase-server';
import type { Reminder, RecurringTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Timestamp } from 'firebase-admin/firestore';

// This flow doesn't require any input.
const SendRemindersOutputSchema = z.object({
  success: z.boolean(),
  usersChecked: z.number(),
  notificationsSent: z.number(),
  errors: z.array(z.string()),
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

    let usersChecked = 0;
    let notificationsSent = 0;
    const errors: string[] = [];

    if (!db) {
      const errorMsg = "Firebase Admin SDK is not initialized. Cannot process reminders.";
      console.error(errorMsg);
      return { success: false, usersChecked, notificationsSent, errors: [errorMsg] };
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

        const firestoreNotifications: any[] = [];
        
        if (dueReminders.length > 0) {
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

        // Add notifications to Firestore for in-app center
        const notifBatch = db.batch();
        const notificationsCollection = db.collection('users').doc(userId).collection('notifications');
        firestoreNotifications.forEach(notif => {
            const newNotifRef = notificationsCollection.doc();
            notifBatch.set(newNotifRef, notif);
            notificationsSent++;
        });
        await notifBatch.commit();
      }

      console.log(`Daily event check complete. Recorded ${notificationsSent} internal notifications.`);
      return { success: true, usersChecked, notificationsSent, errors };

    } catch (error: any) {
      console.error("Error in dailyReminderFlow:", error);
      errors.push(error.message);
      return { success: false, usersChecked, notificationsSent, errors };
    }
  }
);
