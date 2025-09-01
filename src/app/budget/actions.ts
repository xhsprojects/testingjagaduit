
'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { Category, BudgetPeriod, Expense, Income, Wallet } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { collection, doc, writeBatch, getDoc, getDocs } from 'firebase/firestore';
import { awardAchievement } from '@/lib/achievements-manager'; // Assuming this can be used server-side

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

export async function resetBudgetPeriod(token: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;

        const budgetDocRef = db.collection('users').doc(uid).collection('budgets').doc('current');
        const budgetDocSnap = await budgetDocRef.get();

        if (!budgetDocSnap.exists) {
            return { success: false, message: "Dokumen anggaran saat ini tidak ditemukan." };
        }

        const currentData = budgetDocSnap.data() as BudgetPeriod;
        
        // This is the correct logic: We archive the current period's transactions
        // and then reset them for the new period. We DO NOT touch the wallet initial balances.
        // The wallet balance is a derived state from ALL transactions, not just the current period.
        
        const batch = db.batch();
        
        const totalExpensesValue = (currentData.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        const totalAddedIncomes = (currentData.incomes || []).reduce((sum, inc) => sum + inc.amount, 0);
        const totalIncomeValue = currentData.income + totalAddedIncomes;
        const remainingBudgetValue = totalIncomeValue - totalExpensesValue;

        const archivedPeriod = {
            ...currentData,
            periodEnd: new Date().toISOString(),
            totalIncome: totalIncomeValue,
            totalExpenses: totalExpensesValue,
            remainingBudget: remainingBudgetValue,
        };

        const archiveDocRef = db.collection('users').doc(uid).collection('archivedBudgets').doc();
        batch.set(archiveDocRef, archivedPeriod);
        
        // Create the new budget data by copying existing categories and income,
        // but resetting expenses and incomes for the new period.
        const newBudgetData = {
            ...currentData,
            expenses: [],
            incomes: [],
            periodStart: new Date().toISOString(),
            periodEnd: null,
        };

        batch.set(budgetDocRef, newBudgetData);
        
        await batch.commit();

        revalidatePath('/');
        revalidatePath('/history');
        revalidatePath('/wallets');
        revalidatePath('/budget');

        return { success: true, message: 'Periode anggaran berhasil diarsipkan dan periode baru telah dimulai.' };

    } catch (error: any) {
        console.error("Reset Budget Error:", error);
        return { success: false, message: `Gagal mengarsipkan: ${error.message}` };
    }
}
