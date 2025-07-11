
"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import type { PersonalNote } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { ArrowLeft, PlusCircle, Loader2, BookText, Trash2 } from 'lucide-react'
import { NoteForm } from '@/components/NoteForm'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { deleteNote } from './actions'

export default function NotesClientPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [notes, setNotes] = React.useState<PersonalNote[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingNote, setEditingNote] = React.useState<PersonalNote | null>(null);
    const [noteToDelete, setNoteToDelete] = React.useState<PersonalNote | null>(null);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    React.useEffect(() => {
        if (!user?.uid) {
            setIsLoading(false);
            return;
        }

        const notesQuery = query(collection(db, 'users', user.uid, 'notes'), orderBy('updatedAt', 'desc'));
        
        const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
            const notesData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    content: data.content,
                    updatedAt: data.updatedAt?.toDate() || new Date(), // Handle timestamp
                } as PersonalNote
            });
            setNotes(notesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching notes:", error);
            toast({ title: 'Gagal Memuat Catatan', variant: 'destructive' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid, toast]);

    const handleOpenForm = (note?: PersonalNote) => {
        setEditingNote(note || null);
        setIsFormOpen(true);
    };

    const handleDeleteRequest = (note: PersonalNote) => {
        setNoteToDelete(note);
    };

    const confirmDelete = async () => {
        if (!noteToDelete || !idToken) return;
        
        const result = await deleteNote(idToken, noteToDelete.id);
        if (result.success) {
            toast({ title: 'Sukses', description: result.message });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setNoteToDelete(null);
    }
    
    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="flex items-center gap-3 text-lg font-semibold text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Memuat Catatan...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Kembali</span>
                    </Button>
                    <div className="flex items-center gap-2">
                        <BookText className="h-5 w-5 text-primary" />
                        <h1 className="font-headline text-xl font-bold text-foreground">
                            Catatan Pribadi
                        </h1>
                    </div>
                </header>
                <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {notes.length === 0 && (
                             <div className="col-span-full text-center text-muted-foreground py-16">
                                <p className="text-lg font-semibold">Belum ada catatan.</p>
                                <p>Gunakan tombol (+) di pojok kiri bawah untuk membuat catatan pertama Anda.</p>
                            </div>
                        )}
                        {notes.map(note => (
                            <Card key={note.id} className="flex flex-col group">
                                <CardHeader onClick={() => handleOpenForm(note)} className="cursor-pointer">
                                    <CardTitle className="font-headline truncate">{note.title || 'Tanpa Judul'}</CardTitle>
                                </CardHeader>
                                <CardContent onClick={() => handleOpenForm(note)} className="flex-grow cursor-pointer overflow-hidden">
                                    <div className="prose prose-sm dark:prose-invert text-muted-foreground whitespace-pre-wrap max-w-none line-clamp-4">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {note.content}
                                        </ReactMarkdown>
                                    </div>
                                </CardContent>
                                <CardFooter className="text-xs text-muted-foreground flex justify-between items-center">
                                    <span>Diperbarui: {format(note.updatedAt, "d MMM, HH:mm", { locale: idLocale })}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeleteRequest(note)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                   </div>
                </main>
            </div>
            
            <Button
                onClick={() => handleOpenForm()}
                className="fixed bottom-20 left-6 h-14 w-14 rounded-full shadow-lg z-40 md:bottom-6"
                size="icon"
                aria-label="Tambah Catatan Baru"
            >
                <PlusCircle className="h-6 w-6" />
            </Button>
            
            <NoteForm 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                noteToEdit={editingNote}
            />

            <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Catatan Ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Anda akan menghapus catatan "{noteToDelete?.title || 'Tanpa Judul'}". Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                           Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
