
'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { Category } from '@/lib/types';
import { revalidatePath } from 'next/cache';

interface ActionResult {
    success: boolean;
    message: string;
}

export async function saveBudget(token: string, categories: Category[]): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const budgetDocRef = db.collection('users').doc(uid).collection('budgets').doc('current');
        
        // Calculate total income from category budgets
        const totalIncome = categories.reduce((sum, cat) => sum + cat.budget, 0);

        // Here, we update income as well as categories.
        // If the user sets up for the first time, this will create the document.
        // If they are updating, it will overwrite the old values.
        await budgetDocRef.set({
            income: totalIncome,
            categories: categories
        }, { merge: true }); // Use merge: true to avoid overwriting expenses/incomes array
        
        revalidatePath('/');
        revalidatePath('/budget');

        return { success: true, message: 'Anggaran berhasil diperbarui.' };

    } catch (error: any) {
        console.error("Firebase Save Budget Error:", error);
        if (error.code?.startsWith('auth/')) {
            return { success: false, message: 'Sesi Anda tidak valid atau telah berakhir.' };
        }
        return { success: false, message: `Terjadi kesalahan server: ${error.message}` };
    }
}
