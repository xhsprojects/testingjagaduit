
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Expense, SavingGoal, BudgetPeriod, Income, Reminder, Wallet, RecurringTransaction } from '@/lib/types';
import DashboardPage from '@/components/DashboardPage';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, getDocs, writeBatch, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { awardAchievement } from '@/lib/achievements-manager';
import { format, isSameMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, FileText, Wallet as WalletIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddIncomeForm } from '@/components/AddIncomeForm';
import { awardUserXp } from './achievements/actions';
import { ToastAction } from '@/components/ui/toast';
import OnboardingPage from './onboarding/page';
import { Loader2 } from 'lucide-react';
import { resetBudgetPeriod } from './budget/actions';
import { useAuth } from '@/context/AuthContext';
import { updateTransaction, deleteTransaction } from '@/app/history/actions';

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


export default function ClientPage() {
  const { user, loading: authLoading, achievements, idToken, reminders } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isDataSetup, setIsDataSetup] = React.useState(true);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
  const [allIncomes, setAllIncomes] = React.useState<Income[]>([]);
  const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
  const [recurringTxs, setRecurringTxs] = React.useState<RecurringTransaction[]>([]);
  const [wallets, setWallets] = React.useState<Wallet[]>([]);
  const [currentBudget, setCurrentBudget] = React.useState<BudgetPeriod | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // State for Income CRUD
  const [isAddIncomeFormOpen, setIsAddIncomeFormOpen] = React.useState(false);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);
  const [incomeToDelete, setIncomeToDelete] = React.useState<string | null>(null);
  const [detailIncome, setDetailIncome] = React.useState<Income | null>(null);
  const [hasShownReminderToast, setHasShownReminderToast] = React.useState(false);
  const [showArchiveAlert, setShowArchiveAlert] = React.useState(false);

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
        const lastAddedDate = transaction.lastAdded ? new Date(transaction.lastAdded) : null;
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
  
  const loadData = React.useCallback(async () => {
    if (!uid) return;
    setIsLoading(true);

    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
        setIsDataSetup(false);
        setIsLoading(false);
        return; 
    }

    setIsDataSetup(true);
    
    // This listener will react to changes in both current budget and archived budgets.
    const setupListeners = () => {
      const unsubscribes: (() => void)[] = [];

      const walletsUnsubscribe = onSnapshot(collection(db, 'users', uid, 'wallets'), snap => setWallets(snap.docs.map(d => ({id: d.id, ...d.data()}) as Wallet)));
      const goalsUnsubscribe = onSnapshot(collection(db, 'users', uid, 'savingGoals'), snap => setSavingGoals(snap.docs.map(d => ({id: d.id, ...d.data()}) as SavingGoal)));
      const recurringUnsubscribe = onSnapshot(collection(db, 'users', uid, 'recurringTransactions'), snap => setRecurringTxs(snap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) }) as RecurringTransaction)));
      
      unsubscribes.push(walletsUnsubscribe, goalsUnsubscribe, recurringUnsubscribe);
      
      const budgetCollectionGroupQuery = query(collection(db, 'users', uid, 'budgets'));
      const archivedBudgetsCollectionQuery = query(collection(db, 'users', uid, 'archivedBudgets'));

      const handleSnapshots = async () => {
          const [currentSnap, archivedSnaps] = await Promise.all([
              getDoc(doc(db, 'users', uid, 'budgets', 'current')),
              getDocs(archivedBudgetsCollectionQuery)
          ]);
          
          let allAggregatedExpenses: Expense[] = [];
          let allAggregatedIncomes: Income[] = [];
          const categoryMap = new Map<string, Category>();

          if (currentSnap.exists()) {
              const currentData = convertTimestamps(currentSnap.data()) as BudgetPeriod;
              setCurrentBudget(currentData);
              allAggregatedExpenses.push(...(currentData.expenses || []));
              allAggregatedIncomes.push(...(currentData.incomes || []));
              (currentData.categories || []).forEach(cat => categoryMap.set(cat.id, cat));
          }

          archivedSnaps.forEach(docSnap => {
              const archivedData = convertTimestamps(docSnap.data()) as BudgetPeriod;
              allAggregatedExpenses.push(...(archivedData.expenses || []));
              allAggregatedIncomes.push(...(archivedData.incomes || []));
              (archivedData.categories || []).forEach(cat => {
                  if (!categoryMap.has(cat.id)) {
                      categoryMap.set(cat.id, cat);
                  }
              });
          });
          
          setAllExpenses(allAggregatedExpenses);
          setAllIncomes(allAggregatedIncomes);
          setCategories(Array.from(categoryMap.values()));

          if (currentSnap.exists()) {
              await processRecurringTransactions(uid, currentSnap.data().expenses || [], currentSnap.data().incomes || []);
          }
          
          setIsLoading(false);
      };

      const budgetUnsub = onSnapshot(budgetCollectionGroupQuery, handleSnapshots);
      const archiveUnsub = onSnapshot(archivedBudgetsCollectionQuery, handleSnapshots);
      
      unsubscribes.push(budgetUnsub, archiveUnsub);

      return () => unsubscribes.forEach(unsub => unsub());
    };
    
    return setupListeners();
  }, [uid, processRecurringTransactions]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!uid) {
      router.push('/login');
      return;
    }
    const cleanupPromise = loadData();
    return () => {
        cleanupPromise?.then(cleanup => {
            if (cleanup) {
                cleanup();
            }
        });
    };
  }, [uid, authLoading, router, loadData]);

  React.useEffect(() => {
    if (currentBudget?.periodStart) {
        const today = new Date();
        const periodStartDate = new Date(currentBudget.periodStart);
        if (today.getDate() === 1 && !isSameMonth(today, periodStartDate)) {
            setShowArchiveAlert(true);
        } else {
            setShowArchiveAlert(false);
        }
    }
  }, [currentBudget]);

  React.useEffect(() => {
      if (reminders.length > 0 && !hasShownReminderToast) {
          const today = new Date();
          today.setHours(23, 59, 59, 999); 
          
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
              setHasShownReminderToast(true); 
          }
      }
  }, [reminders, hasShownReminderToast, toast, router]);
  
  const handleExpensesUpdate = async (updatedExpenses: Expense[]) => {
    if (!user || !currentBudget) return;
    const isNewExpense = updatedExpenses.length > (currentBudget.expenses?.length || 0);
    
    try {
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
        const sortedExpenses = updatedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        await updateDoc(budgetDocRef, { expenses: sortedExpenses });
        
        if (isNewExpense && idToken) {
            const tokenForGamification = idToken;
            
            (async () => {
                try {
                    await awardUserXp(50, tokenForGamification);
                    
                    const newExpense = sortedExpenses.find(e => !(currentBudget.expenses || []).some(old => old.id === e.id));
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
  };

  const handleSaveIncome = async (incomeData: Income) => {
    const incomesInCurrentPeriod = currentBudget?.incomes || [];
    const isEditing = incomesInCurrentPeriod.some(i => i.id === incomeData.id);
    let updatedIncomes;

    if (isEditing) {
      updatedIncomes = incomesInCurrentPeriod.map(inc => inc.id === incomeData.id ? incomeData : inc);
    } else {
      updatedIncomes = [...incomesInCurrentPeriod, incomeData];
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
    const incomesInCurrentPeriod = currentBudget?.incomes || [];
    const updatedIncomes = incomesInCurrentPeriod.filter(i => i.id !== incomeToDelete);
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
    
    if (isNewGoal) {
      await awardAchievement(user.uid, 'first-goal', achievements, idToken);
      if (idToken) await awardUserXp(50, idToken);
    }
  }

  const handleReset = async () => {
    if (!idToken) {
      toast({ title: "Sesi tidak valid", variant: "destructive" });
      return;
    }
    const result = await resetBudgetPeriod(idToken);
    if (result.success) {
      toast({ title: "Sukses!", description: result.message });
      setShowArchiveAlert(false); // Hide the alert after resetting
    } else {
      toast({ title: "Gagal", description: result.message, variant: "destructive" });
    }
  };
  
  const totalWalletBalance = React.useMemo(() => {
    if (!currentBudget) return 0;
    const expensesInCurrent = currentBudget.expenses || [];
    const incomesInCurrent = currentBudget.incomes || [];
    
    return wallets.reduce((total, wallet) => {
        const totalIncomeForWallet = incomesInCurrent.filter(inc => inc.walletId === wallet.id).reduce((sum, inc) => sum + inc.amount, 0);
        const totalExpenseForWallet = expensesInCurrent.filter(e => e.walletId === wallet.id).reduce((sum, e) => sum + e.amount, 0);
        return total + wallet.initialBalance + totalIncomeForWallet - totalExpenseForWallet;
    }, 0);
  }, [wallets, currentBudget]);


  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-secondary">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-semibold text-primary">Memuat Dasbor Anda...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  if (!isDataSetup) {
    return <OnboardingPage onSetupComplete={loadData} />;
  }

  const detailIncomeWallet = detailIncome?.walletId ? wallets.find(w => w.id === detailIncome.walletId) : null;
  
  const expensesInCurrentPeriod = currentBudget?.expenses || [];
  const incomesInCurrentPeriod = currentBudget?.incomes || [];
  const incomeInCurrentPeriod = currentBudget?.income || 0;

  return (
    <>
        <DashboardPage 
            key={JSON.stringify(categories) + JSON.stringify(savingGoals) + JSON.stringify(wallets) + JSON.stringify(allIncomes) + JSON.stringify(allExpenses)} 
            categories={categories} 
            expenses={expensesInCurrentPeriod}
            income={incomeInCurrentPeriod}
            incomes={incomesInCurrentPeriod}
            totalWalletBalance={totalWalletBalance}
            savingGoals={savingGoals}
            reminders={reminders}
            recurringTxs={recurringTxs}
            wallets={wallets}
            budgetPeriod={currentBudget}
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
            expenses={allExpenses}
            incomes={allIncomes}
            categories={categories}
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
