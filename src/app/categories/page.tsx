
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Category } from '@/lib/types';
import { collection, doc, writeBatch, onSnapshot, deleteDoc, getDoc } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AddCategoryForm } from './AddCategoryForm';

export default function CategoriesPage() {
    const { user, idToken, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [categories, setCategories] = React.useState<Category[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
    const [categoryToDelete, setCategoryToDelete] = React.useState<Category | null>(null);

    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            const categoriesQuery = collection(db, 'users', user.uid, 'categories');
            const unsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
                const cats = snapshot.docs.map(d => ({id: d.id, ...d.data()}) as Category);
                setCategories(cats);
                setIsLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user, loading, router]);

    const handleSaveCategory = async (categoryData: Omit<Category, 'id'> & { id?: string }) => {
        if (!user) return;
        const id = categoryData.id || `cat-user-${Date.now()}`;
        const isEditing = !!categoryData.id;
        
        try {
            const batch = writeBatch(db);
            const categoryRef = doc(db, 'users', user.uid, 'categories', id);
            batch.set(categoryRef, { name: categoryData.name, icon: categoryData.icon, isEssential: categoryData.isEssential, isDebtCategory: categoryData.isDebtCategory }, { merge: true });

            if (!isEditing) {
                const budgetRef = doc(db, 'users', user.uid, 'budgets', 'current');
                const budgetSnap = await getDoc(budgetRef);
                if (budgetSnap.exists()) {
                    const budgetData = budgetSnap.data();
                    const categoryBudgets = budgetData.categoryBudgets || [];
                    categoryBudgets.push({ categoryId: id, budget: 0 });
                    batch.update(budgetRef, { categoryBudgets });
                }
            }

            await batch.commit();
            toast({ title: 'Sukses', description: `Kategori berhasil ${isEditing ? 'diperbarui' : 'disimpan'}.` });
            setIsFormOpen(false);
            setEditingCategory(null);
        } catch (error: any) {
            toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
        }
    };
    
    const handleDeleteRequest = (category: Category) => {
        if (category.isEssential) {
            toast({ title: "Tidak bisa dihapus", description: "Kategori esensial tidak dapat dihapus.", variant: "destructive" });
            return;
        }
        setCategoryToDelete(category);
    }
    
    const confirmDelete = async () => {
        if (!categoryToDelete || !user) return;
        try {
            const categoryRef = doc(db, 'users', user.uid, 'categories', categoryToDelete.id);
            await deleteDoc(categoryRef);
            
            // Note: We are not removing the budget entry for this category to avoid data loss on transactions.
            // It will just be an orphaned budget entry.
            
            toast({ title: "Sukses", description: "Kategori berhasil dihapus." });
        } catch (error: any) {
            toast({ title: "Gagal Menghapus", description: error.message, variant: "destructive" });
        } finally {
            setCategoryToDelete(null);
        }
    }
    
    const handleOpenForm = (category?: Category) => {
        setEditingCategory(category || null);
        setIsFormOpen(true);
    };
    
    if (loading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <h1 className="font-headline text-xl font-bold">Kelola Kategori</h1>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Daftar Kategori Anda</CardTitle>
                        <CardDescription>Tambah, ubah, atau hapus kategori pengeluaran Anda. Perubahan akan berlaku pada periode anggaran berikutnya.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex items-center gap-4 rounded-md border p-3 hover:bg-secondary/50">
                                <div className="flex-1 font-semibold">{cat.name}</div>
                                <Button variant="outline" size="sm" onClick={() => handleOpenForm(cat)}>Ubah</Button>
                                <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => handleDeleteRequest(cat)} disabled={cat.isEssential}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                     <CardFooter>
                        <Button className="w-full" onClick={() => handleOpenForm()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Tambah Kategori Baru
                        </Button>
                    </CardFooter>
                </Card>
            </main>
            
            <AddCategoryForm 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleSaveCategory}
                categoryToEdit={editingCategory}
            />
            
            <AlertDialog open={!!categoryToDelete} onOpenChange={setCategoryToDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Kategori "{categoryToDelete?.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Menghapus kategori tidak akan menghapus transaksi lama yang terkait dengannya.
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
        </div>
    )
}
