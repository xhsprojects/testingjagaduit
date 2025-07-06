
'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { Reminder } from '@/lib/types';
import { revalidatePath } from 'next/cache';

interface ActionResult {
    success: boolean;
    message: string;
}

const handleAuthError = (error: any): ActionResult => {
    console.error("Firebase Auth/DB Error:", error);
    if (error.code?.startsWith('auth/')) {
        return { success: false, message: 'Sesi Anda tidak valid atau telah berakhir. Silakan muat ulang halaman.' };
    }
    return { success: false, message: `Terjadi kesalahan server: ${error.message}` };
}

export async function saveReminder(token: string, reminder: Omit<Reminder, 'id' | 'isPaid' | 'dueDate'> & { id?: string, dueDate: Date, isPaid?: boolean }): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const reminderId = reminder.id || db.collection('users').doc(uid).collection('reminders').doc().id;
        const reminderRef = db.collection('users').doc(uid).collection('reminders').doc(reminderId);
        
        // The client now sends a UTC-normalized date, so we can save it directly.
        // This avoids all timezone-related issues on the server.
        const dataToSave = {
            name: reminder.name,
            amount: reminder.amount,
            notes: reminder.notes,
            id: reminderId,
            isPaid: reminder.isPaid || false,
            dueDate: reminder.dueDate,
        };

        await reminderRef.set(dataToSave, { merge: true });
        
        revalidatePath('/');
        revalidatePath('/reminders');
        return { success: true, message: 'Pengingat berhasil disimpan.' };
    } catch (error: any) {
        return handleAuthError(error);
    }
}

export async function deleteReminder(token: string, reminderId: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };

    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;

        const reminderRef = db.collection('users').doc(uid).collection('reminders').doc(reminderId);
        await reminderRef.delete();

        revalidatePath('/');
        revalidatePath('/reminders');
        return { success: true, message: 'Pengingat berhasil dihapus.' };
    } catch (error: any) {
        return handleAuthError(error);
    }
}

export async function toggleReminderPaidStatus(token: string, reminderId: string, isPaid: boolean): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;

        const reminderRef = db.collection('users').doc(uid).collection('reminders').doc(reminderId);
        await reminderRef.update({ isPaid });

        revalidatePath('/');
        revalidatePath('/reminders');
        return { success: true, message: 'Status pengingat diubah.' };
    } catch (error: any) {
        return handleAuthError(error);
    }
}
