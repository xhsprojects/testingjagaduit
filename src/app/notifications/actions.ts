
'use server';
import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import { FieldValue } from 'firebase-admin/firestore';
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

export async function saveNotificationToken(token: string, fcmToken: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const userRef = db.collection('users').doc(decodedToken.uid);
        
        // This will add the token to the 'fcmTokens' array. If the array doesn't exist, it creates it.
        await userRef.set({ 
            fcmTokens: FieldValue.arrayUnion(fcmToken) 
        }, { merge: true });

        return { success: true, message: 'Token notifikasi disimpan.' };
    } catch (error: any) {
        console.error('Error saving notification token:', error);
        return { success: false, message: `Gagal menyimpan token: ${error.message}` };
    }
}


export async function markNotificationAsRead(token: string, notificationId: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const notifRef = db.collection('users').doc(uid).collection('notifications').doc(notificationId);
        await notifRef.update({ isRead: true });
        
        revalidatePath('/notifications');
        return { success: true, message: "Notifikasi ditandai sebagai dibaca." };
    } catch (error: any) {
        return handleAuthError(error);
    }
}

export async function markAllNotificationsAsRead(token: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const notificationsRef = db.collection('users').doc(uid).collection('notifications');
        const querySnapshot = await notificationsRef.where('isRead', '==', false).get();
        
        if (querySnapshot.empty) {
            return { success: true, message: "Tidak ada notifikasi baru untuk ditandai." };
        }

        const batch = db.batch();
        querySnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();

        revalidatePath('/notifications');
        return { success: true, message: "Semua notifikasi ditandai sebagai telah dibaca." };
    } catch (error: any) {
        return handleAuthError(error);
    }
}
