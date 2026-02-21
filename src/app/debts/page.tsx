"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Debt, Expense, Category, Wallet, Income } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Pencil, Trash2, Landmark, Wallet as WalletIcon, Loader2, Calendar, Coins, FileText, Tag, CreditCard, ChevronRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, cn } from '@/lib/utils';
import { AddDebtForm } from '@/components/AddDebtForm';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, updateDoc, getDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

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
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    const loadData = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const debtsSnap = await getDocs(collection(db, 'users', user.uid, 'debts'));
            const debtsData = debtsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[];
            setDebts(debtsData);

            const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            const budgetDocSnap = await getDoc(budgetDocRef);
            if (budgetDocSnap.exists()) {
                const data = budgetDocSnap.data() || {};
                setExpenses((data.expenses || []).map(convertTimestamps));
                setIncomes((data.incomes || []).map(convertTimestamps));
                setCategories(data.categories || []);
            }
            const walletsSnap = await getDocs(collection(db, 'users', user.uid, 'wallets'));
            setWallets(walletsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    React.useEffect(() => { if (user) loadData(); }, [user, loadData]);
    
    const calculateDebtProgress = (debtId: string) => {
        return expenses.filter(e => e.debtId === debtId).reduce((sum, e) => sum + (e.baseAmount || e.amount), 0);
    };

    if (authLoading || isLoading) {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 pb-24">
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full -ml-2 text-slate-400">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Manajemen Utang</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Pantau Pinjaman Anda</p>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                    <CreditCard className="h-5 w-5" />
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
                {debts.length === 0 ? (
                    <div className="py-20 text-center">
                        <CreditCard className="h-12 w-12 mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Bebas utang! Anda tidak punya cicilan aktif.</p>
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
                                        "group bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border-l-4 transition-all cursor-pointer relative overflow-hidden",
                                        isPaidOff ? "border-l-emerald-500" : "border-l-rose-500"
                                    )}
                                    onClick={() => setDetailDebt(debt)}
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-5">
                                        <Landmark className="h-24 w-24" />
                                    </div>
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg uppercase tracking-tight leading-none mb-1">{debt.name}</h3>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{debt.interestRate}% Bunga Tahunan</p>
                                            </div>
                                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleOpenDebtForm(debt)}><Pencil className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => setDebtToDelete(debt.id)}><Trash2 className="h-4 w-4"/></Button>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-6">
                                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-1">Sisa Pinjaman</p>
                                            <p className={cn("text-3xl font-black tracking-tighter", isPaidOff ? "text-emerald-600" : "text-rose-500")}>
                                                {formatCurrency(remaining)}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-auto space-y-3">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-emerald-600">Terbayar: {formatCurrency(totalPaid)}</span>
                                                <span className="text-slate-400">{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                <div className={cn("h-full transition-all duration-1000", isPaidOff ? 'bg-emerald-500' : 'bg-rose-500')} style={{ width: `${Math.min(progress, 100)}%` }} />
                                            </div>
                                            <Button size="sm" className="w-full h-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold uppercase text-[10px] tracking-widest mt-4" onClick={(e) => { e.stopPropagation(); handleOpenPaymentForm(debt); }} disabled={isPaidOff}>
                                                <WalletIcon className="mr-2 h-3.5 w-3.5" /> Catat Pembayaran
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>

            <SpeedDial mainIcon={<PlusCircle className="h-8 w-8" />}>
                <SpeedDialAction label="Catat Pembayaran" onClick={handleOpenGenericPaymentForm}>
                    <WalletIcon className="h-5 w-5 text-blue-500" />
                </SpeedDialAction>
                <SpeedDialAction label="Tambah Utang" onClick={() => handleOpenDebtForm()}>
                    <Landmark className="h-5 w-5 text-green-500" />
                </SpeedDialAction>
            </SpeedDial>

            <Dialog open={!!detailDebt} onOpenChange={(open) => !open && setDetailDebt(null)}>
                <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl">
                    <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="font-bold text-lg uppercase tracking-widest text-slate-800 dark:text-white text-center">Riwayat Pembayaran</DialogTitle>
                    </DialogHeader>
                    {detailDebt && (
                        <div className="flex-1 p-8 space-y-8 overflow-y-auto hide-scrollbar">
                            <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 text-center border border-slate-100 dark:border-slate-800 shadow-inner">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-3">Sisa Pokok</p>
                                <p className="text-4xl font-black tracking-tighter mb-4 text-rose-500">
                                    {formatCurrency(detailDebt.totalAmount - calculateDebtProgress(detailDebt.id))}
                                </p>
                                <Badge variant="outline" className="border-none font-extrabold uppercase text-[9px] tracking-[0.2em] px-4 py-1.5 rounded-full bg-slate-100 text-slate-500">
                                    Plafon: {formatCurrency(detailDebt.totalAmount)}
                                </Badge>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {expenses.filter(e => e.debtId === detailDebt.id).sort((a,b) => b.date.getTime() - a.date.getTime()).map(p => (
                                        <div key={p.id} className="py-4 px-2 flex justify-between items-center group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors" onClick={() => setPaymentDetail(p)}>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.notes || 'Pembayaran Cicilan'}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{format(p.date, "d MMM yyyy", { locale: idLocale })}</p>
                                            </div>
                                            <p className="text-sm font-black text-rose-500 tabular-nums shrink-0">
                                                {formatCurrency(p.baseAmount || p.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AddDebtForm isOpen={isDebtFormOpen} onOpenChange={setIsDebtFormOpen} onSubmit={handleSaveDebt} debtToEdit={editingDebt} />
            <AddExpenseForm isOpen={isPaymentFormOpen} onOpenChange={setIsPaymentFormOpen} categories={categories} savingGoals={[]} debts={debts} wallets={wallets} expenses={expenses} incomes={incomes} onSubmit={handleSavePayment} expenseToEdit={expenseToEdit} isDebtPaymentMode={true} />
            
            <AlertDialog open={!!debtToDelete} onOpenChange={open => !open && setDebtToDelete(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader><AlertDialogTitle className="font-bold uppercase tracking-widest text-xs">Hapus Catatan Utang?</AlertDialogTitle><AlertDialogDescription className="text-xs font-bold text-slate-400">Tindakan ini permanen. Semua riwayat pembayaran juga akan terhapus.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4"><AlertDialogCancel className="flex-1 rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest">Batal</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="flex-1 rounded-xl h-10 bg-rose-500 text-[10px] font-bold uppercase tracking-widest">{isDeleting ? <Loader2 className="h-3 w-3 animate-spin"/> : "Ya, Hapus"}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );

    async function handleSaveDebt(data: Debt) {
        await setDoc(doc(db, 'users', user!.uid, 'debts', data.id), data, { merge: true });
        toast({ title: 'Sukses!' });
        setIsDebtFormOpen(false);
        loadData();
    }

    async function handleSavePayment(data: Expense) {
        const budgetDocRef = doc(db, 'users', user!.uid, 'budgets', 'current');
        const budgetSnap = await getDoc(budgetDocRef);
        if (budgetSnap.exists()) {
            await updateDoc(budgetDocRef, { expenses: [...(budgetSnap.data().expenses || []), data] });
            toast({ title: 'Pembayaran dicatat!' });
            setIsPaymentFormOpen(false);
            loadData();
        }
    }

    async function confirmDelete() {
        if (!debtToDelete) return;
        setIsDeleting(true);
        const batch = writeBatch(db);
        batch.delete(doc(db, 'users', user!.uid, 'debts', debtToDelete));
        const budgetDocRef = doc(db, 'users', user!.uid, 'budgets', 'current');
        const budgetSnap = await getDoc(budgetDocRef);
        if (budgetSnap.exists()) {
            const currentExpenses = (budgetSnap.data().expenses || []).filter((e: Expense) => e.debtId !== debtToDelete);
            batch.update(budgetDocRef, { expenses: currentExpenses });
        }
        await batch.commit();
        setDebtToDelete(null);
        setIsDeleting(false);
        loadData();
    }

    function handleOpenDebtForm(debt?: Debt) { setEditingDebt(debt || null); setIsDebtFormOpen(true); }
    function handleOpenPaymentForm(debt: Debt) {
        const cat = categories.find(c => c.isDebtCategory);
        if (!cat) return toast({ title: "Kategori 'Pembayaran Utang' tidak ditemukan.", variant: "destructive" });
        setExpenseToEdit({ id: `exp-debt-${Date.now()}`, amount: debt.minimumPayment, baseAmount: debt.minimumPayment, categoryId: cat.id, debtId: debt.id, date: new Date(), notes: `Bayar ${debt.name}` });
        setIsPaymentFormOpen(true);
    }
    function handleOpenGenericPaymentForm() {
        const cat = categories.find(c => c.isDebtCategory);
        if (!cat) return toast({ title: "Kategori 'Pembayaran Utang' tidak ditemukan.", variant: "destructive" });
        setExpenseToEdit({ id: `exp-debt-${Date.now()}`, amount: 0, baseAmount: 0, categoryId: cat.id, debtId: '', date: new Date(), notes: '' });
        setIsPaymentFormOpen(true);
    }
}
