
'use server'

import { revalidatePath } from 'next/cache';
import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import { getLevelFromXp } from '@/lib/achievements';

interface ActionResult {
    success: boolean;
    message: string;
}

interface AwardXpResult extends ActionResult {
    leveledUp: boolean;
    newLevel: number;
}


export async function updateUserTheme(themeName: string, token: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };

    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();

    if (!authAdmin || !db) {
        console.error("Firebase Admin not initialized for theme update.");
        return { success: false, message: 'Konfigurasi server bermasalah. Fitur tidak tersedia.' };
    }
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const userRef = db.collection('users').doc(decodedToken.uid);
        
        await userRef.update({ theme: themeName, customThemeColor: null });

        revalidatePath('/'); // Revalidate root layout for theme change
        revalidatePath('/achievements');

        return { success: true, message: 'Tema berhasil diubah.' };
    } catch (error: any) {
        console.error('Error updating user theme:', error);
        return { success: false, message: 'Gagal memperbarui tema. Sesi Anda mungkin tidak valid.' };
    }
}

export async function updateUserCustomThemeColor(color: string, token: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };

    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();

    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }
    
    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const userRef = db.collection('users').doc(decodedToken.uid);
        
        await userRef.update({ customThemeColor: color, theme: 'custom' });

        revalidatePath('/');
        revalidatePath('/achievements');

        return { success: true, message: 'Warna tema kustom berhasil diubah.' };
    } catch (error: any) {
        console.error('Error updating user custom theme color:', error);
        return { success: false, message: 'Gagal memperbarui warna tema kustom.' };
    }
}

export async function awardUserXp(points: number, token: string): Promise<AwardXpResult> {
    const defaultReturn = { success: false, leveledUp: false, newLevel: 1, message: "Gagal memproses XP." };
    if (!token) return { ...defaultReturn, message: 'Sesi tidak valid.' };

    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    
    if (!authAdmin || !db) {
        console.error("Firebase Admin not initialized for awarding XP.");
        return { ...defaultReturn, message: 'Konfigurasi server bermasalah. Fitur tidak tersedia.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const userRef = db.collection('users').doc(decodedToken.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return { ...defaultReturn, message: "Pengguna tidak ditemukan." };
        }

        const userData = userDoc.data();
        const currentXp = userData?.xp || 0;
        const currentLevel = getLevelFromXp(currentXp);
        const newXp = currentXp + points;
        const newLevel = getLevelFromXp(newXp);
        const leveledUp = newLevel > currentLevel;
        
        const updateData: { xp: number; level?: number } = { xp: newXp };
        if (leveledUp) {
            updateData.level = newLevel;
        }
        
        await userRef.update(updateData);

        // Revalidate paths to update UI across the app
        revalidatePath('/');
        revalidatePath('/achievements');

        return { success: true, leveledUp, newLevel, message: `Anda mendapatkan ${points} XP!` };
    } catch (error: any) {
        console.error("Error awarding XP:", error);
        return { ...defaultReturn, message: `Terjadi kesalahan server: ${error.message}` };
    }
}
