"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Expense, SavingGoal, Debt, Income, Reminder, Wallet, RecurringTransaction, BudgetPeriod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import { AddExpenseForm } from './AddExpenseForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
    BookMarked, HandCoins, Bot, PlusCircle, TrendingUp, TrendingDown,
    Repeat, BellRing, Trophy, CalendarDays, Upload, Users2,
    ChevronRight, GitCommitHorizontal, Calculator, Wallet as WalletIcon, Tag
} from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { iconMap } from '@/lib/icons';
import PredictiveAnalysis from './PredictiveAnalysis';
import { useAuth } from '@/context/AuthContext';
import FinancialChatbot from './FinancialChatbot';
import { Card } from './ui/card';
import WalletsSummaryCard from './WalletsSummaryCard';
import BudgetChart from '@/components/charts/BudgetChart';
import { deleteTransaction } from '@/app/history/actions';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

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
  allExpenses: Expense[];
  allIncomes: Income[];
}

type UnifiedTransaction = (Expense | Income) & {
  type: 'expense' | 'income';
};

const QuickActionItem = ({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) => (
    <Link href={href} className="flex flex-col items-center gap-2 group cursor-pointer">
        <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/30">
            <Icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
        </div>
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight transition-colors text-center">{label}</span>
    </Link>
);

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
            title = expense.notes || `Split ${expense.splits.length} kategori`;
        } else if (expense.categoryId) {
            const category = categoryMap.get(expense.categoryId);
            if (category) {
                Icon = iconMap[category.icon] || Tag;
                title = expense.notes || category.name;
            }
        }
    }

    return (
        <div onClick={onClick} className="flex items-center justify-between py-4 cursor-pointer border-b last:border-b-0 group border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm",
                    isExpense ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-primary group-hover:text-white" : "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                )}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-none mb-1">{title}</p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">{walletName}</p>
                </div>
            </div>
            <div className="text-right">
                <p className={cn("text-sm font-bold whitespace-nowrap", isExpense ? "text-slate-800 dark:text-white" : "text-green-500")}>
                    {isExpense ? '-' : '+'} {formatCurrency(amount)}
                </p>
                <p className="text-[10px] text-slate-400 tracking-tight">
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
  reminders,
  recurringTxs,
  wallets,
  budgetPeriod,
  onExpensesUpdate, 
  onSavingGoalsUpdate,
  onReset, 
  allExpenses,
  allIncomes
}: DashboardPageProps) {
  const { isPremium, idToken } = useAuth();
  const router = useRouter();
  const [isAddExpenseFormOpen, setIsAddExpenseFormOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);
  const [detailItem, setDetailItem] = React.useState<UnifiedTransaction | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const { toast } = useToast();

  const isDataReady = Array.isArray(categories) && categories.length > 0;

  const categoryMap = React.useMemo(() => new Map(categories.map((cat) => [cat.id, cat])), [categories]);
  const walletMap = React.useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets]);
  
  const periodLabel = React.useMemo(() => {
    if (!budgetPeriod?.periodStart) return "Periode Ini";
    const from = new Date(budgetPeriod.periodStart);
    const to = budgetPeriod.periodEnd ? new Date(budgetPeriod.periodEnd) : new Date();
    return `${format(from, "d MMM yyyy", { locale: idLocale })} - ${format(to, "d MMM yyyy", { locale: idLocale })}`;
  }, [budgetPeriod]);

  const totalFilteredExpenses = React.useMemo(() => (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0), [expenses]);
  const totalFilteredIncomes = React.useMemo(() => (incomes || []).reduce((sum, inc) => sum + (inc.amount || 0), 0), [incomes]);
  const remainingBudget = (income || 0) - totalFilteredExpenses;
  
  const unifiedTransactions = React.useMemo(() => {
      const combined = [
          ...(expenses || []).map(e => ({ ...e, type: 'expense' as const })),
          ...(incomes || []).map(i => ({ ...i, type: 'income' as const })),
      ];
      return combined.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, incomes]);

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

  const handleSaveExpense = async (expenseData: Expense) => {
    const isEditing = (expenses || []).some(e => e.id === expenseData.id);
    let updatedExpenses = isEditing ? expenses.map(e => e.id === expenseData.id ? expenseData : e) : [...(expenses || []), expenseData];
    await onExpensesUpdate(updatedExpenses);
    toast({ title: 'Sukses', description: `Transaksi berhasil disimpan.` });
    setIsAddExpenseFormOpen(false);
    setEditingExpense(null);
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

  if (!isDataReady) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Bot className="h-8 w-8 animate-bounce text-primary" /></div>;
  }

  return (
    <>
      <div className="flex min-h-screen w-full flex-col bg-background transition-colors duration-300">
        <Header />
        <main className="pt-20 pb-24 px-4 max-w-lg mx-auto space-y-6">
          <StatsCards
            totalIncome={totalFilteredIncomes}
            totalExpenses={totalFilteredExpenses}
            remainingBudget={remainingBudget}
            totalSavings={(expenses || []).filter(e => e.savingGoalId).reduce((s, e) => s + (e.amount || 0), 0)}
            totalWalletBalance={totalWalletBalance}
            periodLabel={periodLabel}
            onReset={() => setIsResetConfirmOpen(true)}
          />

          <Card className="bg-card rounded-2xl p-6 shadow-sm border border-border dark:border-slate-800">
            <h3 className="text-lg font-bold mb-6">Akses Cepat</h3>
            <div className="grid grid-cols-4 gap-y-8 gap-x-2">
                <QuickActionItem href="/reports" icon={BookMarked} label="Laporan" />
                <QuickActionItem href="/import" icon={Upload} label="Impor" />
                <QuickActionItem href="/split-bill" icon={Users2} label="Bagi Bill" />
                <QuickActionItem href="/financial-calendar" icon={CalendarDays} label="Kalender" />
                <QuickActionItem href="/reminders" icon={BellRing} label="Pengingat" />
                <QuickActionItem href="/achievements" icon={Trophy} label="Prestasi" />
                <QuickActionItem href="/calculators" icon={Calculator} label="Kalkulator" />
                <QuickActionItem href="/recurring" icon={Repeat} label="Otomatis" />
            </div>
            <Button asChild variant="outline" className="w-full mt-8 py-3 rounded-xl border-border dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Link href="/dasbor">Lihat Semua Menu</Link>
            </Button>
          </Card>

          <Card className="bg-card rounded-2xl p-6 shadow-sm border border-border dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold">Distribusi Pengeluaran</h3>
                    <p className="text-xs text-slate-500">Analisis kategori utama</p>
                </div>
                <Button asChild variant="secondary" size="sm" className="h-7 text-xs bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full">
                    <Link href="/reports">Detail</Link>
                </Button>
            </div>
            <BudgetChart data={expensesByCategory} />
          </Card>

          <WalletsSummaryCard wallets={wallets} expenses={allExpenses} incomes={allIncomes} />

          <PredictiveAnalysis expenses={expenses} categories={categories} dateRange={{ from: new Date(budgetPeriod?.periodStart || Date.now()), to: budgetPeriod?.periodEnd ? new Date(budgetPeriod.periodEnd) : new Date() }} />

          <Card className="bg-card rounded-2xl p-6 shadow-sm border border-border dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold">Riwayat Transaksi</h3>
                    <p className="text-xs text-slate-500">Daftar transaksi terbaru Anda.</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-medium text-slate-500 hover:text-primary">
                    <Link href="/history" className="flex items-center">
                        Lihat Semua <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                </Button>
            </div>
            <div className="space-y-1">
                {unifiedTransactions.length > 0 ? (
                    unifiedTransactions.slice(0, 5).map((t) => (
                        <TransactionItem key={t.id} transaction={t} categoryMap={categoryMap} walletMap={walletMap} onClick={() => setDetailItem(t)} />
                    ))
                ) : (
                    <p className="text-center py-8 text-sm text-muted-foreground font-medium italic">Belum ada transaksi.</p>
                )}
            </div>
          </Card>
        </main>

        <button 
            onClick={() => setIsChatbotOpen(true)}
            className="fixed bottom-24 left-4 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center text-white z-40 hover:scale-110 transition-transform duration-200 group"
        >
            <Bot className="h-7 w-7 animate-pulse group-hover:animate-none" />
        </button>

        <button 
            onClick={() => setIsAddExpenseFormOpen(true)}
            className="fixed bottom-24 right-4 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center text-white z-40 hover:scale-110 transition-transform duration-200"
        >
            <PlusCircle className="h-7 w-7" />
        </button>

        <Dialog open={isChatbotOpen} onOpenChange={setIsChatbotOpen}>
          <DialogContent className="h-full w-full rounded-none border-none sm:h-[85vh] sm:max-w-lg sm:rounded-lg sm:border flex flex-col p-0 gap-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center gap-2 font-headline">
                <Bot className="h-6 w-6 text-primary" />
                Asisten Keuangan Jaga
              </DialogTitle>
              <DialogDescription>Tanya apa saja seputar keuanganmu.</DialogDescription>
            </DialogHeader>
            <FinancialChatbot />
          </DialogContent>
        </Dialog>

        <AddExpenseForm
          isOpen={isAddExpenseFormOpen}
          onOpenChange={(open) => { if (!open) setEditingExpense(null); setIsAddExpenseFormOpen(open); }}
          categories={categories}
          savingGoals={savingGoals}
          debts={[]}
          wallets={wallets}
          expenses={allExpenses}
          incomes={allIncomes}
          onSubmit={handleSaveExpense}
          expenseToEdit={editingExpense}
        />

        <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Detail Transaksi</DialogTitle></DialogHeader>
                {detailItem && (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Jumlah</p>
                            <p className={cn("text-3xl font-extrabold", detailItem.type === 'income' ? "text-green-500" : "text-slate-800 dark:text-white")}>
                                {formatCurrency(detailItem.amount || 0)}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase">
                            <div className="p-3 border rounded-xl dark:border-slate-700">
                                <p className="text-slate-500 mb-1">Tanggal</p>
                                <p>{detailItem.date ? format(new Date(detailItem.date), "d MMMM yyyy") : '-'}</p>
                            </div>
                            <div className="p-3 border rounded-xl dark:border-slate-700">
                                <p className="text-slate-500 mb-1">Dompet</p>
                                <p>{walletMap.get(detailItem.walletId || '')?.name || '-'}</p>
                            </div>
                        </div>
                        {detailItem.notes && (
                            <div className="p-3 border rounded-xl text-sm dark:border-slate-700">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Catatan</p>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{detailItem.notes}</p>
                            </div>
                        )}
                    </div>
                )}
                <DialogFooter className="gap-2">
                    <Button variant="ghost" className="text-red-500 font-bold" onClick={() => detailItem && handleDeleteRequest(detailItem)}>Hapus</Button>
                    <Button onClick={() => setDetailItem(null)}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Mulai Periode Baru?</AlertDialogTitle>
                  <AlertDialogDescription>Data saat ini akan diarsipkan. Anda tidak akan kehilangan riwayat transaksi lama.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetClick} disabled={isResetting}>Lanjutkan</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}