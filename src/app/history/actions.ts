
'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { Expense, Income } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import type { Firestore } from 'firebase-admin/firestore';

interface ActionResult {
    success: boolean;
    message: string;
}

const getPeriodDocRef = (db: Firestore, uid: string, periodId: string) => {
    return periodId === 'current'
        ? db.collection('users').doc(uid).collection('budgets').doc('current')
        : db.collection('users').doc(uid).collection('archivedBudgets').doc(periodId);
};

export async function deleteTransaction(token: string, periodId: string, transactionId: string, transactionType: 'expense' | 'income'): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const docRef = getPeriodDocRef(db, uid, periodId);
        const arrayName = transactionType === 'expense' ? 'expenses' : 'incomes';

        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) {
                throw new Error("Dokumen periode tidak ditemukan.");
            }
            const data = doc.data() || {};
            const currentArray = (data[arrayName] || []) as (Expense[] | Income[]);
            const updatedArray = currentArray.filter(item => item.id !== transactionId);
            t.update(docRef, { [arrayName]: updatedArray });
        });
        
        revalidatePath(`/history/${periodId}`);
        revalidatePath('/wallets');
        revalidatePath('/');

        return { success: true, message: 'Transaksi berhasil dihapus.' };

    } catch (error: any) {
        console.error("Delete Transaction Error:", error);
        return { success: false, message: `Gagal menghapus transaksi: ${error.message}` };
    }
}

export async function updateTransaction(token: string, periodId: string, transactionData: Expense | Income, transactionType: 'expense' | 'income'): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };

    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const docRef = getPeriodDocRef(db, uid, periodId);
        const arrayName = transactionType === 'expense' ? 'expenses' : 'incomes';

        // Firestore cannot store JS Date objects directly from server actions, convert to Timestamp
        const dataToSave = {
            ...transactionData,
            date: new Date(transactionData.date) 
        };

        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            if (!doc.exists) {
                throw new Error("Dokumen periode tidak ditemukan.");
            }
            const data = doc.data() || {};
            const currentArray = (data[arrayName] || []) as (Expense[] | Income[]);
            const itemIndex = currentArray.findIndex(item => item.id === transactionData.id);

            if (itemIndex > -1) {
                // Update existing item
                currentArray[itemIndex] = dataToSave;
            } else {
                // Add new item
                currentArray.push(dataToSave as any);
            }
            
            t.update(docRef, { [arrayName]: currentArray });
        });
        
        revalidatePath(`/history/${periodId}`);
        revalidatePath('/wallets');
        revalidatePath('/');

        return { success: true, message: 'Transaksi berhasil disimpan.' };

    } catch (error: any) {
        console.error("Update Transaction Error:", error);
        return { success: false, message: `Gagal memperbarui transaksi: ${error.message}` };
    }
}
