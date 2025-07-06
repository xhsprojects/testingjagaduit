'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import { revalidatePath } from 'next/cache';

interface ActionResult {
    success: boolean;
    message: string;
}

// A recursive function to delete all documents in a collection and its subcollections.
async function deleteCollection(collectionPath: string, batchSize: number) {
    const db = getDbAdmin();
    if (!db) return;

    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: (value: unknown) => void) {
    const db = getDbAdmin();
    if (!db) return;

    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve(0);
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}


export async function deleteUserAccount(token: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;

        // 1. Delete Firestore Data
        // This is complex because we have to delete subcollections recursively.
        // We will delete subcollections first, then the main user document.
        const subcollections = ['achievements', 'archivedBudgets', 'assets', 'budgets', 'debts', 'notifications', 'recurringTransactions', 'reminders', 'savingGoals', 'wallets'];
        
        for (const subcollection of subcollections) {
            await deleteCollection(`users/${uid}/${subcollection}`, 50);
        }

        // Delete the main user document
        await db.collection('users').doc(uid).delete();

        // 2. Delete Firebase Auth User
        await authAdmin.deleteUser(uid);
        
        revalidatePath('/');
        return { success: true, message: 'Akun Anda telah berhasil dihapus.' };

    } catch (error: any) {
        console.error("Delete Account Error:", error);
        return { success: false, message: `Gagal menghapus akun: ${error.message}` };
    }
}
