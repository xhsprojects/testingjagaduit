
'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { Wallet, Expense, Income } from '@/lib/types';
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

export async function saveWallet(token: string, wallet: Wallet): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const walletRef = db.collection('users').doc(uid).collection('wallets').doc(wallet.id);
        
        await walletRef.set(wallet, { merge: true });
        
        revalidatePath('/wallets');
        revalidatePath('/');
        return { success: true, message: 'Dompet berhasil disimpan.' };
    } catch (error: any) {
        return handleAuthError(error);
    }
}

export async function deleteWallet(token: string, walletId: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };

    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;

        // Safety check: prevent deletion if transactions are associated with this wallet in the current period.
        const budgetDocRef = db.collection('users').doc(uid).collection('budgets').doc('current');
        const budgetDoc = await budgetDocRef.get();
        if (budgetDoc.exists) {
            const data = budgetDoc.data() || {};
            const expenses = data.expenses || [];
            const incomes = data.incomes || [];
            const isUsedInExpenses = expenses.some((e: any) => e.walletId === walletId);
            const isUsedInIncomes = incomes.some((i: any) => i.walletId === walletId);
            if (isUsedInExpenses || isUsedInIncomes) {
                return { success: false, message: 'Gagal! Dompet ini tidak dapat dihapus karena memiliki riwayat transaksi di periode saat ini.' };
            }
        }
        
        // Safety check for archived budgets
        const archivedBudgetsSnap = await db.collection('users').doc(uid).collection('archivedBudgets').get();
        for (const doc of archivedBudgetsSnap.docs) {
             const data = doc.data() || {};
             const expenses = data.expenses || [];
             const incomes = data.incomes || [];
             const isUsedInExpenses = expenses.some((e: any) => e.walletId === walletId);
             const isUsedInIncomes = incomes.some((i: any) => i.walletId === walletId);
             if (isUsedInExpenses || isUsedInIncomes) {
                 return { success: false, message: 'Gagal! Dompet ini memiliki riwayat transaksi di dalam arsip. Hapus arsip terkait atau ubah transaksi di sana terlebih dahulu jika ingin melanjutkan.' };
             }
        }

        // If no transactions are found, proceed with deletion.
        const walletRef = db.collection('users').doc(uid).collection('wallets').doc(walletId);
        await walletRef.delete();

        revalidatePath('/wallets');
        revalidatePath('/');
        return { success: true, message: 'Dompet berhasil dihapus.' };
    } catch (error: any) {
        return handleAuthError(error);
    }
}

interface TransferFundsData {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    notes?: string;
    date: Date;
}

export async function transferFunds(token: string, data: TransferFundsData): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) return { success: false, message: 'Konfigurasi server bermasalah.' };

    const { fromWalletId, toWalletId, amount, date, notes } = data;

    if (fromWalletId === toWalletId) {
        return { success: false, message: 'Tidak dapat mentransfer ke dompet yang sama.' };
    }
    if (amount <= 0) {
        return { success: false, message: 'Jumlah transfer harus positif.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        await db.runTransaction(async (t) => {
            // === 1. ALL READS FIRST ===
            const budgetDocRef = db.collection('users').doc(uid).collection('budgets').doc('current');
            const fromWalletDocRef = db.collection('users').doc(uid).collection('wallets').doc(fromWalletId);
            const toWalletDocRef = db.collection('users').doc(uid).collection('wallets').doc(toWalletId);

            const budgetDoc = await t.get(budgetDocRef);
            const fromWalletDoc = await t.get(fromWalletDocRef);
            const toWalletDoc = await t.get(toWalletDocRef);

            // === 2. VALIDATIONS (after all reads) ===
            if (!budgetDoc.exists) {
                throw new Error("Dokumen anggaran saat ini tidak ditemukan.");
            }
            if (!fromWalletDoc.exists || !toWalletDoc.exists) {
                throw new Error("Satu atau kedua dompet tidak ditemukan.");
            }
            
            // === 3. PREPARE DATA & LOGIC ===
            const budgetData = budgetDoc.data() || {};
            const categories = budgetData.categories || [];
            let transferCategory = categories.find((c: any) => c.name === 'Transfer Antar Dompet');
            let categoriesNeedUpdate = false;

            if (!transferCategory) {
                transferCategory = {
                    id: `cat-transfer-${Date.now()}`,
                    name: 'Transfer Antar Dompet',
                    icon: 'ArrowLeftRight',
                    budget: 0,
                    isEssential: true,
                };
                categories.push(transferCategory);
                categoriesNeedUpdate = true;
            }

            const fromWalletName = fromWalletDoc.data()?.name || 'Dompet Asal';
            const toWalletName = toWalletDoc.data()?.name || 'Dompet Tujuan';

            const expenseNotes = `Transfer ke ${toWalletName}. ${notes || ''}`.trim();
            const incomeNotes = `Transfer dari ${fromWalletName}. ${notes || ''}`.trim();

            const newExpense: Expense = {
                id: `exp-trf-${Date.now()}`,
                amount: amount,
                categoryId: transferCategory.id,
                date: new Date(date),
                notes: expenseNotes,
                walletId: fromWalletId,
            };

            const newIncome: Income = {
                id: `inc-trf-${Date.now()}`,
                amount: amount,
                date: new Date(date),
                notes: incomeNotes,
                walletId: toWalletId,
            };
            
            const currentExpenses = budgetData.expenses || [];
            const currentIncomes = budgetData.incomes || [];
            const updatedExpenses = [...currentExpenses, newExpense];
            const updatedIncomes = [...currentIncomes, newIncome];
            
            // === 4. ALL WRITES LAST ===
            const updatePayload: {[key: string]: any} = {
                expenses: updatedExpenses,
                incomes: updatedIncomes,
            };

            if (categoriesNeedUpdate) {
                updatePayload.categories = categories;
            }
            
            t.update(budgetDocRef, updatePayload);
        });

        revalidatePath('/wallets');
        revalidatePath('/');
        return { success: true, message: 'Transfer dana berhasil dicatat.' };
    } catch (error: any) {
        return handleAuthError(error);
    }
}
