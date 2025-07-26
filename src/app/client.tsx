
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Expense, SavingGoal, BudgetPeriod, Income, Reminder, Wallet, RecurringTransaction, BudgetCategory } from '@/lib/types';
import AllocationPage from '@/components/AllocationPage';
import DashboardPage from '@/components/DashboardPage';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, deleteDoc, getDocs, writeBatch, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
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
import { presetCategories, presetWallets } from '@/lib/data';

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

  const [isDataSetup, setIsDataSetup] = React.useState<boolean | undefined>(undefined);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [budgetPeriod, setBudgetPeriod] = React.useState<BudgetPeriod>({
    categoryBudgets: [],
    expenses: [],
    incomes: [],
    periodStart: new Date().toISOString(),
    income: 0
  });
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [incomes, setIncomes] = React.useState<Income[]>([]);
  const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
  const [recurringTxs, setRecurringTxs] = React.useState<RecurringTransaction[]>([]);
  const [wallets, setWallets] = React.useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
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
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

        // This is the main gatekeeper. If the user document doesn't exist, they are a new user.
        if (!userDocSnap.exists()) {
            setIsDataSetup(false);
            setIsLoading(false);
            return;
        }

        // If we reach here, the user is considered "existing".
        setIsDataSetup(true);

        // Fetch all master data collections
        const categoriesSnapshot = await getDocs(collection(db, 'users', uid, 'categories'));
        const walletsSnapshot = await getDocs(collection(db, 'users', uid, 'wallets'));
        const goalsQuerySnapshot = await getDocs(collection(db, 'users', uid, 'savingGoals'));
        const recurringSnapshot = await getDocs(query(collection(db, 'users', uid, 'recurringTransactions')));

        const masterCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Category);
        setCategories(masterCategories);
        setWallets(walletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Wallet));
        setSavingGoals(goalsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavingGoal[]);
        setRecurringTxs(recurringSnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }) as RecurringTransaction));

        // Now, safely load or create the budget document
        const budgetDocRef = doc(db, 'users', uid, 'budgets', 'current');
        const budgetDocSnap = await getDoc(budgetDocRef);

        let currentExpenses: Expense[] = [];
        let currentIncomes: Income[] = [];
        
        if (budgetDocSnap.exists()) {
          const budgetData = convertTimestamps(budgetDocSnap.data()) as BudgetPeriod;
          let loadedBudget = budgetData;

          // Crucial check for old accounts: if categoryBudgets field is missing, create it without overwriting other data.
          if (!budgetData.categoryBudgets) {
            const newCategoryBudgets = masterCategories.map(c => ({ categoryId: c.id, budget: 0 }));
            await updateDoc(budgetDocRef, { categoryBudgets: newCategoryBudgets });
            loadedBudget = { ...budgetData, categoryBudgets: newCategoryBudgets };
          }
          
          setBudgetPeriod(loadedBudget);
          currentExpenses = loadedBudget.expenses || [];
          currentIncomes = loadedBudget.incomes || [];
        } else {
            // This case handles users who exist but have no budget document yet.
            const newBudgetPeriod: BudgetPeriod = {
                categoryBudgets: masterCategories.map(c => ({ categoryId: c.id, budget: 0 })),
                expenses: [],
                incomes: [],
                periodStart: new Date().toISOString(),
                income: 0,
            };
            await setDoc(budgetDocRef, newBudgetPeriod);
            setBudgetPeriod(newBudgetPeriod);
        }

        const recurringResult = await processRecurringTransactions(uid, currentExpenses, currentIncomes);
        
        const finalExpenses = recurringResult ? recurringResult.updatedExpenses : currentExpenses;
        const finalIncomes = recurringResult ? recurringResult.updatedIncomes : currentIncomes;
        
        if (recurringResult) {
            toast({
                title: "Transaksi Otomatis Ditambahkan",
                description: "Beberapa transaksi berulang telah ditambahkan ke anggaran Anda."
            })
        }
        
        setExpenses(finalExpenses);
        setIncomes(finalIncomes);

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

  const handleInitialSetup = async (data: { categories: Category[], wallets: Wallet[] }) => {
    if (!user || !idToken) return;
    const batch = writeBatch(db);
    
    try {
        const userDocRef = doc(db, 'users', user.uid);
        batch.set(userDocRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            xp: 0,
            level: 1,
            theme: 'default'
        });

        // Save Categories
        data.categories.forEach(category => {
            const categoryRef = doc(db, 'users', user.uid, 'categories', category.id);
            batch.set(categoryRef, { name: category.name, icon: category.icon, isEssential: !!category.isEssential, isDebtCategory: !!category.isDebtCategory });
        });
        
        // Save Wallets
        data.wallets.forEach(wallet => {
            const walletRef = doc(db, 'users', user.uid, 'wallets', wallet.id);
            batch.set(walletRef, { name: wallet.name, icon: wallet.icon, initialBalance: wallet.initialBalance });
        });
        
        // Create initial budget period
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
        const newBudgetPeriod: BudgetPeriod = {
            categoryBudgets: data.categories.map(c => ({ categoryId: c.id, budget: 0 })),
            expenses: [],
            incomes: [],
            periodStart: new Date().toISOString(),
            income: 0,
        };
        batch.set(budgetDocRef, newBudgetPeriod);

        await batch.commit();

        setCategories(data.categories);
        setWallets(data.wallets);
        setBudgetPeriod(newBudgetPeriod);
        setExpenses([]);
        setIncomes([]);
        
        setIsDataSetup(true);

        toast({
            title: 'Pengaturan Selesai!',
            description: 'Anda sekarang dapat mulai menggunakan Jaga Duit.',
        });
        await awardAchievement(user.uid, 'first-step', achievements, idToken);
        if (idToken) await awardUserXp(100, idToken);

    } catch (error) {
        console.error("Failed to save initial setup:", error);
        toast({ title: 'Gagal Menyimpan Pengaturan Awal', variant: 'destructive' });
    }
  };
  
  const handleExpensesUpdate = async (updatedExpenses: Expense[]) => {
    if (!user) return;
    const isNewExpense = updatedExpenses.length > expenses.length;
    
    try {
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
        const sortedExpenses = updatedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        await updateDoc(budgetDocRef, { expenses: sortedExpenses });
        setExpenses(sortedExpenses);

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
    if (!user || !idToken || !budgetPeriod) return;

    const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
    
    const totalAddedIncomes = (incomes || []).reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpensesValue = (expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    const baseBudget = (budgetPeriod.categoryBudgets || []).reduce((sum, cb) => sum + cb.budget, 0);
    const totalIncomeValue = baseBudget + totalAddedIncomes;
    const remainingBudgetValue = totalIncomeValue - totalExpensesValue;

    const archivedPeriod: BudgetPeriod & {id?: string} = {
        ...budgetPeriod,
        periodEnd: new Date().toISOString(),
        income: baseBudget,
        totalIncome: totalIncomeValue,
        totalExpenses: totalExpensesValue,
        remainingBudget: remainingBudgetValue,
    };
    
    const { income, ...archiveDataToSave } = archivedPeriod; // Exclude original 'income' from archived data as it's now baseBudget

    if (baseBudget > 0 && (remainingBudgetValue / baseBudget) >= 0.2) {
        await awardAchievement(user.uid, 'super-saver', achievements, idToken);
    }
    
    try {
        const batch = writeBatch(db);
        
        wallets.forEach(wallet => {
            const walletIncome = (incomes || []).filter(i => i.walletId === wallet.id).reduce((sum, i) => sum + i.amount, 0);
            const walletExpense = (expenses || []).filter(e => e.walletId === wallet.id).reduce((sum, e) => sum + e.amount, 0);
            const finalBalance = wallet.initialBalance + walletIncome - walletExpense;
            const walletDocRef = doc(db, 'users', user.uid, 'wallets', wallet.id);
            batch.update(walletDocRef, { initialBalance: finalBalance });
        });
        
        const archiveDocRef = doc(collection(db, 'users', user.uid, 'archivedBudgets'));
        batch.set(archiveDocRef, archiveDataToSave);
        
        // Create new period, inheriting budgets from the old one
        const newBudgetPeriod: BudgetPeriod = {
            categoryBudgets: budgetPeriod.categoryBudgets, // Carry over budgets
            expenses: [],
            incomes: [],
            periodStart: new Date().toISOString(),
            income: baseBudget
        };
        batch.set(budgetDocRef, newBudgetPeriod);

        await batch.commit();
        
        setBudgetPeriod(newBudgetPeriod);
        setExpenses([]);
        setIncomes([]);

        toast({ title: 'Periode Baru Dimulai', description: 'Saldo dompet telah diperbarui dan data lama diarsipkan.' });
    } catch (error) {
         console.error("Error resetting budget:", error);
        toast({ title: 'Error', description: 'Gagal mengarsipkan data dan memperbarui saldo.', variant: 'destructive' });
    }
  };
  
  const totalWalletBalance = React.useMemo(() => {
    const totalInitial = wallets.reduce((sum, w) => sum + w.initialBalance, 0);
    const totalAddedIncomesToWallets = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpensesFromWallets = expenses.reduce((sum, e) => sum + e.amount, 0);
    return totalInitial + totalAddedIncomesToWallets - totalExpensesFromWallets;
  }, [wallets, incomes, expenses]);

  const baseBudget = React.useMemo(() => {
    return (budgetPeriod?.categoryBudgets || []).reduce((sum, cb) => sum + cb.budget, 0);
  }, [budgetPeriod]);

  if (authLoading || isLoading || isDataSetup === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-secondary">
        <div className="text-lg font-semibold text-primary">Memuat Aplikasi...</div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }

  if (!isDataSetup) {
    return <AllocationPage onSave={handleInitialSetup} />;
  }

  const detailIncomeWallet = detailIncome?.walletId ? wallets.find(w => w.id === detailIncome.walletId) : null;

  return (
    <>
        <DashboardPage 
            key={JSON.stringify(categories) + JSON.stringify(budgetPeriod) + JSON.stringify(savingGoals) + JSON.stringify(wallets) + JSON.stringify(incomes)} 
            categories={categories} 
            expenses={expenses}
            income={baseBudget}
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
