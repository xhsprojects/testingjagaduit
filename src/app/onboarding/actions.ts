'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { Category, Wallet } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { serverTimestamp } from 'firebase-admin/firestore';

interface ActionResult {
    success: boolean;
    message: string;
}

export async function saveOnboardingData(token: string, wallets: Wallet[], categories: Category[]): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const batch = db.batch();

        // 1. Save user document (to mark them as an existing user)
        const userRef = db.collection('users').doc(uid);
        batch.set(userRef, {
            email: decodedToken.email,
            displayName: decodedToken.name,
            photoURL: decodedToken.picture,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            xp: 100, // Initial XP for completing onboarding
            level: 1,
            theme: 'default',
        }, { merge: true });
        
        // 2. Save wallets
        const walletsCollectionRef = userRef.collection('wallets');
        wallets.forEach(wallet => {
            const walletRef = walletsCollectionRef.doc(wallet.id);
            batch.set(walletRef, wallet);
        });

        // 3. Save categories
        const categoriesCollectionRef = userRef.collection('categories');
        categories.forEach(category => {
            const categoryRef = categoriesCollectionRef.doc(category.id);
            batch.set(categoryRef, category);
        });
        
        // 4. Create initial empty budget document
        const budgetDocRef = userRef.collection('budgets').doc('current');
        const initialBudgetData = {
            income: 0, // No base income set yet
            categories: categories.map(c => ({...c, budget: 0})),
            expenses: [],
            incomes: [],
            periodStart: new Date().toISOString(),
            periodEnd: null,
        };
        batch.set(budgetDocRef, initialBudgetData);
        
        await batch.commit();
        
        revalidatePath('/');
        return { success: true, message: 'Pengaturan awal berhasil disimpan.' };

    } catch (error: any) {
        console.error("Firebase Onboarding Error:", error);
        if (error.code?.startsWith('auth/')) {
            return { success: false, message: 'Sesi Anda tidak valid atau telah berakhir.' };
        }
        return { success: false, message: `Terjadi kesalahan server: ${error.message}` };
    }
}
