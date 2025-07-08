
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { SavingGoal, Expense, Category, Wallet, Income, Debt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Target, PlusCircle, MinusCircle, Wallet as WalletIcon, Calendar, Coins, FileText, ArrowLeft, CreditCard, Landmark, Tag, PiggyBank } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import SavingGoalsTracker from '@/components/SavingGoalsTracker';
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
    
    // States for the new "Deposit" form
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
            } else {
                setExpenses([]);
                setIncomes([]);
                setCategories([]);
                setSavingsCategoryId(undefined);
            }
        } catch (error) {
            console.error("Failed to load savings data from Firestore", error);
            toast({
                title: 'Gagal Memuat Data',
                description: 'Tidak dapat memuat data tujuan tabungan.',
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

        if (isNewGoal) {
            await awardAchievement(user.uid, 'first-goal', achievements, idToken);
        }
        
      } catch (error) {
          console.error("Error updating goals:", error);
          toast({title: "Gagal Memperbarui Tujuan", variant: 'destructive'});
      } finally {
          setIsSubmitting(false);
      }
    }

    const handleSaveGoal = async (goalData: SavingGoal) => {
        const isEditing = savingGoals.some(g => g.id === goalData.id);
        let updatedGoals;

        if (isEditing) {
            updatedGoals = savingGoals.map(g => (g.id === goalData.id ? goalData : g));
        } else {
            updatedGoals = [...savingGoals, goalData];
        }

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
        
        const isEditing = expenses.some(e => e.id === expenseData.id);
        let updatedExpenses;
        if (isEditing) {
            updatedExpenses = expenses.map(e => (e.id === expenseData.id ? expenseData : e));
        } else {
            updatedExpenses = [...expenses, expenseData];
        }

        try {
            const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            await updateDoc(budgetDocRef, { expenses: updatedExpenses });
            setExpenses(updatedExpenses.map(convertTimestamps));
            setIsAddExpenseFormOpen(false);
            setExpenseToEdit(null);
            toast({ title: 'Sukses', description: `Setoran berhasil dicatat.` });
            
            if (!isEditing) {
                await awardUserXp(50, idToken);
                const hasSavingsAchievement = achievements.some(a => a.badgeId === 'investor-rookie');
                if (!hasSavingsAchievement) {
                    await awardAchievement(user.uid, 'investor-rookie', achievements, idToken);
                }
            }
        } catch (error) {
            console.error("Failed to save deposit:", error);
            toast({ title: 'Gagal Menyimpan Setoran', variant: 'destructive' });
        }
    };
    
    const handleOpenDepositForm = () => {
        if (!savingsCategoryId) {
            toast({
                title: "Kategori Tabungan Tidak Ditemukan",
                description: "Pastikan Anda memiliki kategori 'Tabungan & Investasi' di anggaran Anda untuk bisa menabung.",
                variant: "destructive"
            });
            return;
        }
        setExpenseToEdit({
            id: `exp-save-${Date.now()}`,
            amount: 0,
            baseAmount: 0,
            categoryId: savingsCategoryId,
            date: new Date(),
            notes: 'Setoran ke tujuan tabungan'
        });
        setIsAddExpenseFormOpen(true);
    };

    const handleAddExpenseFormOpenChange = (open: boolean) => {
        if (!open) {
            setExpenseToEdit(null);
        }
        setIsAddExpenseFormOpen(open);
    }

    const handleWithdrawal = async (withdrawalData: { amount: number; savingGoalId: string; walletId: string; notes?: string }) => {
        if (!savingsCategoryId) {
            toast({ title: "Error", description: "Kategori 'Tabungan & Investasi' tidak ditemukan.", variant: "destructive" });
            return;
        }

        const batch = writeBatch(db);
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');

        const withdrawalAmount = Math.abs(withdrawalData.amount);
        const withdrawalExpense: Expense = {
            id: `wtd-${Date.now()}`,
            amount: -withdrawalAmount,
            baseAmount: -withdrawalAmount,
            categoryId: savingsCategoryId,
            date: new Date(),
            savingGoalId: withdrawalData.savingGoalId,
            notes: `Penarikan: ${withdrawalData.notes || 'Tarik dana dari tujuan'}`,
        };
        
        const depositIncome: Income = {
            id: `dep-${Date.now()}`,
            amount: withdrawalAmount,
            baseAmount: withdrawalAmount,
            date: new Date(),
            notes: `Dana masuk dari tujuan '${savingGoals.find(g => g.id === withdrawalData.savingGoalId)?.name || ''}'`,
            walletId: withdrawalData.walletId,
        };
        
        try {
            const budgetSnap = await getDoc(budgetDocRef);
            if (!budgetSnap.exists()) throw new Error("Budget document not found.");
            
            const budgetData = budgetSnap.data();
            const currentExpenses = budgetData.expenses || [];
            const currentIncomes = budgetData.incomes || [];
            
            const updatedExpenses = [...currentExpenses, withdrawalExpense];
            const updatedIncomes = [...currentIncomes, depositIncome];

            batch.update(budgetDocRef, { 
                expenses: updatedExpenses,
                incomes: updatedIncomes
            });
            
            await batch.commit();
            await loadData();
            
            toast({ title: "Sukses", description: "Penarikan dana berhasil dicatat." });
            setIsWithdrawFormOpen(false);
        } catch (error) {
            console.error("Error processing withdrawal:", error);
            toast({ title: 'Gagal Memproses Penarikan', variant: 'destructive' });
        }
    }
    
    const calculateGoalProgress = React.useCallback((goalId: string) => {
        return expenses
            .filter(e => e.savingGoalId === goalId)
            .reduce((sum, e) => sum + (e.baseAmount || e.amount), 0);
    }, [expenses]);
    
     const filteredTransactionsForGoal = React.useMemo(() => {
        if (!detailGoal) return [];
        return expenses
            .filter(e => e.savingGoalId === detailGoal.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, detailGoal]);

    const detailWallet = transactionDetail?.walletId ? wallets.find(w => w.id === transactionDetail.walletId) : null;

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat Tujuan Menabung...</div>
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
                    <Target className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Tujuan Menabung
                    </h1>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <SavingGoalsTracker 
                    goals={savingGoals} 
                    expenses={expenses}
                    onGoalClick={setDetailGoal}
                />
            </main>

            <SpeedDial mainIcon={<PlusCircle className="h-7 w-7" />}>
                <SpeedDialAction label="Menabung" onClick={handleOpenDepositForm}>
                    <PiggyBank className="h-5 w-5 text-blue-500" />
                </SpeedDialAction>
                <SpeedDialAction label="Tarik Dana" onClick={() => setIsWithdrawFormOpen(true)}>
                    <MinusCircle className="h-5 w-5 text-red-500" />
                </SpeedDialAction>
                <SpeedDialAction label="Tambah Tujuan" onClick={() => handleOpenGoalForm()}>
                    <Target className="h-5 w-5 text-green-500" />
                </SpeedDialAction>
            </SpeedDial>
            
            <AddSavingGoalForm
                isOpen={isAddGoalFormOpen}
                onOpenChange={setIsAddGoalFormOpen}
                onSubmit={handleSaveGoal}
                goalToEdit={editingGoal}
                isSubmitting={isSubmitting}
            />

            <AddExpenseForm
                isOpen={isAddExpenseFormOpen}
                onOpenChange={handleAddExpenseFormOpenChange}
                categories={categories}
                savingGoals={savingGoals}
                debts={debts}
                wallets={wallets}
                expenses={expenses}
                incomes={incomes}
                onSubmit={handleSaveDeposit}
                expenseToEdit={expenseToEdit}
            />

            <WithdrawFromGoalForm
                isOpen={isWithdrawFormOpen}
                onOpenChange={setIsWithdrawFormOpen}
                goals={savingGoals}
                wallets={wallets}
                expenses={expenses}
                incomes={incomes}
                onSubmit={handleWithdrawal}
            />

            <Dialog open={!!detailGoal} onOpenChange={(open) => !open && setDetailGoal(null)} modal={false}>
                <DialogContent className="h-full flex flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <DialogTitle className="font-headline">{detailGoal?.name}</DialogTitle>
                        <DialogDescription>
                            Detail dan riwayat transaksi untuk tujuan ini.
                        </DialogDescription>
                    </DialogHeader>
                     {detailGoal && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-secondary rounded-md">
                                    <p className="text-muted-foreground">Dana Terkumpul</p>
                                    <p className="font-bold text-primary">{formatCurrency(calculateGoalProgress(detailGoal.id))}</p>
                                </div>
                                <div className="p-3 bg-secondary rounded-md">
                                    <p className="text-muted-foreground">Target</p>
                                    <p className="font-bold">{formatCurrency(detailGoal.targetAmount)}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Riwayat Transaksi</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Jenis</TableHead>
                                            <TableHead className="text-right">Jumlah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTransactionsForGoal.length > 0 ? (
                                            filteredTransactionsForGoal.map(t => (
                                                <TableRow key={t.id} onClick={() => setTransactionDetail(t)} className="cursor-pointer">
                                                    <TableCell>{format(t.date, "d MMM yyyy", { locale: idLocale })}</TableCell>
                                                    <TableCell>{t.amount > 0 ? "Setoran" : "Penarikan"}</TableCell>
                                                    <TableCell className={`text-right font-medium ${t.amount > 0 ? 'text-green-600' : 'text-destructive'}`}>
                                                        {formatCurrency(t.baseAmount || t.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center h-24">Belum ada riwayat transaksi.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="p-6 border-t flex justify-end gap-2">
                        <Button variant="destructive" onClick={() => {if(detailGoal) handleUpdateGoals(savingGoals.filter(g => g.id !== detailGoal.id)); setDetailGoal(null);}}>Hapus</Button>
                        <Button variant="outline" onClick={() => {if(detailGoal) handleOpenGoalForm(detailGoal)}}>Ubah</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={!!transactionDetail} onOpenChange={(open) => !open && setTransactionDetail(null)} modal={false}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Detail Transaksi Tabungan</DialogTitle>
                </DialogHeader>
                {transactionDetail && (
                  <div className="space-y-4 py-2">
                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-sm text-muted-foreground">Jumlah</p>
                      <p className={cn("text-2xl font-bold", transactionDetail.amount > 0 ? 'text-green-600' : 'text-destructive')}>
                          {formatCurrency(transactionDetail.amount)}
                      </p>
                       {transactionDetail.adminFee && transactionDetail.adminFee > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                              (Pokok: {formatCurrency(transactionDetail.baseAmount || 0)} + Admin: {formatCurrency(transactionDetail.adminFee)})
                          </p>
                      )}
                    </div>
                    <div className="space-y-3 pt-2 text-sm">
                        <div className="flex items-start gap-3">
                            <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Tanggal</p>
                                <p className="font-medium">{format(new Date(transactionDetail.date), "EEEE, d MMMM yyyy, HH:mm", { locale: idLocale })}</p>
                            </div>
                        </div>
                        {detailWallet && (
                          <div className="flex items-start gap-3">
                              <WalletIcon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                              <div>
                                  <p className="text-xs text-muted-foreground">Sumber Dana</p>
                                  <p className="font-medium">{detailWallet.name}</p>
                              </div>
                          </div>
                        )}
                        {transactionDetail.notes && (
                            <div className="flex items-start gap-3">
                                <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Catatan</p>
                                    <p className="font-medium whitespace-pre-wrap">{transactionDetail.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

        </div>
    );
}

    

    