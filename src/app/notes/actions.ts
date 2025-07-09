
'use server'

import { getAuthAdmin, getDbAdmin } from '@/lib/firebase-server';
import type { PersonalNote } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

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

export async function saveNote(token: string, note: Omit<PersonalNote, 'updatedAt'>): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };
    if (!note.title && !note.content) {
        return { success: false, message: 'Judul atau isi catatan tidak boleh kosong.' };
    }
    
    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        const noteRef = db.collection('users').doc(uid).collection('notes').doc(note.id);
        
        await noteRef.set({
            ...note,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        
        revalidatePath('/notes');
        return { success: true, message: 'Catatan berhasil disimpan.' };
    } catch (error: any) {
        return handleAuthError(error);
    }
}


export async function deleteNote(token: string, noteId: string): Promise<ActionResult> {
    if (!token) return { success: false, message: 'Sesi tidak valid.' };

    const authAdmin = getAuthAdmin();
    const db = getDbAdmin();
    if (!authAdmin || !db) {
        return { success: false, message: 'Konfigurasi server bermasalah.' };
    }

    try {
        const decodedToken = await authAdmin.verifyIdToken(token);
        const uid = decodedToken.uid;

        const noteRef = db.collection('users').doc(uid).collection('notes').doc(noteId);
        await noteRef.delete();

        revalidatePath('/notes');
        return { success: true, message: 'Catatan berhasil dihapus.' };
    } catch (error: any) {
        return handleAuthError(error);
    }
}
