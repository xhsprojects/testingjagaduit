"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { SavingGoal, Expense, Category, Wallet, Income, Debt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Target, PlusCircle, MinusCircle, Wallet as WalletIcon, Calendar, Coins, FileText, ArrowLeft, CreditCard, Landmark, Tag, PiggyBank, Edit, Trash2, ChevronRight, History, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { WithdrawFromGoalForm } from '@/components/WithdrawFromGoalForm';
import { awardAchievement } from '@/lib/achievements-manager';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';
import { AddSavingGoalForm } from '@/components/AddSavingGoalForm';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { awardUserXp } from '@/app/achievements/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function SavingsPage() {
    const { user, loading: authLoading, achievements, idToken } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [incomes, setIncomes] = React.useState<Income[]>([]);
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [debts, setDebts] = React.useState<Debt[]>([]);
    const [savingsCategoryId, setSavingsCategoryId] = React.useState<string | undefined>();
    const [isWithdrawFormOpen, setIsWithdrawFormOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isAddGoalFormOpen, setIsAddGoalFormOpen] = React.useState(false);
    const [editingGoal, setEditingGoal] = React.useState<SavingGoal | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [detailGoal, setDetailGoal] = React.useState<SavingGoal | null>(null);
    const [transactionDetail, setTransactionDetail] = React.useState<Expense | null>(null);
    
    const [isAddExpenseFormOpen, setIsAddExpenseFormOpen] = React.useState(false);
    const [expenseToEdit, setExpenseToEdit] = React.useState<Expense | null>(null);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const loadData = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const goalsSnapshot = getDocs(collection(db, 'users', user.uid, 'savingGoals'));
            const walletsSnapshot = getDocs(collection(db, 'users', user.uid, 'wallets'));
            const budgetDocRef = getDoc(doc(db, 'users', user.uid, 'budgets', 'current'));
            const debtsSnapshot = getDocs(collection(db, 'users', user.uid, 'debts'));

            const [goalsSnap, walletsSnap, budgetDocSnap, debtsSnap] = await Promise.all([goalsSnapshot, walletsSnapshot, budgetDocRef, debtsSnapshot]);

            setSavingGoals(goalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavingGoal[]);
            setWallets(walletsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet)));
            setDebts(debtsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt)));
            
            if (budgetDocSnap.exists()) {
                const budgetData = budgetDocSnap.data();
                setExpenses((budgetData.expenses || []).map(convertTimestamps));
                setIncomes((budgetData.incomes || []).map(convertTimestamps));
                const budgetCategories = (budgetData.categories || []);
                setCategories(budgetCategories);
                const savingsCategory = budgetCategories.find((c: Category) => c.name === "Tabungan & Investasi");
                setSavingsCategoryId(savingsCategory?.id);
            }
        } catch (error) {
            console.error("Failed to load savings data", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    React.useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, loadData]);

    const handleUpdateGoals = async (updatedGoals: SavingGoal[]) => {
      if (!user || !idToken) return;
      setIsSubmitting(true);
      try {
        const batch = writeBatch(db);
        const goalsCollectionRef = collection(db, 'users', user.uid, 'savingGoals');
        const existingGoalsSnapshot = await getDocs(goalsCollectionRef);
        const isNewGoal = updatedGoals.length > existingGoalsSnapshot.size;
        existingGoalsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        updatedGoals.forEach(goal => {
            const { id, ...goalData } = goal;
            const docRef = doc(goalsCollectionRef, id);
            batch.set(docRef, goalData);
        });
        await batch.commit();
        setSavingGoals(updatedGoals);
        if (isNewGoal) await awardAchievement(user.uid, 'first-goal', achievements, idToken);
      } catch (error) {
          toast({title: "Gagal Memperbarui Tujuan", variant: 'destructive'});
      } finally {
          setIsSubmitting(false);
      }
    }

    const handleSaveGoal = async (goalData: SavingGoal) => {
        const isEditing = savingGoals.some(g => g.id === goalData.id);
        const updatedGoals = isEditing ? savingGoals.map(g => (g.id === goalData.id ? goalData : g)) : [...savingGoals, goalData];
        await handleUpdateGoals(updatedGoals);
        toast({ title: 'Sukses', description: `Tujuan berhasil ${isEditing ? 'diperbarui' : 'ditambahkan'}.` });
        setIsAddGoalFormOpen(false);
        setEditingGoal(null);
    };

    const handleOpenGoalForm = (goal?: SavingGoal) => {
        setEditingGoal(goal || null);
        setIsAddGoalFormOpen(true);
    };
    
    const handleSaveDeposit = async (expenseData: Expense) => {
        if (!user || !idToken) return;
        const updatedExpenses = [...expenses, expenseData];
        try {
            const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            await updateDoc(budgetDocRef, { expenses: updatedExpenses });
            setExpenses(updatedExpenses.map(convertTimestamps));
            setIsAddExpenseFormOpen(false);
            toast({ title: 'Sukses', description: `Setoran berhasil dicatat.` });
            await awardUserXp(50, idToken);
        } catch (error) {
            toast({ title: 'Gagal Menyimpan Setoran', variant: 'destructive' });
        }
    };
    
    const calculateGoalProgress = React.useCallback((goalId: string) => {
        return expenses
            .filter(e => e.savingGoalId === goalId)
            .reduce((sum, e) => sum + (e.baseAmount || e.amount), 0);
    }, [expenses]);
    
    const totalSavedInAllGoals = React.useMemo(() => {
        return savingGoals.reduce((total, goal) => total + calculateGoalProgress(goal.id), 0);
    }, [savingGoals, calculateGoalProgress]);

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
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Tujuan Menabung</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Wujudkan Impian Finansial</p>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                    <Target className="h-5 w-5" />
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2">Total Dana Terkumpul</p>
                        <p className="text-3xl font-black text-primary tracking-tight">{formatCurrency(totalSavedInAllGoals)}</p>
                    </Card>
                    <Card className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2">Tujuan Aktif</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{savingGoals.length} <span className="text-sm font-bold text-slate-400 uppercase ml-1">Target</span></p>
                    </Card>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savingGoals.length > 0 ? savingGoals.map(goal => {
                        const currentAmount = calculateGoalProgress(goal.id);
                        const progress = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
                        return (
                            <Card 
                                key={goal.id} 
                                onClick={() => setDetailGoal(goal)}
                                className="group bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border-slate-100 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-5">
                                    <Target className="h-24 w-24 text-primary" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg mb-1 truncate uppercase tracking-tight">{goal.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Target: {formatCurrency(goal.targetAmount)}</p>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(currentAmount)}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className="h-full bg-primary transition-all duration-1000" 
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    }) : (
                        <div className="col-span-full py-20 text-center">
                            <Target className="h-12 w-12 mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Belum ada tujuan menabung.</p>
                        </div>
                    )}
                </div>
            </main>

            <SpeedDial mainIcon={<PlusCircle className="h-8 w-8" />}>
                <SpeedDialAction label="Menabung" onClick={() => setIsAddExpenseFormOpen(true)}>
                    <PiggyBank className="h-5 w-5 text-blue-500" />
                </SpeedDialAction>
                <SpeedDialAction label="Tarik Dana" onClick={() => setIsWithdrawFormOpen(true)}>
                    <MinusCircle className="h-5 w-5 text-red-500" />
                </SpeedDialAction>
                <SpeedDialAction label="Tambah Tujuan" onClick={() => handleOpenGoalForm()}>
                    <Target className="h-5 w-5 text-green-500" />
                </SpeedDialAction>
            </SpeedDial>
            
            {/* Modal Detail Goal */}
            <Dialog open={!!detailGoal} onOpenChange={(open) => !open && setDetailGoal(null)}>
                <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl">
                    <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="font-bold text-lg uppercase tracking-widest text-slate-800 dark:text-white text-center">Detail Tujuan</DialogTitle>
                    </DialogHeader>
                    {detailGoal && (
                        <div className="flex-1 p-8 space-y-8 overflow-y-auto hide-scrollbar">
                            <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 text-center border border-slate-100 dark:border-slate-800 shadow-inner">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-3">Dana Terkumpul</p>
                                <p className="text-4xl font-black tracking-tighter mb-4 text-primary">
                                    {formatCurrency(calculateGoalProgress(detailGoal.id))}
                                </p>
                                <Badge variant="outline" className="bg-primary/10 border-none font-extrabold uppercase text-[9px] tracking-[0.2em] px-4 py-1.5 rounded-full text-primary">
                                    Target: {formatCurrency(detailGoal.targetAmount)}
                                </Badge>
                            </div>
                            
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] px-2">Riwayat Menabung</h4>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {expenses.filter(e => e.savingGoalId === detailGoal.id).sort((a,b) => b.date.getTime() - a.date.getTime()).map(t => (
                                        <div key={t.id} className="py-3 px-2 flex justify-between items-center group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.amount > 0 ? "Setoran" : "Penarikan"}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{format(t.date, "d MMM yyyy", { locale: idLocale })}</p>
                                            </div>
                                            <p className={cn("text-sm font-black tabular-nums", t.amount > 0 ? "text-emerald-600" : "text-rose-500")}>
                                                {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-row gap-3">
                        <button className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs uppercase tracking-[0.2em] shadow-lg transition-all" onClick={() => {if(detailGoal) handleOpenGoalForm(detailGoal); setDetailGoal(null);}}>Ubah</button>
                        <button className="flex-1 h-12 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-500 font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all" onClick={() => {if(detailGoal) handleUpdateGoals(savingGoals.filter(g => g.id !== detailGoal.id)); setDetailGoal(null);}}>Hapus</button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AddSavingGoalForm isOpen={isAddGoalFormOpen} onOpenChange={setIsAddGoalFormOpen} onSubmit={handleSaveGoal} goalToEdit={editingGoal} isSubmitting={isSubmitting} />
            <AddExpenseForm isOpen={isAddExpenseFormOpen} onOpenChange={setIsAddExpenseFormOpen} categories={categories} savingGoals={savingGoals} debts={debts} wallets={wallets} expenses={expenses} incomes={incomes} onSubmit={handleSaveDeposit} />
            <WithdrawFromGoalForm isOpen={isWithdrawFormOpen} onOpenChange={setIsWithdrawFormOpen} goals={savingGoals} wallets={wallets} expenses={expenses} incomes={incomes} onSubmit={handleWithdrawal} />
        </div>
    );

    async function handleWithdrawal(withdrawalData: any) {
        if (!savingsCategoryId || !idToken) return;
        const withdrawalAmount = Math.abs(withdrawalData.amount);
        const withdrawalExpense: Expense = {
            id: `wtd-${Date.now()}`, amount: -withdrawalAmount, baseAmount: -withdrawalAmount, categoryId: savingsCategoryId, date: new Date(), savingGoalId: withdrawalData.savingGoalId, notes: `Penarikan: ${withdrawalData.notes || 'Tarik dana'}`, walletId: withdrawalData.walletId
        };
        const depositIncome: Income = {
            id: `dep-${Date.now()}`, amount: withdrawalAmount, baseAmount: withdrawalAmount, date: new Date(), notes: `Dana masuk dari tabungan`, walletId: withdrawalData.walletId
        };
        const budgetDocRef = doc(db, 'users', user!.uid, 'budgets', 'current');
        const budgetSnap = await getDoc(budgetDocRef);
        if (budgetSnap.exists()) {
            const data = budgetSnap.data();
            await updateDoc(budgetDocRef, { expenses: [...(data.expenses || []), withdrawalExpense], incomes: [...(data.incomes || []), depositIncome] });
            await loadData();
            toast({ title: "Sukses!", description: "Dana berhasil ditarik." });
            setIsWithdrawFormOpen(false);
        }
    }
}
