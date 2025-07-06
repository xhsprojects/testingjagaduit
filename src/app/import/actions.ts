
'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { Expense, Income } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import type { ParsedTransaction } from '@/ai/flows/import-transactions-flow';

interface ActionResult {
    success: boolean;
    message: string;
}

// The client will add walletId, so the type here should reflect that
interface ClientTransaction extends ParsedTransaction {
    walletId: string;
}

export async function saveImportedTransactions(token: string, transactions: ClientTransaction[]): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const budgetDocRef = db.collection('users').doc(uid).collection('budgets').doc('current');

        await db.runTransaction(async (t) => {
            const doc = await t.get(budgetDocRef);
            if (!doc.exists) {
                throw new Error("Dokumen anggaran saat ini tidak ditemukan.");
            }
            const data = doc.data() || {};
            const currentExpenses: Expense[] = data.expenses || [];
            const currentIncomes: Income[] = data.incomes || [];

            transactions.forEach(tx => {
                if (tx.isIncome) {
                    const newIncome: Income = {
                        id: `imp-inc-${Date.now()}-${Math.random()}`,
                        amount: Math.abs(tx.amount), // Ensure positive
                        date: new Date(tx.date),
                        notes: `(Impor) ${tx.description}`,
                        walletId: tx.walletId, // Add walletId
                    };
                    currentIncomes.push(newIncome);
                } else {
                    if (!tx.suggestedCategoryId) {
                        // This should be caught by client-side validation, but as a safeguard.
                        throw new Error(`Transaksi pengeluaran "${tx.description}" tidak memiliki kategori.`);
                    }
                    const newExpense: Expense = {
                        id: `imp-exp-${Date.now()}-${Math.random()}`,
                        amount: Math.abs(tx.amount), // Expenses are stored as positive values
                        categoryId: tx.suggestedCategoryId,
                        date: new Date(tx.date),
                        notes: `(Impor) ${tx.description}`,
                        walletId: tx.walletId, // Add walletId
                    };
                    currentExpenses.push(newExpense);
                }
            });

            t.update(budgetDocRef, { 
                expenses: currentExpenses,
                incomes: currentIncomes 
            });
        });
        
        revalidatePath('/');
        revalidatePath('/history');
        revalidatePath('/import');

        return { success: true, message: `${transactions.length} transaksi berhasil diimpor.` };

    } catch (error: any) {
        console.error("Save Imported Transactions Error:", error);
        return { success: false, message: `Gagal menyimpan transaksi: ${error.message}` };
    }
}
