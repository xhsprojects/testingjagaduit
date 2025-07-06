
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { RecurringTransaction, Category, Wallet } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Pencil, Trash2, Repeat, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { AddRecurringTransactionForm } from '@/components/AddRecurringTransactionForm';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';

const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (typeof data.toDate === 'function') {
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  if (typeof data === 'object' && data !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key of Object.keys(data)) {
      newObj[key] = convertTimestamps(data[key]);
    }
    return newObj;
  }
  return data;
};

export default function RecurringPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [recurringTransactions, setRecurringTransactions] = React.useState<RecurringTransaction[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingTransaction, setEditingTransaction] = React.useState<RecurringTransaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const loadData = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const recurringSnapshot = await getDocs(collection(db, 'users', user.uid, 'recurringTransactions'));
            const recurringData = recurringSnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) })) as RecurringTransaction[];
            setRecurringTransactions(recurringData.sort((a,b) => a.dayOfMonth - b.dayOfMonth));

            const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            const budgetDocSnap = await getDoc(budgetDocRef);
            if (budgetDocSnap.exists()) {
                setCategories(budgetDocSnap.data().categories || []);
            } else {
                setCategories([]);
            }

            const walletsSnapshot = await getDocs(collection(db, 'users', user.uid, 'wallets'));
            setWallets(walletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));

        } catch (error) {
            console.error("Failed to load recurring transactions", error);
            toast({
                title: 'Gagal Memuat Data',
                description: 'Tidak dapat memuat data transaksi berulang.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    React.useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, loadData]);
    
    const handleSaveTransaction = async (data: RecurringTransaction) => {
        if (!user) return;
        const isEditing = recurringTransactions.some(d => d.id === data.id);
        
        try {
            const docRef = doc(db, 'users', user.uid, 'recurringTransactions', data.id);
            const dataToSave = {
                name: data.name,
                type: data.type,
                amount: data.amount,
                categoryId: data.categoryId || null,
                walletId: data.walletId,
                dayOfMonth: data.dayOfMonth,
                notes: data.notes || '',
                lastAdded: isEditing ? (editingTransaction?.lastAdded || null) : null,
            };

            await setDoc(docRef, dataToSave, { merge: true });

            toast({ title: 'Sukses', description: `Transaksi berulang berhasil ${isEditing ? 'diperbarui' : 'ditambahkan'}.` });
            setIsFormOpen(false);
            setEditingTransaction(null);
            await loadData();
        } catch (error) {
            console.error('Error saving recurring transaction:', error);
            toast({ title: 'Gagal', description: 'Gagal menyimpan data.', variant: 'destructive' });
        }
    };

    const handleDeleteRequest = (id: string) => {
        setTransactionToDelete(id);
    };

    const confirmDelete = async () => {
        if (!transactionToDelete || !user) return;
        setIsDeleting(true);
        try {
            const docRef = doc(db, 'users', user.uid, 'recurringTransactions', transactionToDelete);
            await deleteDoc(docRef);
            toast({ title: "Sukses", description: "Transaksi berulang berhasil dihapus." });
            setTransactionToDelete(null);
            await loadData();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            toast({ title: "Gagal", description: "Gagal menghapus data.", variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenForm = (transaction?: RecurringTransaction) => {
        setEditingTransaction(transaction || null);
        setIsFormOpen(true);
    };
    
    const categoryMap = React.useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
    const walletMap = React.useMemo(() => new Map(wallets.map(w => [w.id, w.name])), [wallets]);


    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat Data...</div>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <h1 className="font-headline text-xl font-bold text-foreground flex items-center gap-2">
                    <Repeat className="h-5 w-5 text-primary" />
                    Transaksi Berulang
                </h1>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-20">
                {recurringTransactions.length === 0 ? (
                     <div className="text-center text-muted-foreground py-16">
                        <p className="text-lg font-semibold">Belum Ada Data</p>
                        <p>Anda belum memiliki transaksi berulang. Gunakan tombol (+) untuk memulai.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recurringTransactions.map(transaction => (
                                <Card key={transaction.id} className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="font-headline flex items-center gap-2">
                                                 {transaction.type === 'income' ? 
                                                    <TrendingUp className="h-5 w-5 text-green-500" /> : 
                                                    <TrendingDown className="h-5 w-5 text-red-500" />
                                                 }
                                                 {transaction.name}
                                            </CardTitle>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenForm(transaction)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(transaction.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                        <CardDescription>
                                            Setiap tanggal {transaction.dayOfMonth}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-2 text-sm">
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>Jumlah</span>
                                            <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                                {formatCurrency(transaction.amount)}
                                            </span>
                                        </div>
                                        {transaction.type === 'expense' && transaction.categoryId && (
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Kategori</span>
                                                <span className="font-medium text-foreground">{categoryMap.get(transaction.categoryId) || 'N/A'}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Dompet</span>
                                            <span className="font-medium text-foreground">{walletMap.get(transaction.walletId) || 'N/A'}</span>
                                        </div>
                                        {transaction.notes && (
                                            <p className="text-muted-foreground border-t pt-2 mt-2">{transaction.notes}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        )}
                    </div>
                )}
            </main>
            
            <SpeedDial mainIcon={<PlusCircle className="h-7 w-7" />}>
                <SpeedDialAction label="Tambah Transaksi" onClick={() => handleOpenForm()}>
                    <Repeat className="h-5 w-5 text-blue-500" />
                </SpeedDialAction>
            </SpeedDial>

            <AddRecurringTransactionForm 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleSaveTransaction}
                transactionToEdit={editingTransaction}
                categories={categories}
                wallets={wallets}
            />
            
            <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus transaksi berulang secara permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
