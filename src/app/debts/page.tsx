
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Debt, Expense, Category, Wallet, Income } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Pencil, Trash2, Landmark, Wallet as WalletIcon, Loader2, Calendar, Coins, FileText, Tag, CreditCard } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import { AddDebtForm } from '@/components/AddDebtForm';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, updateDoc, getDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { awardAchievement } from '@/lib/achievements-manager';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const convertTimestamps = (data: any) => {
  if (data?.date && typeof data.date.toDate === 'function') {
    return { ...data, date: data.date.toDate() };
  }
   if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  return data;
};

export default function DebtsPage() {
    const { user, loading: authLoading, achievements, idToken } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [debts, setDebts] = React.useState<Debt[]>([]);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [incomes, setIncomes] = React.useState<Income[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [isDebtFormOpen, setIsDebtFormOpen] = React.useState(false);
    const [isPaymentFormOpen, setIsPaymentFormOpen] = React.useState(false);
    const [editingDebt, setEditingDebt] = React.useState<Debt | null>(null);
    const [expenseToEdit, setExpenseToEdit] = React.useState<Expense | undefined>(undefined);
    const [debtToDelete, setDebtToDelete] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [detailDebt, setDetailDebt] = React.useState<Debt | null>(null);
    const [paymentDetail, setPaymentDetail] = React.useState<Expense | null>(null);
    
    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const loadData = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const debtsSnapshot = await getDocs(collection(db, 'users', user.uid, 'debts'));
            const debtsData = debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[];
            setDebts(debtsData);

            const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            const budgetDocSnap = await getDoc(budgetDocRef);
            if (budgetDocSnap.exists()) {
                const budgetData = budgetDocSnap.data() || {};
                setExpenses((budgetData.expenses || []).map(convertTimestamps));
                setIncomes((budgetData.incomes || []).map(convertTimestamps));
                setCategories(budgetData.categories || []);
            } else {
                setExpenses([]);
                setIncomes([]);
                setCategories([]);
            }
            
            const walletsSnapshot = await getDocs(collection(db, 'users', user.uid, 'wallets'));
            setWallets(walletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));

        } catch (error) {
            console.error("Failed to load data from Firestore", error);
            toast({
                title: 'Gagal Memuat Data',
                description: 'Tidak dapat memuat data utang dari cloud.',
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
    
    const handleSaveDebt = async (debtData: Debt) => {
        if (!user) return;
        const isEditing = debts.some(d => d.id === debtData.id);
        
        try {
            const debtDocRef = doc(db, 'users', user.uid, 'debts', debtData.id);
            await setDoc(debtDocRef, {
                name: debtData.name,
                totalAmount: debtData.totalAmount,
                interestRate: debtData.interestRate,
                minimumPayment: debtData.minimumPayment,
            }, { merge: true });

            toast({ title: 'Sukses', description: `Utang berhasil ${isEditing ? 'diperbarui' : 'ditambahkan'}.` });
            setIsDebtFormOpen(false);
            setEditingDebt(null);
            await loadData();
        } catch (error) {
            console.error('Error saving debt:', error);
            toast({ title: 'Gagal', description: 'Gagal menyimpan data utang.', variant: 'destructive' });
        }
    };

    const calculateDebtProgress = (debtId: string) => {
        return expenses
            .filter(e => e.debtId === debtId)
            .reduce((sum, e) => sum + (e.baseAmount || e.amount), 0);
    };
    
    const filteredPaymentsForDebt = React.useMemo(() => {
        if (!detailDebt) return [];
        return expenses
            .filter(e => e.debtId === detailDebt.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, detailDebt]);


    const handleSavePayment = async (expenseData: Expense) => {
        if (!user) return;

        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
        
        try {
            const budgetDocSnap = await getDoc(budgetDocRef);
            if (!budgetDocSnap.exists()) {
                throw new Error("Budget document not found.");
            }
            
            const budgetData = budgetDocSnap.data();
            if (budgetData) {
                const currentExpenses = budgetData.expenses || [];
                const updatedExpenses = [...currentExpenses, expenseData];

                await updateDoc(budgetDocRef, { expenses: updatedExpenses });
                
                setExpenses(updatedExpenses.map(convertTimestamps));
                setIsPaymentFormOpen(false);
                setExpenseToEdit(undefined);

                if (expenseData.debtId) {
                    const debt = debts.find(d => d.id === expenseData.debtId);
                    if (debt) {
                        const totalPaidForDebt = updatedExpenses
                            .filter((e: Expense) => e.debtId === debt.id)
                            .reduce((sum, e) => sum + (e.baseAmount || e.amount), 0);
                            
                        if (totalPaidForDebt >= debt.totalAmount) {
                            await awardAchievement(user.uid, 'debt-slayer', achievements, idToken);
                        }
                    }
                }
                
                toast({ title: 'Sukses', description: 'Pembayaran berhasil dicatat.' });
            } else {
                throw new Error("Budget document is empty.");
            }
        } catch (error) {
            console.error("Error saving payment:", error);
            toast({ title: 'Gagal', description: 'Gagal menyimpan pembayaran. Periksa koneksi Anda.', variant: 'destructive' });
        }
    };


    const handleDeleteRequest = (debtId: string) => {
        setDebtToDelete(debtId);
    };

    const confirmDelete = async () => {
        if (!debtToDelete || !user) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(db);

            const debtDocRef = doc(db, 'users', user.uid, 'debts', debtToDelete);
            batch.delete(debtDocRef);

            const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            const budgetDocSnap = await getDoc(budgetDocRef);
            if (budgetDocSnap.exists()) {
                const budgetData = budgetDocSnap.data();
                if (budgetData) {
                    const currentExpenses = (budgetData.expenses || []).filter((e: Expense) => e.debtId !== debtToDelete);
                    batch.update(budgetDocRef, { expenses: currentExpenses });
                }
            }

            await batch.commit();

            toast({ title: "Sukses", description: "Utang dan riwayat pembayarannya berhasil dihapus." });
            setDebtToDelete(null);
            await loadData();
        } catch (error) {
            console.error('Error deleting debt:', error);
            toast({ title: "Gagal", description: "Gagal menghapus utang.", variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenDebtForm = (debt?: Debt) => {
        setEditingDebt(debt || null);
        setIsDebtFormOpen(true);
    };

    const debtPaymentCategory = categories.find(c => c.isDebtCategory);

    const handleOpenPaymentForm = (debt: Debt) => {
        if (!debtPaymentCategory) {
            toast({title: "Kategori Pembayaran Utang Tidak Ditemukan", description: "Pastikan Anda memiliki kategori 'Pembayaran Utang' di anggaran Anda.", variant: "destructive"});
            return;
        }
        setExpenseToEdit({
            id: `exp-debt-${Date.now()}`,
            amount: debt.minimumPayment,
            baseAmount: debt.minimumPayment,
            categoryId: debtPaymentCategory.id,
            debtId: debt.id,
            date: new Date(),
            notes: `Pembayaran untuk ${debt.name}`
        });
        setIsPaymentFormOpen(true);
    };

    const handleOpenGenericPaymentForm = () => {
        if (!debtPaymentCategory) {
            toast({title: "Kategori Pembayaran Utang Tidak Ditemukan", description: "Pastikan Anda memiliki kategori 'Pembayaran Utang' di anggaran Anda.", variant: "destructive"});
            return;
        }
        setExpenseToEdit({
            id: `exp-debt-${Date.now()}`,
            amount: 0,
            baseAmount: 0,
            categoryId: debtPaymentCategory.id,
            debtId: '',
            date: new Date(),
            notes: ''
        });
        setIsPaymentFormOpen(true);
    };

    const handlePaymentFormOpenChange = (open: boolean) => {
        if (!open) {
            setExpenseToEdit(undefined);
        }
        setIsPaymentFormOpen(open);
    }
    
    const detailWallet = paymentDetail?.walletId ? wallets.find(w => w.id === paymentDetail.walletId) : null;


    if (authLoading || isLoading) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                 <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                     <Skeleton className="h-8 w-8 rounded-full" />
                     <Skeleton className="h-6 w-40 rounded-md" />
                 </header>
                 <main className="flex-1 p-4 md:p-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
                     </div>
                 </main>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-20">
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Manajemen Utang
                    </h1>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                {debts.length === 0 ? (
                     <div className="text-center text-muted-foreground py-16">
                        <p className="text-lg font-semibold">Bebas Utang!</p>
                        <p>Anda belum memiliki catatan utang. Gunakan tombol (+) untuk memulai.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {debts.map(debt => {
                            const totalPaid = calculateDebtProgress(debt.id);
                            const remaining = debt.totalAmount - totalPaid;
                            const isPaidOff = remaining <= 0;
                            const progress = debt.totalAmount > 0 ? (totalPaid / debt.totalAmount) * 100 : 0;
                            return (
                                <Card 
                                    key={debt.id} 
                                    className={cn(
                                        "flex flex-col border-l-4 cursor-pointer hover:border-primary/80 transition-colors",
                                        isPaidOff ? "border-l-green-500" : "border-l-destructive"
                                    )}
                                    onClick={() => setDetailDebt(debt)}
                                >
                                    <CardContent className="p-4 flex flex-col h-full gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="font-headline text-base leading-tight">{debt.name}</CardTitle>
                                                <CardDescription className="text-xs">{debt.interestRate}% Bunga / Tahun</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-0 -mr-2 -mt-2" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDebtForm(debt)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(debt.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-grow">
                                            <p className="text-xs text-muted-foreground">Sisa Utang</p>
                                            <p className={cn(
                                                "text-2xl font-bold font-headline",
                                                isPaidOff ? "text-green-600" : "text-destructive"
                                            )}>
                                                {formatCurrency(remaining)}
                                            </p>
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <Progress value={progress} className="h-2" />
                                            <div className="flex justify-between text-xs font-medium">
                                                <span className="text-green-600">Terbayar: {formatCurrency(totalPaid)}</span>
                                                <span className="text-muted-foreground">{progress.toFixed(1)}%</span>
                                            </div>
                                        </div>

                                        <Button size="sm" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); handleOpenPaymentForm(debt); }} disabled={isPaidOff || !debtPaymentCategory}>
                                            <WalletIcon className="mr-2 h-4 w-4" />
                                            {isPaidOff ? 'Sudah Lunas' : (debtPaymentCategory ? 'Catat Pembayaran' : 'Kategori Utang Tdk Ada')}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>

            <SpeedDial mainIcon={<PlusCircle className="h-7 w-7" />}>
                <SpeedDialAction label="Catat Pembayaran" onClick={handleOpenGenericPaymentForm}>
                    <WalletIcon className="h-5 w-5 text-blue-500" />
                </SpeedDialAction>
                <SpeedDialAction label="Tambah Utang Baru" onClick={() => handleOpenDebtForm()}>
                    <Landmark className="h-5 w-5 text-green-500" />
                </SpeedDialAction>
            </SpeedDial>

            <AddDebtForm 
                isOpen={isDebtFormOpen}
                onOpenChange={setIsDebtFormOpen}
                onSubmit={handleSaveDebt}
                debtToEdit={editingDebt}
            />

            <AddExpenseForm
                isOpen={isPaymentFormOpen}
                onOpenChange={handlePaymentFormOpenChange}
                categories={categories}
                savingGoals={[]}
                debts={debts}
                wallets={wallets}
                expenses={expenses}
                incomes={incomes}
                onSubmit={handleSavePayment}
                expenseToEdit={expenseToEdit}
                isDebtPaymentMode={true}
            />
            
            <Dialog open={!!detailDebt} onOpenChange={(open) => !open && setDetailDebt(null)}>
                <DialogContent className="h-full flex flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle className="font-headline">{detailDebt?.name}</DialogTitle>
                        <DialogDescription>
                            Detail dan riwayat pembayaran untuk utang ini.
                        </DialogDescription>
                    </DialogHeader>
                    {detailDebt && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-secondary rounded-md">
                                    <p className="text-muted-foreground">Total Utang</p>
                                    <p className="font-bold">{formatCurrency(detailDebt.totalAmount)}</p>
                                </div>
                                <div className="p-3 bg-secondary rounded-md">
                                    <p className="text-muted-foreground">Sisa Utang</p>
                                    <p className="font-bold text-destructive">{formatCurrency(detailDebt.totalAmount - calculateDebtProgress(detailDebt.id))}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Riwayat Pembayaran</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Catatan</TableHead>
                                            <TableHead className="text-right">Jumlah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPaymentsForDebt.length > 0 ? (
                                            filteredPaymentsForDebt.map(p => (
                                                <TableRow key={p.id} onClick={() => setPaymentDetail(p)} className="cursor-pointer">
                                                    <TableCell>{format(p.date, "d MMM yyyy", { locale: idLocale })}</TableCell>
                                                    <TableCell className="truncate max-w-xs">{p.notes}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(p.baseAmount || p.amount)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center h-24">Belum ada riwayat pembayaran.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            
            <Dialog open={!!paymentDetail} onOpenChange={(open) => !open && setPaymentDetail(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Detail Pembayaran</DialogTitle>
                </DialogHeader>
                {paymentDetail && (
                  <div className="space-y-4 py-2">
                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-sm text-muted-foreground">Jumlah Pembayaran</p>
                      <p className="text-2xl font-bold text-destructive">{formatCurrency(paymentDetail.amount)}</p>
                      {paymentDetail.adminFee && paymentDetail.adminFee > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                              (Pokok: {formatCurrency(paymentDetail.baseAmount || 0)} + Admin: {formatCurrency(paymentDetail.adminFee)})
                          </p>
                      )}
                    </div>
                    <div className="space-y-3 pt-2 text-sm">
                        <div className="flex items-start gap-3">
                            <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Tanggal</p>
                                <p className="font-medium">{format(new Date(paymentDetail.date), "EEEE, d MMMM yyyy, HH:mm", { locale: idLocale })}</p>
                            </div>
                        </div>
                        {detailWallet && (
                          <div className="flex items-start gap-3">
                              <WalletIcon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                              <div>
                                  <p className="text-xs text-muted-foreground">Dibayar dari</p>
                                  <p className="font-medium">{detailWallet.name}</p>
                              </div>
                          </div>
                        )}
                        {paymentDetail.notes && (
                            <div className="flex items-start gap-3">
                                <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Catatan</p>
                                    <p className="font-medium whitespace-pre-wrap">{paymentDetail.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <AlertDialog open={!!debtToDelete} onOpenChange={(open) => !open && setDebtToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus utang dan SEMUA riwayat pembayarannya secara permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDebtToDelete(null)}>Batal</AlertDialogCancel>
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
