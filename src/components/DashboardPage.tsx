
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Expense, SavingGoal, Debt, Income, Reminder, Wallet, RecurringTransaction, BudgetPeriod, SplitItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import { AddExpenseForm } from './AddExpenseForm';
import { AddIncomeForm } from './AddIncomeForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from './DateRangePicker';
import { startOfMonth, endOfMonth, format, endOfDay, subDays, isSameMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BookMarked, RefreshCw, LifeBuoy, Tag, Calendar, Landmark, FileText, CreditCard, MessageSquare, Bot, PlusCircle, Pencil, TrendingUp, TrendingDown, Edit, Trash2, Scale, Calculator, Repeat, BellRing, Wallet as WalletIcon, Trophy, CalendarDays, Upload, Users2, FilePenLine, Info, ArrowLeftRight, ChevronRight, GitCommitHorizontal, History, Target as TargetIcon, BookOpen, HandCoins } from 'lucide-react';
import Link from 'next/link';
import { SupportDialog } from './SupportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { iconMap } from '@/lib/icons';
import PredictiveAnalysis from './PredictiveAnalysis';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import FinancialChatbot from './FinancialChatbot';
import { SpeedDial, SpeedDialAction } from './SpeedDial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { ToastAction } from './ui/toast';
import WalletsSummaryCard from './WalletsSummaryCard';
import BudgetChart from '@/components/charts/BudgetChart';
import { Alert, AlertTitle } from './ui/alert';
import { updateTransaction, deleteTransaction } from '@/app/history/actions';

interface DashboardPageProps {
  categories: Category[];
  expenses: Expense[];
  income: number;
  incomes: Income[];
  totalWalletBalance: number;
  savingGoals: SavingGoal[];
  reminders: Reminder[];
  recurringTxs: RecurringTransaction[];
  wallets: Wallet[];
  budgetPeriod: BudgetPeriod | null;
  onExpensesUpdate: (expenses: Expense[]) => Promise<void>;
  onSavingGoalsUpdate: (goals: SavingGoal[]) => Promise<void>;
  onReset: () => Promise<void>;
  onEditIncome: (income: Income) => void;
  onDeleteIncome: (incomeId: string) => void;
  onViewIncome: (income: Income) => void;
  onAddIncomeClick: () => void;
}

type UnifiedTransaction = (Expense | Income) & {
  type: 'expense' | 'income';
};

const ActionCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { disabled?: boolean }>(
  ({ className, children, disabled, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "transition-colors text-center p-2 h-full flex flex-col justify-start items-center rounded-lg",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ActionCard.displayName = "ActionCard";

const TransactionItem = ({ transaction, categoryMap, walletMap, onClick }: { 
    transaction: UnifiedTransaction; 
    categoryMap: Map<string, Category>; 
    walletMap: Map<string, Wallet>;
    onClick: () => void;
}) => {
    const isExpense = transaction.type === 'expense';
    const isTransfer = categoryMap.get((transaction as Expense).categoryId || '')?.name === 'Transfer Antar Dompet';
    let Icon = isExpense ? Tag : TrendingUp;
    let title = transaction.notes || (isExpense ? 'Pengeluaran' : 'Pemasukan');
    const walletName = walletMap.get(transaction.walletId || '')?.name || 'Tanpa Dompet';
    const amount = transaction.baseAmount ?? transaction.amount;
    
    if (isExpense) {
        const expense = transaction as Expense;
        if (expense.isSplit && expense.splits && expense.splits.length > 0) {
            Icon = GitCommitHorizontal;
            title = expense.notes || `Split ke ${expense.splits.length} kategori`;
        } else if (expense.categoryId) {
            const category = categoryMap.get(expense.categoryId);
            if (category) {
                Icon = iconMap[category.icon] || Tag;
                title = expense.notes || category.name;
            }
        }
    }
     if (isTransfer) {
        Icon = ArrowLeftRight;
        title = transaction.notes || "Transfer Antar Dompet"
    }

    return (
        <div onClick={onClick} className="flex items-center gap-4 py-3 cursor-pointer border-b last:border-b-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary flex-shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 grid grid-cols-2 items-center gap-2 min-w-0">
                 <div className="flex-1">
                    <p className="font-semibold truncate pr-2 text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">{walletName}</p>
                 </div>
                <div className="text-right">
                    <p className={cn("font-semibold whitespace-nowrap text-sm", isExpense ? "text-foreground" : "text-green-600")}>
                        {isExpense ? '-' : '+'} {formatCurrency(amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(transaction.date), "d MMM, HH:mm", { locale: idLocale })}</p>
                </div>
            </div>
        </div>
    );
};

const allActions = [
    { href: "/reports", icon: BookMarked, label: "Laporan" },
    { href: "/import", icon: Upload, label: "Impor" },
    { href: "/split-bill", icon: Users2, label: "Bagi Bill" },
    { href: "/financial-calendar", icon: CalendarDays, label: "Kalender" },
    { href: "/reminders", icon: BellRing, label: "Pengingat" },
    { href: "/achievements", icon: Trophy, label: "Prestasi" },
    { href: "/calculators", icon: Calculator, label: "Kalkulator" },
    { href: "/recurring", icon: Repeat, label: "Otomatis" },
    { href: "/net-worth", icon: Scale, label: "Aset" },
    { href: "/notes", icon: FilePenLine, label: "Catatan" },
    { href: "/savings", icon: TargetIcon, label: "Tujuan" },
    { href: "/budget", icon: Landmark, label: "Anggaran" },
    { href: "/debts", icon: CreditCard, label: "Utang" },
    { href: "/wallets", icon: WalletIcon, label: "Dompet" },
    { href: "/history", icon: History, label: "Riwayat" },
    { href: "/tutorial", icon: BookOpen, label: "Panduan" },
];

export default function DashboardPage({ 
  categories, 
  expenses, 
  income,
  incomes,
  totalWalletBalance,
  savingGoals, 
  reminders,
  recurringTxs,
  wallets,
  budgetPeriod,
  onExpensesUpdate, 
  onSavingGoalsUpdate,
  onReset, 
  onEditIncome,
  onDeleteIncome,
  onViewIncome,
  onAddIncomeClick
}: DashboardPageProps) {
  const { user, isPremium, idToken } = useAuth();
  const router = useRouter();
  const [isAddExpenseFormOpen, setIsAddExpenseFormOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = React.useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [detailItem, setDetailItem] = React.useState<UnifiedTransaction | null>(null);
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const { toast } = useToast();
  const uid = user?.uid;

  const [hasShownReminderToast, setHasShownReminderToast] = React.useState(false);
  const [showArchiveAlert, setShowArchiveAlert] = React.useState(false);
  
  // Data loading guard: Wait until categories are properly populated.
  const isDataReady = categories && categories.length > 0;

  const dueEventsCount = React.useMemo(() => {
    const today = new Date();
    const todayEnd = endOfDay(today);
    const dayOfMonth = today.getDate();
    
    const dueReminders = (reminders || []).filter(r => !r.isPaid && new Date(r.dueDate) <= todayEnd).length;
    
    const dueRecurring = (recurringTxs || []).filter(tx => {
        const lastAdded = tx.lastAdded ? new Date(tx.lastAdded) : null;
        const alreadyAddedThisMonth = lastAdded && 
                                     lastAdded.getMonth() === today.getMonth() &&
                                     lastAdded.getFullYear() === today.getFullYear();
        return tx.dayOfMonth === dayOfMonth && !alreadyAddedThisMonth;
    }).length;

    return dueReminders + dueRecurring;
  }, [reminders, recurringTxs]);

  React.useEffect(() => {
    if (budgetPeriod?.periodStart) {
        const today = new Date();
        const periodStartDate = new Date(budgetPeriod.periodStart);
        // Show alert on the 1st day of the month if the budget hasn't been reset this month.
        if (today.getDate() === 1 && !isSameMonth(today, periodStartDate)) {
            setShowArchiveAlert(true);
        } else {
            setShowArchiveAlert(false);
        }
    }
  }, [budgetPeriod]);

  React.useEffect(() => {
      if ((reminders || []).length > 0 && !hasShownReminderToast && dueEventsCount > 0) {
          toast({
              title: `🔔 Anda memiliki ${dueEventsCount} Jadwal Keuangan Hari Ini`,
              description: `Cek Kalender Finansial untuk melihat detail tagihan dan transaksi otomatis Anda.`,
              action: (
                  <ToastAction altText="Lihat" onClick={() => router.push('/financial-calendar')}>
                      Lihat
                  </ToastAction>
              ),
              duration: 8000,
          });
          setHasShownReminderToast(true);
      }
  }, [reminders, recurringTxs, dueEventsCount, hasShownReminderToast, toast, router]);

  React.useEffect(() => {
    setDate({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    });
    const fetchDebts = async () => {
        if (!uid) return;
        const debtsSnapshot = await getDocs(collection(db, 'users', uid, 'debts'));
        setDebts(debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[]);
    }
    fetchDebts();
  }, [uid]);

  const categoryMap = React.useMemo(() => {
    if (!isDataReady) return new Map();
    return new Map(categories.map((cat) => [cat.id, cat]));
  }, [isDataReady, categories]);

  const walletMap = React.useMemo(() => {
    if (!wallets) return new Map();
    return new Map(wallets.map((w) => [w.id, w]));
  }, [wallets]);
  

  const filterByDateRange = (items: (Expense | Income)[], customDateRange?: DateRange) => {
     const range = customDateRange || date;
     return items.filter(item => {
      if (!range?.from) return true;
      const itemDate = new Date(item.date);
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0); // Start of day
      const to = range.to ? new Date(range.to) : from;
      to.setHours(23, 59, 59, 999); // End of day
      return itemDate >= from && itemDate <= to;
    });
  }

  const filteredExpenses = React.useMemo(() => filterByDateRange(expenses) as Expense[], [expenses, date]);
  const filteredIncomes = React.useMemo(() => filterByDateRange(incomes) as Income[], [incomes, date]);

  const savingsCategoryId = React.useMemo(() => {
    if (!isDataReady) return undefined;
    return categories.find(c => c.name === "Tabungan & Investasi")?.id;
  }, [isDataReady, categories]);

  const totalSavings = React.useMemo(() => {
    if (!savingsCategoryId) return 0;
    return filteredExpenses.reduce((sum, exp) => {
      if (exp.isSplit) {
          return sum + (exp.splits || []).filter(s => s.categoryId === savingsCategoryId).reduce((splitSum, s) => splitSum + s.amount, 0);
      }
      if (exp.categoryId === savingsCategoryId && exp.amount > 0) {
          return sum + exp.amount;
      }
      return sum;
    }, 0);
  }, [filteredExpenses, savingsCategoryId]);

  const periodLabel = React.useMemo(() => {
    if (!date?.from) return "Periode Ini";
    const fromStr = format(date.from, "d MMM yyyy", { locale: idLocale });
    const toStr = date.to ? format(date.to, "d MMM yyyy", { locale: idLocale }) : fromStr;
    if (fromStr === toStr) return fromStr;
    return `${fromStr} - ${toStr}`;
  }, [date]);

  const totalFilteredExpenses = React.useMemo(() => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0), [filteredExpenses]);
  const totalFilteredIncomes = React.useMemo(() => filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0), [filteredIncomes]);

  const remainingBudget = income - totalFilteredExpenses;
  
  const unifiedTransactions = React.useMemo(() => {
      const combined = [
          ...expenses.map(e => ({ ...e, type: 'expense' as const })),
          ...incomes.map(i => ({ ...i, type: 'income' as const })),
      ];
      return combined.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes]);


  const expensesByCategory = React.useMemo(() => {
      if (!isDataReady) return [];
      const dataMap = new Map((categories || []).filter(Boolean).map((cat) => [cat.id, { ...cat, spent: 0 }]));
      for (const expense of filteredExpenses) {
          if (expense.isSplit && expense.splits) {
              expense.splits.forEach(split => {
                  const categoryData = dataMap.get(split.categoryId);
                  if (categoryData) {
                      categoryData.spent += split.amount;
                  }
              });
          } else if (expense.categoryId && expense.amount > 0) {
              const categoryData = dataMap.get(expense.categoryId);
              if (categoryData) {
                  categoryData.spent += expense.amount;
              }
          }
      }
      return Array.from(dataMap.values());
  }, [filteredExpenses, categories, isDataReady]);

  const handleSaveExpense = async (expenseData: Expense) => {
    const isEditing = expenses.some(e => e.id === expenseData.id);
    let updatedExpenses;

    if (isEditing) {
      updatedExpenses = expenses.map(e => e.id === expenseData.id ? expenseData : e);
    } else {
      updatedExpenses = [...expenses, expenseData];
    }
    
    await onExpensesUpdate(updatedExpenses);
    
    toast({ title: 'Sukses', description: `Pengeluaran berhasil ${isEditing ? 'diperbarui' : 'ditambahkan'}.` });
    setIsAddExpenseFormOpen(false);
    setEditingExpense(null);
  };
  
  const handleViewDetails = (transaction: UnifiedTransaction) => {
    setDetailItem(transaction);
  };
  
  const handleResetClick = async () => {
    setIsResetting(true);
    await onReset();
    setIsResetting(false);
    setIsResetConfirmOpen(false);
  }

  const handleChatbotClick = () => {
    if (isPremium) {
      setIsChatbotOpen(true);
    } else {
      toast({
          title: "Fitur Premium",
          description: "Chatbot adalah fitur premium. Mengarahkan...",
      })
      router.push('/premium');
    }
  };
  
  const handleEditRequest = (item: UnifiedTransaction) => {
      setDetailItem(null);
      if (item.type === 'expense') {
          setEditingExpense(item as Expense);
          setIsAddExpenseFormOpen(true);
      } else {
          setEditingIncome(item as Income);
          onEditIncome(item as Income);
      }
  };
  
  const handleDeleteRequest = async (item: UnifiedTransaction) => {
      setDetailItem(null);
      if (!idToken) {
          toast({ title: "Sesi tidak valid.", variant: "destructive" });
          return;
      }
      const result = await deleteTransaction(idToken, 'current', item.id, item.type);
      if (result.success) {
          toast({ title: "Sukses", description: "Transaksi berhasil dihapus." });
      } else {
          toast({ title: "Gagal", description: result.message, variant: "destructive" });
      }
  };


  const detailCategory = detailItem?.type === 'expense' ? categoryMap.get((detailItem as Expense).categoryId) : null;
  const detailSavingGoal = detailItem?.type === 'expense' ? savingGoals.find(g => g.id === (detailItem as Expense).savingGoalId) : null;
  const detailDebt = detailItem?.type === 'expense' ? debts.find(d => d.id === (detailItem as Expense).debtId) : null;
  const detailWallet = detailItem?.walletId ? wallets.find(w => w.id === detailItem.walletId) : null;
  
  if (!isDataReady) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-secondary">
              <div className="text-lg font-semibold text-primary">Memuat Dasbor...</div>
          </div>
      );
  }


  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-20">
            {showArchiveAlert && (
                <Alert variant="destructive" className="animate-in fade-in-50">
                    <Info className="h-4 w-4" />
                    <AlertTitle className="font-bold">Saatnya Memulai Periode Anggaran Baru!</AlertTitle>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-1">
                        <p className="text-sm">
                            Arsipkan data bulan lalu untuk memulai pencatatan bulan ini dengan segar.
                        </p>
                        <Button size="sm" className="mt-2 sm:mt-0" onClick={() => setIsResetConfirmOpen(true)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Mulai Periode Baru
                        </Button>
                    </div>
                </Alert>
            )}
          <StatsCards
            totalIncome={totalFilteredIncomes}
            totalExpenses={totalFilteredExpenses}
            remainingBudget={remainingBudget}
            totalSavings={totalSavings}
            totalWalletBalance={totalWalletBalance}
            periodLabel={periodLabel}
            onReset={() => setIsResetConfirmOpen(true)}
          />

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Akses Cepat</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2">
                    {allActions.slice(0, 8).map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link href={action.href} key={action.href}>
                                <ActionCard>
                                    <div className="p-3 bg-secondary rounded-xl mb-1.5"><Icon className="h-6 w-6 text-primary" /></div>
                                    <p className="font-semibold text-xs leading-tight">{action.label}</p>
                                </ActionCard>
                            </Link>
                        );
                    })}
                </CardContent>
                <CardFooter>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">Lihat Semua Menu</Button>
                        </DialogTrigger>
                         <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
                            <DialogHeader className="p-6 pb-4 border-b">
                                <DialogTitle>Semua Menu</DialogTitle>
                                <DialogDescription>Akses cepat ke semua fitur Jaga Duit.</DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-4 gap-4 py-4">
                                    {allActions.map((action) => {
                                        const Icon = action.icon;
                                        return (
                                            <Link href={action.href} key={action.href}>
                                                <ActionCard>
                                                    <div className="p-3 bg-secondary rounded-xl mb-1.5"><Icon className="h-6 w-6 text-primary" /></div>
                                                    <p className="font-semibold text-xs leading-tight">{action.label}</p>
                                                </ActionCard>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Distribusi Pengeluaran</CardTitle>
                        <CardDescription>Kategori pengeluaran terbesar pada periode ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BudgetChart data={expensesByCategory} />
                    </CardContent>
                </Card>
                 <WalletsSummaryCard
                    wallets={wallets}
                    expenses={expenses}
                    incomes={incomes}
                />
            </div>
             <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-headline">Riwayat Transaksi</CardTitle>
                        <CardDescription>Daftar transaksi terbaru Anda.</CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/history">
                            Lihat Semua <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                 </CardHeader>
                 <CardContent>
                    {unifiedTransactions.length > 0 ? (
                        unifiedTransactions.slice(0, 5).map((transaction) => (
                           <TransactionItem 
                                key={transaction.id}
                                transaction={transaction}
                                categoryMap={categoryMap}
                                walletMap={walletMap}
                                onClick={() => handleViewDetails(transaction)}
                           />
                        ))
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Belum ada transaksi.
                        </div>
                    )}
                 </CardContent>
             </Card>

          <PredictiveAnalysis
              expenses={filteredExpenses}
              categories={categories}
              dateRange={date}
          />
        </main>

        <SpeedDial mainIcon={<HandCoins className="h-7 w-7" />} position="bottom-right">
           <SpeedDialAction label="Chat Konsultasi" onClick={handleChatbotClick}>
            <Bot className="h-5 w-5" />
          </SpeedDialAction>
          <SpeedDialAction label="Dukungan Aplikasi" onClick={() => setIsSupportDialogOpen(true)}>
            <LifeBuoy className="h-5 w-5" />
          </SpeedDialAction>
          <SpeedDialAction label="Tambah Pemasukan" onClick={onAddIncomeClick}>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </SpeedDialAction>
          <SpeedDialAction label="Tambah Pengeluaran" onClick={() => setIsAddExpenseFormOpen(true)}>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </SpeedDialAction>
        </SpeedDial>

        <SupportDialog
          isOpen={isSupportDialogOpen}
          onOpenChange={setIsSupportDialogOpen}
        />
        <AddExpenseForm
          isOpen={isAddExpenseFormOpen}
          onOpenChange={(open) => { if (!open) setEditingExpense(null); setIsAddExpenseFormOpen(open); }}
          categories={categories}
          savingGoals={savingGoals}
          debts={debts}
          wallets={wallets}
          expenses={expenses}
          incomes={incomes}
          onSubmit={handleSaveExpense}
          expenseToEdit={editingExpense}
        />
         
        <Dialog open={isChatbotOpen} onOpenChange={setIsChatbotOpen}>
          <DialogContent className="h-full w-full rounded-none border-none sm:h-[85vh] sm:max-w-lg sm:rounded-lg sm:border flex flex-col p-0 gap-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center gap-2 font-headline">
                <Bot className="h-6 w-6 text-primary" />
                Chat Konsultasi Keuangan
              </DialogTitle>
              <DialogDescription>Mengobrol dengan Jaga, asisten keuangan pribadi Anda.</DialogDescription>
            </DialogHeader>
            <FinancialChatbot />
          </DialogContent>
        </Dialog>
        
         <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
            <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>Detail Transaksi</DialogTitle>
                </DialogHeader>
                {detailItem && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="rounded-lg bg-secondary p-4">
                          <p className="text-sm text-muted-foreground">Jumlah</p>
                          <p className={cn("text-2xl font-bold", detailItem.type === 'income' ? 'text-green-600' : 'text-destructive')}>{formatCurrency(detailItem.amount)}</p>
                          {detailItem.adminFee && detailItem.adminFee > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                  {detailItem.type === 'expense' 
                                    ? `(Pokok: ${formatCurrency(detailItem.baseAmount || 0)} + Admin: ${formatCurrency(detailItem.adminFee)})`
                                    : `(Pokok: ${formatCurrency(detailItem.baseAmount || 0)} - Potongan: ${formatCurrency(detailItem.adminFee)})`
                                  }
                              </p>
                          )}
                        </div>
                        <div className="space-y-3 pt-2">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Tanggal</p>
                                    <p className="font-medium">{format(new Date(detailItem.date), "EEEE, d MMMM yyyy, HH:mm", { locale: idLocale })}</p>
                                </div>
                            </div>
                            {detailWallet && (
                              <div className="flex items-start gap-3">
                                  <WalletIcon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                  <div>
                                      <p className="text-xs text-muted-foreground">{detailItem.type === 'expense' ? 'Dibayar dari' : 'Masuk ke'}</p>
                                      <p className="font-medium">{detailWallet.name}</p>
                                  </div>
                              </div>
                            )}
                             {detailItem.type === 'expense' && (detailItem as Expense).isSplit ? (
                                <>
                                  <div className="flex items-start gap-3">
                                      <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                      <div>
                                          <p className="text-xs text-muted-foreground">Kategori</p>
                                          <p className="font-medium">Transaksi Split</p>
                                      </div>
                                  </div>
                                  <div className="pl-7 space-y-2">
                                    {((detailItem as Expense).splits || []).map((split, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm border-b pb-1">
                                            <span>{categoryMap.get(split.categoryId)?.name || 'N/A'}</span>
                                            <span className="font-semibold">{formatCurrency(split.amount)}</span>
                                        </div>
                                    ))}
                                  </div>
                                </>
                            ) : (
                                <div className="flex items-start gap-3">
                                    <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Kategori</p>
                                        <p className="font-medium">{detailCategory?.name || 'Pemasukan'}</p>
                                    </div>
                                </div>
                            )}
                            {detailSavingGoal && (
                                  <div className="flex items-start gap-3">
                                    <Landmark className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Tujuan Tabungan</p>
                                        <p className="font-medium">{detailSavingGoal.name}</p>
                                    </div>
                                </div>
                            )}
                            {detailDebt && (
                                  <div className="flex items-start gap-3">
                                    <CreditCard className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Pembayaran Utang</p>
                                        <p className="font-medium">{detailDebt.name}</p>
                                    </div>
                                </div>
                            )}
                            {detailItem.notes && (
                                <div className="flex items-start gap-3">
                                    <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Catatan</p>
                                        <p className="font-medium whitespace-pre-wrap">{detailItem.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <DialogFooter className="mt-auto border-t bg-background p-4 sm:p-6 flex justify-end gap-2">
                    <Button variant="ghost" className="text-destructive" onClick={() => detailItem && handleDeleteRequest(detailItem)}>Hapus</Button>
                    <Button onClick={() => detailItem && handleEditRequest(detailItem)}>Ubah</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Mulai Periode Anggaran Baru?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Tindakan ini akan mengarsipkan semua data dari periode saat ini (pemasukan, pengeluaran, dll.) dan mengatur ulang dasbor Anda. Anda dapat melihat data lama di halaman "Riwayat &amp; Arsip". Apakah Anda yakin?
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetClick} disabled={isResetting}>
                      {isResetting ? 'Mengarsipkan...' : 'Ya, Mulai Periode Baru'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
