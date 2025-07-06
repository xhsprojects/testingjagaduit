
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
        
        // Use arrayUnion with set and merge:true. 
        // This adds the token if it's not present and also creates the user document or fcmTokens field if they don't exist.
        await userRef.set({ 
            fcmTokens: FieldValue.arrayUnion(fcmToken) 
        }, { merge: true });

        return { success: true, message: 'Token notifikasi disimpan.' };
    } catch (error: any) {
        return handleAuthError(error);
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
        // Don't return an error message to the user for this background action
        console.error("Failed to mark notification as read:", error);
        return { success: false, message: 'Gagal menandai notifikasi.' };
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
        return { success: true, message: "Semua notifikasi telah dibaca." };
    } catch (error: any) {
        return handleAuthError(error);
    }
}


export async function deleteReadNotifications(token: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const notificationsRef = db.collection('users').doc(uid).collection('notifications');
        const querySnapshot = await notificationsRef.where('isRead', '==', true).get();
        
        if (querySnapshot.empty) {
            return { success: true, message: "Tidak ada notifikasi yang sudah dibaca untuk dihapus." };
        }

        const batch = db.batch();
        querySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        revalidatePath('/notifications');
        return { success: true, message: `${querySnapshot.size} notifikasi telah dihapus.` };
    } catch (error: any) {
        return handleAuthError(error);
    }
}
