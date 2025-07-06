
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Expense, SavingGoal, BudgetPeriod, Income, Reminder, Wallet, RecurringTransaction } from '@/lib/types';
import AllocationPage from '@/components/AllocationPage';
import DashboardPage from '@/components/DashboardPage';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, getDocs, writeBatch, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { awardAchievement } from '@/lib/achievements-manager';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, FileText, Wallet as WalletIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddIncomeForm } from '@/components/AddIncomeForm';
import { awardUserXp } from './achievements/actions';
import { ToastAction } from '@/components/ui/toast';
import { presetWallets } from '@/lib/data';

// Helper to convert Firestore timestamps to JS Dates
const convertTimestamps = (data: any): any => {
  if (!data) return data;

  if (data?.toDate) {
    return data.toDate();
  }

  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }

  if (typeof data === 'object' && data !== null && !data._seconds) {
    const newObj: { [key: string]: any } = {};
    for (const key of Object.keys(data)) {
      newObj[key] = convertTimestamps(data[key]);
    }
    return newObj;
  }
  
  return data;
};


export default function Home() {
  const { user, loading: authLoading, achievements, idToken, reminders } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isBudgetSetup, setIsBudgetSetup] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [incomes, setIncomes] = React.useState<Income[]>([]);
  const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
  const [recurringTxs, setRecurringTxs] = React.useState<RecurringTransaction[]>([]);
  const [wallets, setWallets] = React.useState<Wallet[]>([]);
  const [income, setIncome] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // State for Income CRUD
  const [isAddIncomeFormOpen, setIsAddIncomeFormOpen] = React.useState(false);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);
  const [incomeToDelete, setIncomeToDelete] = React.useState<string | null>(null);
  const [detailIncome, setDetailIncome] = React.useState<Income | null>(null);
  const [hasShownReminderToast, setHasShownReminderToast] = React.useState(false);

  const uid = user?.uid;

  const processRecurringTransactions = React.useCallback(async (
    uid: string, 
    currentExpenses: Expense[],
    currentIncomes: Income[],
  ) => {
    try {
      const recurringSnapshot = await getDocs(collection(db, 'users', uid, 'recurringTransactions'));
      if (recurringSnapshot.empty) {
        return null;
      }
      
      const batch = writeBatch(db);
      const today = new Date();
      const newExpenses: Expense[] = [];
      const newIncomes: Income[] = [];
      let hasNewTransactions = false;

      recurringSnapshot.forEach(docSnap => {
        const transaction = { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as RecurringTransaction;
        const lastAddedDate = transaction.lastAdded;
        const dayOfMonth = transaction.dayOfMonth;
        
        const isDue = today.getDate() >= dayOfMonth;
        const alreadyAddedThisMonth = lastAddedDate && 
                                     lastAddedDate.getMonth() === today.getMonth() &&
                                     lastAddedDate.getFullYear() === today.getFullYear();
        
        if (isDue && !alreadyAddedThisMonth) {
          hasNewTransactions = true;
          const transactionDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);

          if (transaction.type === 'expense' && transaction.categoryId) {
            const newExpense: Expense = {
              id: `rec-exp-${transaction.id}-${Date.now()}`,
              amount: transaction.amount,
              baseAmount: transaction.baseAmount,
              adminFee: transaction.adminFee,
              categoryId: transaction.categoryId,
              walletId: transaction.walletId,
              date: transactionDate,
              notes: `(Otomatis) ${transaction.name}`,
            };
            newExpenses.push(newExpense);
          } else if (transaction.type === 'income') {
            const newIncome: Income = {
              id: `rec-inc-${transaction.id}-${Date.now()}`,
              amount: transaction.amount,
              baseAmount: transaction.baseAmount,
              adminFee: transaction.adminFee,
              walletId: transaction.walletId,
              date: transactionDate,
              notes: `(Otomatis) ${transaction.name}`,
            }
            newIncomes.push(newIncome);
          }
          
          const recurringDocRef = doc(db, 'users', uid, 'recurringTransactions', transaction.id);
          batch.update(recurringDocRef, { lastAdded: today });
        }
      });
      
      if (hasNewTransactions) {
        const budgetDocRef = doc(db, 'users', uid, 'budgets', 'current');
        const updatedExpenses = [...currentExpenses, ...newExpenses];
        const updatedIncomes = [...currentIncomes, ...newIncomes];
        
        batch.update(budgetDocRef, {
          expenses: updatedExpenses,
          incomes: updatedIncomes,
        });

        await batch.commit();
        
        return { updatedExpenses, updatedIncomes };
      }
      
      return null;

    } catch (error) {
      console.error("Error processing recurring transactions:", error);
      toast({
        title: "Gagal Memproses Transaksi Otomatis",
        description: "Terjadi kesalahan saat menambahkan transaksi berulang.",
        variant: "destructive"
      });
      return null;
    }

  }, [toast]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!uid) {
      router.push('/login');
      return;
    }

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const budgetDocRef = doc(db, 'users', uid, 'budgets', 'current');
        const budgetDocSnap = await getDoc(budgetDocRef);

        if (budgetDocSnap.exists()) {
          const data = convertTimestamps(budgetDocSnap.data());
          
          const recurringResult = await processRecurringTransactions(
            uid, 
            data.expenses || [],
            data.incomes || [],
          );
          
          const finalExpenses = recurringResult ? recurringResult.updatedExpenses : (data.expenses || []);
          const finalIncomes = recurringResult ? recurringResult.updatedIncomes : (data.incomes || []);

          if (recurringResult) {
            toast({
                title: "Transaksi Otomatis Ditambahkan",
                description: "Beberapa transaksi berulang telah ditambahkan ke anggaran Anda."
            })
          }

          setCategories(data.categories || []);
          setIncome(data.income || 0);
          setExpenses(finalExpenses);
          setIncomes(finalIncomes);
          setIsBudgetSetup(true);

        } else {
          setIsBudgetSetup(false);
        }

        const goalsQuerySnapshot = await getDocs(collection(db, 'users', uid, 'savingGoals'));
        const goals = goalsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavingGoal[];
        setSavingGoals(goals);
        
        const recurringQuery = query(collection(db, 'users', uid, 'recurringTransactions'));
        const recurringSnapshot = await getDocs(recurringQuery);
        setRecurringTxs(recurringSnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }) as RecurringTransaction));
        
        const walletsSnapshot = await getDocs(collection(db, 'users', uid, 'wallets'));
        const walletsData = walletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Wallet[];
        setWallets(walletsData);

      } catch (error: any) {
        console.error("Failed to load initial data:", error);
        toast({ title: 'Gagal Memuat Data', description: `Error: ${error.message}`, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [uid, authLoading, router, toast, processRecurringTransactions]);

  React.useEffect(() => {
      if (reminders.length > 0 && !hasShownReminderToast) {
          const today = new Date();
          today.setHours(23, 59, 59, 999); // Check for anything due by the end of today
          
          const dueReminders = reminders.filter(r => !r.isPaid && new Date(r.dueDate) <= today);

          if (dueReminders.length > 0) {
              toast({
                  title: `🔔 Anda memiliki ${dueReminders.length} Pengingat Pembayaran`,
                  description: `Tagihan untuk "${dueReminders[0].name}"${dueReminders.length > 1 ? ' dan lainnya' : ''} sudah atau akan jatuh tempo.`,
                  action: (
                      <ToastAction altText="Lihat" onClick={() => router.push('/reminders')}>
                          Lihat
                      </ToastAction>
                  ),
                  duration: 8000,
              });
              setHasShownReminderToast(true); // Ensure it only shows once per session
          }
      }
  }, [reminders, hasShownReminderToast, toast, router]);

  const handleSaveBudget = async (data: { income: number; categories: Category[] }) => {
    if (!user || !idToken) return;
    const batch = writeBatch(db);
    const walletsCollectionRef = collection(db, 'users', user.uid, 'wallets');

    try {
        const budgetData = {
            income: data.income,
            categories: data.categories,
            expenses: [],
            incomes: [],
            periodStart: new Date().toISOString(),
            periodEnd: null,
        };
        
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
        batch.set(budgetDocRef, budgetData);

        // Check if wallets already exist before creating presets
        const walletsSnapshot = await getDocs(walletsCollectionRef);
        if (walletsSnapshot.empty) {
            // Only create preset wallets if none exist.
            // This prevents overwriting existing wallets on subsequent budget setups.
            presetWallets.forEach(walletPreset => {
                const walletId = `wallet-preset-${walletPreset.name.toLowerCase().replace(/\s/g, '-')}`;
                const walletDocRef = doc(db, 'users', user.uid, 'wallets', walletId);
                batch.set(walletDocRef, {
                    name: walletPreset.name,
                    icon: walletPreset.icon,
                    initialBalance: 0,
                });
            });
        }
        
        await batch.commit();

        setIncome(data.income);
        setCategories(data.categories);
        setExpenses([]);
        setIncomes([]);
        // Re-fetch wallets to get the new ones
        const updatedWalletsSnapshot = await getDocs(collection(db, 'users', user.uid, 'wallets'));
        setWallets(updatedWalletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Wallet[]);

        setIsBudgetSetup(true);
        toast({
            title: 'Anggaran Disimpan!',
            description: 'Anda sekarang dapat mulai melacak pengeluaran Anda.',
        });
        await awardAchievement(user.uid, 'first-step', achievements, idToken);
        if (idToken) await awardUserXp(100, idToken);

    } catch (error) {
        console.error("Failed to save budget:", error);
        toast({ title: 'Gagal Menyimpan Anggaran', variant: 'destructive' });
    }
  };
  
  const handleExpensesUpdate = async (updatedExpenses: Expense[]) => {
    if (!user) return;
    const isNewExpense = updatedExpenses.length > expenses.length;
    
    // Part 1: Critical Path - Save to DB and update local state
    try {
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
        const sortedExpenses = updatedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        await updateDoc(budgetDocRef, { expenses: sortedExpenses });
        setExpenses(sortedExpenses);

        // Part 2: Non-critical gamification.
        // This runs in the background and won't block the UI or crash the main flow.
        if (isNewExpense && idToken) {
            const tokenForGamification = idToken;
            
            (async () => {
                try {
                    await awardUserXp(50, tokenForGamification);
                    
                    const newExpense = sortedExpenses.find(e => !expenses.some(old => old.id === e.id));
                    const savingsCategoryId = categories.find(c => c.name === "Tabungan & Investasi")?.id;
                    const hasSavingsAchievement = achievements.some(a => a.badgeId === 'investor-rookie');

                    if (newExpense && newExpense.categoryId === savingsCategoryId && !hasSavingsAchievement) {
                        await awardAchievement(user.uid, 'investor-rookie', achievements, tokenForGamification);
                    }

                    const expenseCount = sortedExpenses.length;
                    if (expenseCount > 0) await awardAchievement(user.uid, 'first-expense', achievements, tokenForGamification);
                    if (expenseCount >= 10) await awardAchievement(user.uid, 'ten-expenses', achievements, tokenForGamification);
                    if (expenseCount >= 50) await awardAchievement(user.uid, 'fifty-expenses', achievements, tokenForGamification);
                    if (expenseCount >= 100) await awardAchievement(user.uid, 'hundred-expenses', achievements, tokenForGamification);
                } catch (error) {
                    console.error("Gamification background task failed:", error);
                    // This error is caught silently and won't affect the user experience.
                }
            })();
        }
    } catch (error) {
        console.error("Failed to save expense:", error);
        toast({ title: 'Gagal Menyimpan Transaksi', description: 'Terjadi kesalahan saat menyimpan data ke database.', variant: 'destructive' });
    }
  };
  
  const handleIncomesUpdate = async (updatedIncomes: Income[]) => {
    if (!user) return;
    const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
    const sortedIncomes = updatedIncomes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await updateDoc(budgetDocRef, { incomes: sortedIncomes });
    setIncomes(sortedIncomes);
  };

  const handleSaveIncome = async (incomeData: Income) => {
    const isEditing = incomes.some(i => i.id === incomeData.id);
    let updatedIncomes;

    if (isEditing) {
      updatedIncomes = incomes.map(i => i.id === incomeData.id ? incomeData : i);
    } else {
      updatedIncomes = [...incomes, incomeData];
    }
    
    await handleIncomesUpdate(updatedIncomes);
    
    toast({ title: 'Sukses', description: `Pemasukan berhasil ${isEditing ? 'diperbarui' : 'ditambahkan'}.` });
    setIsAddIncomeFormOpen(false);
    setEditingIncome(null);
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setIsAddIncomeFormOpen(true);
  };
  
  const handleDeleteIncomeRequest = (incomeId: string) => {
    setIncomeToDelete(incomeId);
  };

  const confirmDeleteIncome = async () => {
    if (!incomeToDelete) return;
    const updatedIncomes = incomes.filter(i => i.id !== incomeToDelete);
    await handleIncomesUpdate(updatedIncomes);
    toast({ title: "Sukses", description: "Pemasukan berhasil dihapus." });
    setIncomeToDelete(null);
  };

  const handleIncomeFormOpenChange = (open: boolean) => {
      if (!open) {
          setEditingIncome(null);
      }
      setIsAddIncomeFormOpen(open);
  }

  const handleSavingGoalsUpdate = async (updatedGoals: SavingGoal[]) => {
    if (!user || !idToken) return;
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
      if (idToken) await awardUserXp(50, idToken);
    }
  }

  const handleReset = async () => {
    if (!user || !idToken) return;

    const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
    const budgetDocSnap = await getDoc(budgetDocRef);

    if (budgetDocSnap.exists()) {
        const currentData = budgetDocSnap.data() as BudgetPeriod;
        const currentExpenses = currentData.expenses || [];
        const currentIncomes = currentData.incomes || [];

        const batch = writeBatch(db);

        // Calculate final balances and prepare wallet updates
        wallets.forEach(wallet => {
            const totalIncome = currentIncomes
                .filter(i => i.walletId === wallet.id)
                .reduce((sum, i) => sum + i.amount, 0);
            const totalExpense = currentExpenses
                .filter(e => e.walletId === wallet.id)
                .reduce((sum, e) => sum + e.amount, 0);
            const finalBalance = wallet.initialBalance + totalIncome - totalExpense;

            const walletDocRef = doc(db, 'users', user.uid, 'wallets', wallet.id);
            batch.update(walletDocRef, { initialBalance: finalBalance });
        });

        const totalExpensesValue = currentExpenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
        const totalAddedIncomes = currentIncomes.reduce((sum: number, inc: Income) => sum + inc.amount, 0);
        const totalIncomeValue = currentData.income + totalAddedIncomes;
        const remainingBudgetValue = totalIncomeValue - totalExpensesValue;

        const archivedPeriod = {
            ...currentData,
            periodEnd: new Date().toISOString(),
            totalIncome: totalIncomeValue,
            totalExpenses: totalExpensesValue,
            remainingBudget: remainingBudgetValue,
        };

        if (currentData.income > 0 && (remainingBudgetValue / currentData.income) >= 0.2) {
            await awardAchievement(user.uid, 'super-saver', achievements, idToken);
        }
        
        try {
            const archiveDocRef = doc(collection(db, 'users', user.uid, 'archivedBudgets'));
            batch.set(archiveDocRef, archivedPeriod);
            batch.delete(budgetDocRef);

            await batch.commit();
            
            setIncome(0);
            setCategories([]);
            setExpenses([]);
            setIncomes([]);
            setIsBudgetSetup(false);
            
            toast({ title: 'Periode Baru Dimulai', description: 'Saldo dompet telah diperbarui dan data lama diarsipkan.' });
        } catch (error) {
             console.error("Error resetting budget:", error);
            toast({ title: 'Error', description: 'Gagal mengarsipkan data dan memperbarui saldo.', variant: 'destructive' });
        }
    }
  };
  
  const totalWalletBalance = React.useMemo(() => {
    const totalInitial = wallets.reduce((sum, w) => sum + w.initialBalance, 0);
    const totalAddedIncomesToWallets = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpensesFromWallets = expenses.reduce((sum, e) => sum + e.amount, 0);
    return totalInitial + totalAddedIncomesToWallets - totalExpensesFromWallets;
  }, [wallets, incomes, expenses]);


  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-secondary">
        <div className="text-lg font-semibold text-primary">Memuat Aplikasi...</div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  if (!isBudgetSetup) {
    return <AllocationPage onSave={handleSaveBudget} />;
  }

  const detailIncomeWallet = detailIncome?.walletId ? wallets.find(w => w.id === detailIncome.walletId) : null;

  return (
    <>
        <DashboardPage 
            key={JSON.stringify(categories) + income + JSON.stringify(savingGoals) + JSON.stringify(wallets) + JSON.stringify(incomes)} 
            categories={categories} 
            expenses={expenses}
            income={income}
            incomes={incomes}
            totalWalletBalance={totalWalletBalance}
            savingGoals={savingGoals}
            reminders={reminders}
            recurringTxs={recurringTxs}
            wallets={wallets}
            onExpensesUpdate={handleExpensesUpdate}
            onReset={handleReset}
            onSavingGoalsUpdate={handleSavingGoalsUpdate}
            onEditIncome={handleEditIncome}
            onDeleteIncome={handleDeleteIncomeRequest}
            onViewIncome={setDetailIncome}
            onAddIncomeClick={() => setIsAddIncomeFormOpen(true)}
        />
        <AddIncomeForm 
            isOpen={isAddIncomeFormOpen}
            onOpenChange={handleIncomeFormOpenChange}
            onSubmit={handleSaveIncome}
            incomeToEdit={editingIncome}
            wallets={wallets}
            expenses={expenses}
            incomes={incomes}
        />
        <AlertDialog open={!!incomeToDelete} onOpenChange={(open) => !open && setIncomeToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan menghapus catatan pemasukan secara permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIncomeToDelete(null)}>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteIncome}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!detailIncome} onOpenChange={(open) => !open && setDetailIncome(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Detail Pemasukan</DialogTitle>
                </DialogHeader>
                {detailIncome && (
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg bg-secondary p-4">
                            <p className="text-sm text-muted-foreground">Jumlah</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(detailIncome.amount)}</p>
                            {detailIncome.adminFee && detailIncome.adminFee > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    (Pokok: {formatCurrency(detailIncome.baseAmount || 0)} - Potongan: {formatCurrency(detailIncome.adminFee)})
                                </p>
                            )}
                        </div>
                        <div className="space-y-3 pt-2">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Tanggal</p>
                                    <p className="font-medium">{format(new Date(detailIncome.date), "EEEE, d MMMM yyyy, HH:mm", { locale: idLocale })}</p>
                                </div>
                            </div>
                            {detailIncomeWallet && (
                                <div className="flex items-start gap-3">
                                    <WalletIcon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Masuk ke</p>
                                        <p className="font-medium">{detailIncomeWallet.name}</p>
                                    </div>
                                </div>
                            )}
                            {detailIncome.notes && (
                                <div className="flex items-start gap-3">
                                    <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Catatan</p>
                                        <p className="font-medium whitespace-pre-wrap">{detailIncome.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </>
  );
}
