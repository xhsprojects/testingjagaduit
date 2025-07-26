'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { Category } from '@/lib/types';
import { revalidatePath } from 'next/cache';

interface ActionResult {
    success: boolean;
    message: string;
}

export async function saveCategories(token: string, categories: Category[]): Promise<ActionResult> {
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

        // Get existing categories to delete the ones that are not in the new list
        const categoriesCollectionRef = db.collection('users').doc(uid).collection('categories');
        const existingCategoriesSnapshot = await categoriesCollectionRef.get();
        const existingCategoryIds = new Set(existingCategoriesSnapshot.docs.map(doc => doc.id));
        const newCategoryIds = new Set(categories.map(cat => cat.id));

        // Delete categories that are no longer in the list
        existingCategoriesSnapshot.docs.forEach(doc => {
            if (!newCategoryIds.has(doc.id)) {
                batch.delete(doc.ref);
            }
        });
        
        // Add or update categories
        categories.forEach(category => {
            const categoryRef = categoriesCollectionRef.doc(category.id);
            // Ensure essential fields are preserved correctly if they exist
            const dataToSet = {
                id: category.id,
                name: category.name,
                icon: category.icon,
                isEssential: category.isEssential || false,
                isDebtCategory: category.isDebtCategory || false,
            };
            batch.set(categoryRef, dataToSet, { merge: true });
        });
        
        // Also update the categories array in the current budget document
        const budgetDocRef = db.collection('users').doc(uid).collection('budgets').doc('current');
        const budgetDocSnap = await budgetDocRef.get();
        if (budgetDocSnap.exists) {
            const budgetData = budgetDocSnap.data() || {};
            const existingBudgetCategories = (budgetData.categories || []) as Category[];
            const updatedBudgetCategories = categories.map(newCat => {
                const existingCat = existingBudgetCategories.find(c => c.id === newCat.id);
                return {
                    ...newCat,
                    budget: existingCat ? existingCat.budget : 0, // Preserve existing budget
                };
            });
             batch.update(budgetDocRef, { categories: updatedBudgetCategories });
        }


        await batch.commit();
        
        revalidatePath('/categories');
        revalidatePath('/budget');
        revalidatePath('/');

        return { success: true, message: 'Kategori berhasil diperbarui.' };

    } catch (error: any) {
        console.error("Firebase Save Categories Error:", error);
        if (error.code?.startsWith('auth/')) {
            return { success: false, message: 'Sesi Anda tidak valid atau telah berakhir.' };
        }
        return { success: false, message: `Terjadi kesalahan server: ${error.message}` };
    }
}
