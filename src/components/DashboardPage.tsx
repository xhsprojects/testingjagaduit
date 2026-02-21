
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Expense, SavingGoal, Debt, Income, Reminder, Wallet, RecurringTransaction, BudgetPeriod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import { AddExpenseForm } from './AddExpenseForm';
import { AddIncomeForm } from './AddIncomeForm';
import { TransferFundsForm } from './TransferFundsForm';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
    BookMarked, Bot, PlusCircle, TrendingUp, TrendingDown,
    Repeat, BellRing, Trophy, CalendarDays, Upload, Users2,
    ChevronRight, GitCommitHorizontal, Calculator, Wallet as WalletIcon, Tag,
    ArrowLeftRight, Scale, PiggyBank, CreditCard, LayoutGrid, Target, Landmark,
    BookOpen, FileText, Calendar, Info, Mic, Search, Trash2, Pencil, X
} from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { iconMap } from '@/lib/icons';
import PredictiveAnalysis from './PredictiveAnalysis';
import { useAuth } from '@/context/AuthContext';
import FinancialChatbot from './FinancialChatbot';
import { Card } from './ui/card';
import WalletsSummaryCard from './WalletsSummaryCard';
import BudgetChart from '@/components/charts/BudgetChart';
import { deleteTransaction, updateTransaction } from '@/app/history/actions';
import { format, subDays, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { SpeedDial, SpeedDialAction } from './SpeedDial';
import { Badge } from './ui/badge';

interface DashboardPageProps {
  categories: Category[];
  expenses: Expense[];
  income: number;
  incomes: Income[];
  totalWalletBalance: number;
  savingGoals: SavingGoal[];
  debts: Debt[];
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
  allExpenses: Expense[];
  allIncomes: Income[];
}

type UnifiedTransaction = (Expense | Income) & {
  type: 'income' | 'expense';
};

const QuickActionItem = ({ href, icon: Icon, label, onClick }: { href?: string, icon: React.ElementType, label: string, onClick?: () => void }) => {
    const content = (
        <div className="flex flex-col items-center gap-2 group cursor-pointer w-[64px] flex-shrink-0" onClick={onClick}>
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 group-hover:border-primary/50 group-hover:text-primary transition-all">
                <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center whitespace-nowrap uppercase tracking-tighter">{label}</span>
        </div>
    );

    if (href) return <Link href={href}>{content}</Link>;
    return content;
};

const TransactionItem = ({ transaction, categoryMap, walletMap, onClick }: { 
    transaction: UnifiedTransaction; 
    categoryMap: Map<string, Category>; 
    walletMap: Map<string, Wallet>;
    onClick: () => void;
}) => {
    const isExpense = transaction.type === 'expense';
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

    return (
        <div onClick={onClick} className="flex items-center justify-between py-4 cursor-pointer border-b last:border-b-0 group border-slate-50 dark:border-slate-800/50">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm shrink-0",
                    isExpense ? "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary group-hover:text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                )}>
                    {isExpense ? <Icon className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none mb-1 truncate">{title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{walletName}</p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-2">
                <p className={cn("text-sm font-bold whitespace-nowrap", isExpense ? "text-slate-800 dark:text-slate-100" : "text-primary")}>
                    {isExpense ? '-' : '+'} {formatCurrency(amount)}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                    {transaction.date ? format(new Date(transaction.date), "d MMM, HH:mm", { locale: idLocale }) : '-'}
                </p>
            </div>
        </div>
    );
};

export default function DashboardPage({ 
  categories, 
  expenses, 
  income,
  incomes,
  totalWalletBalance,
  savingGoals, 
  debts,
  reminders,
  recurringTxs,
  wallets,
  budgetPeriod,
  allExpenses,
  allIncomes,
  onReset
}: DashboardPageProps) {
  const { idToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isAddExpenseFormOpen, setIsAddExpenseFormOpen] = React.useState(false);
  const [isAddIncomeFormOpen, setIsAddIncomeFormOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);
  const [isTransferFormOpen, setIsTransferFormOpen] = React.useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = React.useState(false);
  const [detailItem, setDetailItem] = React.useState<UnifiedTransaction | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [historyTab, setHistoryTab] = React.useState<'all' | 'expense' | 'income'>('all');

  const isDataReady = Array.isArray(categories) && categories.length > 0;
  const categoryMap = React.useMemo(() => new Map(categories.map((cat) => [cat.id, cat])), [categories]);
  const walletMap = React.useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);
  
  const periodLabel = React.useMemo(() => {
    if (!budgetPeriod?.periodStart) return "Periode Ini";
    const from = new Date(budgetPeriod.periodStart);
    const to = budgetPeriod.periodEnd ? new Date(budgetPeriod.periodEnd) : new Date();
    return `${format(from, "d MMM", { locale: idLocale })} - ${format(to, "d MMM yyyy", { locale: idLocale })}`;
  }, [budgetPeriod]);

  const totalFilteredExpenses = React.useMemo(() => (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0), [expenses]);
  const totalFilteredIncomes = React.useMemo(() => (incomes || []).reduce((sum, inc) => sum + (inc.amount || 0), 0), [incomes]);
  const remainingBudget = (income || 0) - totalFilteredExpenses;
  
  const trendData = React.useMemo(() => {
      const now = new Date();
      const sevenDaysAgo = startOfDay(subDays(now, 7));
      
      const recentIncomes = allIncomes.filter(i => new Date(i.date) >= sevenDaysAgo);
      const recentExpenses = allExpenses.filter(e => new Date(e.date) >= sevenDaysAgo);
      
      const recentIncomeSum = recentIncomes.reduce((s, i) => s + i.amount, 0);
      const recentExpenseSum = recentExpenses.reduce((s, e) => s + e.amount, 0);
      
      const previousBalance = totalWalletBalance - recentIncomeSum + recentExpenseSum;
      const percentage = previousBalance === 0 ? 0 : ((totalWalletBalance - previousBalance) / previousBalance) * 100;
      
      return {
          percentage: percentage.toFixed(1),
          isPositive: percentage >= 0
      };
  }, [allIncomes, allExpenses, totalWalletBalance]);

  const unifiedTransactions = React.useMemo(() => {
      const combined = [
          ...(expenses || []).map(e => ({ ...e, type: 'expense' as const })),
          ...(incomes || []).map(i => ({ ...i, type: 'income' as const })),
      ];
      let filtered = combined;
      if (historyTab === 'expense') filtered = combined.filter(t => t.type === 'expense');
      if (historyTab === 'income') filtered = combined.filter(t => t.type === 'income');
      
      return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes, historyTab]);

  const expensesByCategory = React.useMemo(() => {
      if (!isDataReady) return [];
      const dataMap = new Map((categories || []).map((cat) => [cat.id, { ...cat, spent: 0 }]));
      for (const expense of (expenses || [])) {
          if (expense.isSplit && expense.splits) {
              expense.splits.forEach(split => {
                  const categoryData = dataMap.get(split.categoryId);
                  if (categoryData) categoryData.spent += split.amount;
              });
          } else if (expense.categoryId && (expense.amount || 0) > 0) {
              const categoryData = dataMap.get(expense.categoryId);
              if (categoryData) categoryData.spent += expense.amount;
          }
      }
      return Array.from(dataMap.values());
  }, [expenses, categories, isDataReady]);

  const handleSaveTransaction = async (data: Expense | Income, type: 'expense' | 'income') => {
    if (!idToken) return;
    const result = await updateTransaction(idToken, 'current', data, type);
    if (result.success) {
        toast({ title: 'Sukses', description: `Transaksi berhasil disimpan.` });
        setIsAddExpenseFormOpen(false);
        setIsAddIncomeFormOpen(false);
        setIsTransferFormOpen(false);
        setEditingExpense(null);
        setEditingIncome(null);
    } else {
        toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    }
  };
  
  const handleResetClick = async () => {
    setIsResetting(true);
    await onReset();
    setIsResetting(false);
    setIsResetConfirmOpen(false);
  }

  const handleDeleteRequest = async (item: UnifiedTransaction) => {
      if (!idToken) return;
      const result = await deleteTransaction(idToken, 'current', item.id, item.type);
      if (result.success) toast({ title: "Berhasil dihapus" });
      setDetailItem(null);
  };

  const handleEditClick = (item: UnifiedTransaction) => {
      setDetailItem(null);
      if (item.type === 'expense') {
          setEditingExpense(item as Expense);
          setIsAddExpenseFormOpen(true);
      } else {
          setEditingIncome(item as Income);
          setIsAddIncomeFormOpen(true);
      }
  };

  if (!isDataReady) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Bot className="h-8 w-8 animate-bounce text-primary" /></div>;
  }

  const allMenuItems = [
    { label: 'Laporan', icon: BookMarked, href: '/reports' },
    { label: 'Impor', icon: Upload, href: '/import' },
    { label: 'Bagi Bill', icon: Users2, href: '/split-bill' },
    { label: 'Kalender', icon: CalendarDays, href: '/financial-calendar' },
    { label: 'Pengingat', icon: BellRing, href: '/reminders' },
    { label: 'Prestasi', icon: Trophy, href: '/achievements' },
    { label: 'Kalkulator', icon: Calculator, href: '/calculators' },
    { label: 'Otomatis', icon: Repeat, href: '/recurring' },
    { label: 'Tujuan', icon: Target, href: '/savings' },
    { label: 'Anggaran', icon: Landmark, href: '/budget' },
    { label: 'Utang', icon: CreditCard, href: '/debts' },
    { label: 'Kekayaan', icon: Scale, href: '/net-worth' },
    { label: 'Dompet', icon: WalletIcon, href: '/wallets' },
    { label: 'Catatan', icon: BookOpen, href: '/notes' },
  ];

  const detailWallet = detailItem?.walletId ? walletMap.get(detailItem.walletId) : null;
  const expenseData = detailItem?.type === 'expense' ? (detailItem as Expense) : null;
  const detailSavingGoal = expenseData?.savingGoalId ? savingGoals.find(g => g.id === expenseData.savingGoalId) : null;
  const detailDebt = expenseData?.debtId ? (debts || []).find(d => d.id === expenseData.debtId) : null;
  const detailCategory = expenseData?.categoryId ? categoryMap.get(expenseData.categoryId) : null;
  const DetailCategoryIcon = detailCategory ? iconMap[detailCategory.icon as keyof typeof iconMap] : Tag;

  const isExpense = detailItem?.type === 'expense';
  const amountColor = isExpense ? "text-red-500" : "text-emerald-500";
  const badgeBg = isExpense ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500";
  const typeLabel = isExpense ? "Pengeluaran" : "Pemasukan";
  const walletLabel = isExpense ? "DIBAYAR DARI" : "MASUK KE";

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Header />
      
      <main className="pt-24 pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <div className="lg:col-span-2 space-y-8">
            <StatsCards
              totalIncome={totalFilteredIncomes}
              totalExpenses={totalFilteredExpenses}
              remainingBudget={remainingBudget}
              totalSavings={(expenses || []).filter(e => e.savingGoalId).reduce((s, e) => s + (e.amount || 0), 0)}
              totalWalletBalance={totalWalletBalance}
              periodLabel={periodLabel}
              trendPercentage={trendData.percentage}
              isTrendPositive={trendData.isPositive}
              onReset={() => setIsResetConfirmOpen(true)}
            />

            <section className="bg-transparent">
                <div className="flex justify-between items-center mb-4 px-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Akses Cepat</h3>
                    <button className="text-[10px] font-bold text-primary uppercase hover:underline" onClick={() => setIsMenuDialogOpen(true)}>Lihat Semua</button>
                </div>
                <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
                    <div className="flex space-x-5 min-w-max">
                        <QuickActionItem href="/reports" icon={BookMarked} label="Laporan" />
                        <QuickActionItem href="/import" icon={Upload} label="Impor" />
                        <QuickActionItem href="/split-bill" icon={Users2} label="Bagi Bill" />
                        <QuickActionItem href="/financial-calendar" icon={CalendarDays} label="Kalender" />
                        <QuickActionItem href="/reminders" icon={BellRing} label="Pengingat" />
                        <QuickActionItem href="/achievements" icon={Trophy} label="Prestasi" />
                        <QuickActionItem href="/calculators" icon={Calculator} label="Kalkulator" />
                        <QuickActionItem href="/recurring" icon={Repeat} label="Otomatis" />
                    </div>
                </div>
            </section>

            <div className="lg:hidden">
                <PredictiveAnalysis expenses={expenses} categories={categories} dateRange={{ from: new Date(budgetPeriod?.periodStart || Date.now()), to: budgetPeriod?.periodEnd ? new Date(budgetPeriod.periodEnd) : new Date() }} />
            </div>

            <Card className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex flex-col space-y-6 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Riwayat Transaksi</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Daftar transaksi terbaru Anda</p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10">
                        <Link href="/history" className="flex items-center">
                            Semua <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                    </Button>
                </div>
                
                <div className="flex space-x-2">
                    <button onClick={() => setHistoryTab('all')} className={cn("px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", historyTab === 'all' ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>Semua</button>
                    <button onClick={() => setHistoryTab('income')} className={cn("px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", historyTab === 'income' ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>Pemasukan</button>
                    <button onClick={() => setHistoryTab('expense')} className={cn("px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", historyTab === 'expense' ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>Pengeluaran</button>
                </div>
              </div>

              <div className="space-y-1">
                  {unifiedTransactions.length > 0 ? (
                      unifiedTransactions.slice(0, 8).map((t) => (
                          <TransactionItem key={t.id} transaction={t} categoryMap={categoryMap} walletMap={walletMap} onClick={() => setDetailItem(t)} />
                      ))
                  ) : (
                      <div className="text-center py-12">
                          <Info className="h-8 w-8 mx-auto text-slate-200 dark:text-slate-800 mb-2" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Belum ada transaksi.</p>
                      </div>
                  )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <Card className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Distribusi</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Analisis pengeluaran</p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10">
                      <Link href="/reports">Detail</Link>
                  </Button>
              </div>
              <BudgetChart data={expensesByCategory} />
            </Card>

            <WalletsSummaryCard wallets={wallets} expenses={allExpenses} incomes={allIncomes} />

            <div className="hidden lg:block">
                <PredictiveAnalysis expenses={expenses} categories={categories} dateRange={{ from: new Date(budgetPeriod?.periodStart || Date.now()), to: budgetPeriod?.periodEnd ? new Date(budgetPeriod.periodEnd) : new Date() }} />
            </div>
          </div>

        </div>
      </main>

      <button onClick={() => setIsChatbotOpen(true)} className="fixed bottom-24 left-4 w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl shadow-slate-900/40 flex items-center justify-center text-white z-40 hover:scale-110 transition-transform duration-200 group border border-slate-700">
          <Bot className="h-7 w-7 text-primary animate-pulse group-hover:animate-none" />
          <div className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[8px] font-bold flex items-center justify-center">AI</span>
          </div>
      </button>

      <SpeedDial mainIcon={<PlusCircle className="h-8 w-8" />}>
          <SpeedDialAction label="Transfer Dana" onClick={() => setIsTransferFormOpen(true)}>
              <ArrowLeftRight className="h-5 w-5 text-purple-500" />
          </SpeedDialAction>
          <SpeedDialAction label="Tambah Pemasukan" onClick={() => setIsAddIncomeFormOpen(true)}>
              <TrendingUp className="h-5 w-5 text-green-500" />
          </SpeedDialAction>
          <SpeedDialAction label="Tambah Pengeluaran" onClick={() => setIsAddExpenseFormOpen(true)}>
              <TrendingDown className="h-5 w-5 text-red-500" />
          </SpeedDialAction>
      </SpeedDial>

      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
          <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
              <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
                  <div className="flex flex-col">
                    <DialogTitle className="font-bold text-xl uppercase tracking-widest text-slate-800 dark:text-white">Menu Utama</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">Navigasi fitur Jaga Duit</DialogDescription>
                  </div>
                  <DialogClose className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <X className="h-5 w-5 text-slate-400" />
                  </DialogClose>
              </DialogHeader>
              <div className="flex-1 grid grid-cols-4 gap-y-8 gap-x-2 p-8 overflow-y-auto hide-scrollbar">
                  {allMenuItems.map((item) => (
                      <QuickActionItem key={item.label} href={item.href} icon={item.icon} label={item.label} onClick={() => setIsMenuDialogOpen(false)} />
                  ))}
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isChatbotOpen} onOpenChange={setIsChatbotOpen}>
        <DialogContent className="h-full w-full rounded-none border-none sm:h-[85vh] sm:max-w-lg sm:rounded-3xl sm:border flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b bg-white dark:bg-slate-900">
            <DialogTitle className="flex items-center gap-3 font-bold text-lg uppercase tracking-widest text-slate-800 dark:text-slate-100">
              <Bot className="h-7 w-7 text-primary" />
              Asisten Jaga
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">Tanya apa saja seputar keuanganmu.</DialogDescription>
          </DialogHeader>
          <FinancialChatbot />
        </DialogContent>
      </Dialog>

      <AddExpenseForm isOpen={isAddExpenseFormOpen} onOpenChange={setIsAddExpenseFormOpen} categories={categories} savingGoals={savingGoals} debts={debts} wallets={wallets} expenses={allExpenses} incomes={allIncomes} onSubmit={(data) => handleSaveTransaction(data, 'expense')} expenseToEdit={editingExpense} />
      <AddIncomeForm isOpen={isAddIncomeFormOpen} onOpenChange={setIsAddIncomeFormOpen} wallets={wallets} expenses={allExpenses} incomes={allIncomes} onSubmit={(data) => handleSaveTransaction(data, 'income')} incomeToEdit={editingIncome} />
      <TransferFundsForm isOpen={isTransferFormOpen} onOpenChange={setIsTransferFormOpen} wallets={wallets} expenses={allExpenses} incomes={allIncomes} />

      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
          <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
              <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
                  <DialogTitle className="font-bold text-xl text-slate-800 dark:text-white mx-auto">Detail Transaksi</DialogTitle>
                  <DialogClose className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <X className="h-5 w-5 text-slate-400" />
                  </DialogClose>
              </DialogHeader>
              
              {detailItem && (
                  <div className="flex-1 p-8 space-y-8 overflow-y-auto hide-scrollbar">
                      <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] p-10 text-center border border-slate-100 dark:border-slate-800 shadow-inner">
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{typeLabel}</p>
                          <p className={cn("text-5xl font-black tracking-tighter mb-4", amountColor)}>
                              {formatCurrency(detailItem.amount || 0)}
                          </p>
                          <Badge variant="outline" className={cn("border-none font-black uppercase text-[10px] tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm", badgeBg)}>
                              {detailItem.type}
                          </Badge>
                      </div>

                      <div className="space-y-8 px-2">
                          <div className="flex items-start gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                                  <Calendar className="h-6 w-6" />
                              </div>
                              <div className="flex-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TANGGAL</p>
                                  <p className="font-bold text-slate-800 dark:text-white text-base">
                                      {detailItem.date ? format(new Date(detailItem.date), "EEEE, d MMMM yyyy", { locale: idLocale }) : '-'}
                                  </p>
                                  <p className="text-sm font-bold text-slate-400 mt-0.5">{detailItem.date ? format(new Date(detailItem.date), "HH:mm") : '-'}</p>
                              </div>
                          </div>

                          <div className="flex items-start gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 shrink-0 shadow-sm">
                                  <WalletIcon className="h-6 w-6" />
                              </div>
                              <div className="flex-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{walletLabel}</p>
                                  <p className="font-bold text-slate-800 dark:text-white text-base">{detailWallet?.name || 'Tanpa Dompet'}</p>
                              </div>
                          </div>

                          {isExpense && detailCategory && (
                              <div className="flex items-start gap-5">
                                  <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 shrink-0 shadow-sm">
                                      <DetailCategoryIcon className="h-6 w-6" />
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">KATEGORI</p>
                                      <p className="font-bold text-slate-800 dark:text-white text-base">{detailCategory.name}</p>
                                  </div>
                              </div>
                          )}

                          {detailSavingGoal && (
                              <div className="flex items-start gap-5">
                                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-500 shrink-0 shadow-sm">
                                      <Landmark className="h-6 w-6" />
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TUJUAN TABUNGAN</p>
                                      <p className="font-bold text-slate-800 dark:text-white text-base">{detailSavingGoal.name}</p>
                                  </div>
                              </div>
                          )}

                          {detailDebt && (
                              <div className="flex items-start gap-5">
                                  <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 shrink-0 shadow-sm">
                                      <CreditCard className="h-6 w-6" />
                                  </div>
                                  <div className="flex-1">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">UTANG</p>
                                      <p className="font-bold text-slate-800 dark:text-white text-base">{detailDebt.name}</p>
                                  </div>
                              </div>
                          )}

                          <div className="flex items-start gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                                  <FileText className="h-6 w-6" />
                              </div>
                              <div className="flex-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">CATATAN</p>
                                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                          "{detailItem.notes || 'Tidak ada catatan untuk transaksi ini'}"
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              <DialogFooter className="p-8 bg-white dark:bg-slate-950 border-t dark:border-slate-800 flex flex-col gap-4">
                  <button 
                      className="w-full h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                      onClick={() => detailItem && handleEditClick(detailItem)}
                  >
                      <Pencil className="h-6 w-6" />
                      Ubah Transaksi
                  </button>
                  <button 
                      className="w-full text-red-500 font-black uppercase text-xs tracking-[0.2em] hover:bg-red-50 dark:hover:bg-red-900/20 h-10 rounded-xl"
                      onClick={() => detailItem && handleDeleteRequest(detailItem)}
                  >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus Transaksi
                  </button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="sm:rounded-3xl">
            <DialogHeader>
                <DialogTitle className="font-bold uppercase tracking-widest text-slate-800 dark:text-slate-100">Mulai Periode Baru?</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-tight text-slate-400">
                    Data transaksi saat ini akan diarsipkan secara otomatis ke riwayat. Anda tidak akan kehilangan data lama.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-3 mt-4">
                <Button variant="outline" className="flex-1 font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsResetConfirmOpen(false)}>Batal</Button>
                <Button className="flex-1 font-bold uppercase text-[10px] tracking-widest" onClick={handleResetClick} disabled={isResetting}>
                    {isResetting ? <Loader2 className="h-3 w-3 animate-spin"/> : "Ya, Lanjutkan"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
