
// src/app/admin/actions.ts
'use server'

import { getAuthAdmin, getDbAdmin, getMessagingAdmin } from '@/lib/firebase-server';
import { sendDailyReminders, type SendRemindersOutput } from '@/ai/flows/send-reminders-flow';
import { broadcastNotification, type BroadcastOutput } from '@/ai/flows/broadcast-notification-flow';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const ADMIN_UID = 'qyHqNRWBVaXEZjo1don6p0reXXH3';
type ActionType = 'add_month' | 'add_year' | 'set_lifetime' | 'stop_subscription';

interface ActionResult {
    success: boolean;
    message: string;
}

export async function getMaintenanceStatus(): Promise<boolean> {
    const db = getDbAdmin();
    if (!db) {
        console.error("Firebase Admin SDK not initialized. Cannot check maintenance status.");
        return false;
    }
    try {
        const configRef = db.collection('appState').doc('config');
        const docSnap = await configRef.get();
        if (docSnap.exists) {
            return docSnap.data()?.isMaintenanceMode === true;
        }
        return false;
    } catch (error) {
        console.error("Error fetching maintenance status in server action:", error);
        return false;
    }
}

export async function setMaintenanceMode(isMaintenance: boolean, token: string): Promise<ActionResult> {
    if (!token) {
        return { success: false, message: 'Tidak terotorisasi: Token tidak disediakan' };
    }

    try {
        const authAdmin = getAuthAdmin();
        const db = getDbAdmin();

        if (!authAdmin || !db) {
            return { success: false, message: 'Konfigurasi server Firebase tidak lengkap.' };
        }

        const decodedToken = await authAdmin.verifyIdToken(token);
        if (decodedToken.uid !== ADMIN_UID) {
            return { success: false, message: 'Tidak terotorisasi: Anda bukan admin.' };
        }

        const configRef = db.collection('appState').doc('config');
        await configRef.set({ isMaintenanceMode: isMaintenance }, { merge: true });

        const status = isMaintenance ? "diaktifkan" : "dinonaktifkan";
        return { success: true, message: `Mode perbaikan berhasil ${status}.` };

    } catch (error: any) {
        console.error('Error in setMaintenanceMode:', error);
        return { success: false, message: error.message || 'Gagal mengubah mode perbaikan.' };
    }
}

export async function triggerDailyReminders(token: string): Promise<SendRemindersOutput | { success: false; message: string }> {
    if (!token) {
        return { success: false, message: 'Tidak terotorisasi: Token tidak disediakan' };
    }
     try {
        const authAdmin = getAuthAdmin();
        if (!authAdmin) {
            return { success: false, message: 'Konfigurasi server Firebase tidak lengkap.' };
        }

        const decodedToken = await authAdmin.verifyIdToken(token);
        if (decodedToken.uid !== ADMIN_UID) {
            return { success: false, message: 'Tidak terotorisasi: Anda bukan admin.' };
        }
        
        // Call the flow
        const result = await sendDailyReminders();

        // If the flow fails, construct a helpful message from the errors array
        if (!result.success) {
            const errorMessage = result.errors.join('; ') || 'Terjadi kesalahan tidak diketahui di dalam flow.';
            return { success: false, message: errorMessage };
        }

        return result;

     } catch (error: any) {
        console.error('Error in triggerDailyReminders:', error);
        return { success: false, message: error.message || 'Gagal menjalankan flow pengingat.' };
    }
}

export async function sendTestNotification(token: string): Promise<ActionResult> {
    if (!token) {
        return { success: false, message: 'Tidak terotorisasi: Token tidak disediakan' };
    }

    try {
        const authAdmin = getAuthAdmin();
        const db = getDbAdmin();
        const messaging = getMessagingAdmin();

        if (!authAdmin || !db || !messaging) {
            return { success: false, message: 'Konfigurasi server Firebase tidak lengkap.' };
        }

        const decodedToken = await authAdmin.verifyIdToken(token);
        if (decodedToken.uid !== ADMIN_UID) {
            return { success: false, message: 'Tidak terotorisasi: Anda bukan admin.' };
        }

        const adminUserDoc = await db.collection('users').doc(ADMIN_UID).get();
        if (!adminUserDoc.exists) {
            return { success: false, message: 'Dokumen admin tidak ditemukan.' };
        }

        const adminData = adminUserDoc.data();
        const fcmTokens = adminData?.fcmTokens;

        if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
            return { success: false, message: 'Token notifikasi (FCM) untuk admin tidak ditemukan di database.' };
        }
        
        let successCount = 0;
        let failureCount = 0;
        const tokensToRemove: string[] = [];
        const errors: string[] = [];

        // Send notifications one by one to ensure unique tags and delivery.
        for (const fcmToken of fcmTokens) {
             try {
                await messaging.send({
                    token: fcmToken,
                    webpush: {
                        notification: {
                            title: '🔔 Tes Notifikasi Jaga Duit',
                            body: 'Jika Anda menerima ini, maka sistem notifikasi berfungsi dengan baik!',
                            icon: '/icons/icon-192x192.png',
                            tag: `jaga-duit-test-${Date.now()}-${Math.random()}`, // Unique tag per send
                            data: {
                                link: '/'
                            }
                        },
                    }
                });
                successCount++;
            } catch (error: any) {
                failureCount++;
                const errorCode = error.code;
                errors.push(`Token ${fcmToken.substring(0, 10)}...: ${errorCode}`);
                if (errorCode === 'messaging/invalid-registration-token' ||
                    errorCode === 'messaging/registration-token-not-registered') {
                    tokensToRemove.push(fcmToken);
                }
            }
        }
        
        if (tokensToRemove.length > 0) {
            await db.collection('users').doc(ADMIN_UID).update({
                fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
            });
        }
        
        const message = `Notifikasi uji coba dikirim. Berhasil: ${successCount}, Gagal: ${failureCount}.` + (errors.length > 0 ? ` Errors: ${errors.join(', ')}` : '');
        return { success: true, message: message };

    } catch (error: any) {
        console.error('Error in sendTestNotification:', error);
        return { success: false, message: error.message || 'Gagal mengirim notifikasi uji coba.' };
    }
}


export async function updateSubscription(userId: string, token: string, action: ActionType): Promise<ActionResult> {
    if (!token) {
        return { success: false, message: 'Tidak terotorisasi: Token tidak disediakan' };
    }
    
    try {
        const authAdmin = getAuthAdmin();
        const db = getDbAdmin();
        const messaging = getMessagingAdmin();

        if (!authAdmin || !db) {
            return { success: false, message: 'Konfigurasi server Firebase tidak lengkap. Periksa environment variables Anda.' };
        }

        const decodedToken = await authAdmin.verifyIdToken(token);
        const callerUid = decodedToken.uid;
        
        if (callerUid !== ADMIN_UID) {
            return { success: false, message: 'Tidak terotorisasi: Anda bukan admin.' };
        }

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
             return { success: false, message: 'Pengguna tidak ditemukan.' };
        }
        
        const now = new Date();
        const userData = userDoc.data();
        const currentExpiry = userData?.premiumExpiresAt?.toDate();
        const startDate = (currentExpiry && currentExpiry > now) ? currentExpiry : now;

        let newExpiryDate: Date | null;
        let successMessage: string;
        let notificationTitle = '💎 Langganan Diperbarui!';
        let notificationBody = '';

        switch (action) {
            case 'add_month':
                newExpiryDate = new Date(startDate);
                newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
                successMessage = `Langganan diperpanjang 1 bulan.`;
                notificationBody = `Selamat! Langganan premium Anda telah diperpanjang selama 1 bulan hingga ${newExpiryDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
                break;
            case 'add_year':
                 newExpiryDate = new Date(startDate);
                newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                successMessage = `Langganan diperpanjang 1 tahun.`;
                notificationBody = `Selamat! Langganan premium Anda telah diperpanjang selama 1 tahun hingga ${newExpiryDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
                break;
            case 'set_lifetime':
                newExpiryDate = new Date('9999-12-31T23:59:59Z');
                successMessage = `Langganan diatur ke seumur hidup.`;
                notificationBody = `Luar biasa! Langganan premium Anda kini berlaku seumur hidup. Terima kasih atas dukungan Anda!`;
                break;
            case 'stop_subscription':
                newExpiryDate = null;
                successMessage = `Langganan berhasil dihentikan.`;
                notificationTitle = 'Langganan Dihentikan';
                notificationBody = `Langganan premium Anda telah dihentikan. Anda masih bisa mengakses fitur premium hingga masa aktif berakhir.`;
                break;
            default:
                return { success: false, message: 'Aksi tidak valid.' };
        }

        await userRef.update({
            premiumExpiresAt: newExpiryDate
        });

        // Create notification for in-app center
        if (notificationBody) {
             const notificationData = {
                type: 'subscription' as const,
                title: notificationTitle,
                body: notificationBody,
                isRead: false,
                createdAt: Timestamp.now(),
                link: '/premium'
            };
            await db.collection('users').doc(userId).collection('notifications').add(notificationData);
        }

        if (messaging && notificationBody) {
            const targetUserData = (await userRef.get()).data();
            const fcmTokens = targetUserData?.fcmTokens;
            if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
                try {
                    await messaging.sendEachForMulticast({
                        tokens: fcmTokens,
                        webpush: {
                            notification: {
                                title: notificationTitle,
                                body: notificationBody,
                                icon: '/icons/icon-192x192.png',
                                tag: `subscription-update-${userId}`,
                                data: { link: '/premium' }
                            },
                        }
                    });
                    successMessage += ' Notifikasi terkirim.';
                } catch (error: any) {
                    console.error(`Gagal mengirim notifikasi langganan ke pengguna ${userId}:`, error.message);
                    successMessage += ' Gagal mengirim notifikasi.';
                }
            }
        }

        return { success: true, message: successMessage };

    } catch (error: any) {
        console.error('Error in updateSubscription:', error);
        
        if (error.code) {
            return { success: false, message: `Firebase Error (${error.code}): ${error.message}` };
        }

        return { success: false, message: error.message || 'Gagal memperbarui langganan. Terjadi kesalahan tak terduga.' };
    }
}

export async function sendBroadcastNotification(
    token: string, 
    title: string, 
    body: string,
    link?: string,
    userIds?: string[]
): Promise<BroadcastOutput | { success: false; message: string }> {
    if (!token) {
        return { success: false, message: 'Tidak terotorisasi: Token tidak disediakan' };
    }

    if (!title || !body) {
        return { success: false, message: 'Judul dan isi pesan tidak boleh kosong.' };
    }

     try {
        const authAdmin = getAuthAdmin();
        if (!authAdmin) {
            return { success: false, message: 'Konfigurasi server Firebase tidak lengkap.' };
        }

        const decodedToken = await authAdmin.verifyIdToken(token);
        if (decodedToken.uid !== ADMIN_UID) {
            return { success: false, message: 'Tidak terotorisasi: Anda bukan admin.' };
        }
        
        const result = await broadcastNotification({ title, body, link, userIds });

        if (!result.success) {
            const errorMessage = result.errors.join('; ') || 'Terjadi kesalahan tidak diketahui di dalam flow.';
            return { success: false, message: errorMessage };
        }

        return result;

     } catch (error: any) {
        console.error('Error in sendBroadcastNotification:', error);
        return { success: false, message: error.message || 'Gagal mengirim broadcast.' };
    }
}

    
