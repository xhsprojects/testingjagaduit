
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Expense, SavingGoal, Debt, Income, Reminder, Wallet, RecurringTransaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import StatsCards from '@/components/StatsCards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExpenseTable from './ExpenseTable';
import AiAssistant from './AiAssistant';
import { AddExpenseForm } from './AddExpenseForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from './DateRangePicker';
import { startOfMonth, endOfMonth, format, endOfDay, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BookMarked, RefreshCw, LifeBuoy, Tag, Calendar, Landmark, FileText, CreditCard, MessageSquare, Bot, PlusCircle, Pencil, TrendingUp, TrendingDown, Edit, Trash2, Scale, Calculator, Repeat, FileDown, FileType2, BellRing, Wallet as WalletIcon, Trophy, CalendarDays, Upload, Users2, FilePenLine } from 'lucide-react';
import Link from 'next/link';
import { SupportDialog } from './SupportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { iconMap } from '@/lib/icons';
import PredictiveAnalysis from './PredictiveAnalysis';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import FinancialChatbot from './FinancialChatbot';
import { SpeedDial, SpeedDialAction } from './SpeedDial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from '@/components/ui/badge';
import { ToastAction } from './ui/toast';
import WalletsSummaryCard from './WalletsSummaryCard';
import BudgetChart from '@/components/charts/BudgetChart';
import BudgetVsSpendingChart from '@/components/charts/BudgetVsSpendingChart';
import { Separator } from './ui/separator';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer } from 'recharts';

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
  onExpensesUpdate: (expenses: Expense[]) => Promise<void>;
  onSavingGoalsUpdate: (goals: SavingGoal[]) => Promise<void>;
  onReset: () => Promise<void>;
  onEditIncome: (income: Income) => void;
  onDeleteIncome: (incomeId: string) => void;
  onViewIncome: (income: Income) => void;
  onAddIncomeClick: () => void;
}

const ActionCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { disabled?: boolean }>(
  ({ className, children, disabled, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "hover:bg-accent hover:border-primary transition-colors text-center p-4 h-full flex flex-col justify-center items-center rounded-lg border bg-card text-card-foreground shadow-sm",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ActionCard.displayName = "ActionCard";

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
  onExpensesUpdate, 
  onReset, 
  onSavingGoalsUpdate,
  onEditIncome,
  onDeleteIncome,
  onViewIncome,
  onAddIncomeClick
}: DashboardPageProps) {
  const { user, isPremium } = useAuth();
  const router = useRouter();
  const [isAddExpenseFormOpen, setIsAddExpenseFormOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = React.useState<string | null>(null);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = React.useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);
  const [date, setDate] = React.useState<DateRange | undefined>();
  const [expenseDetail, setExpenseDetail] = React.useState<Expense | null>(null);
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const { toast } = useToast();
  const uid = user?.uid;

  const [hasShownReminderToast, setHasShownReminderToast] = React.useState(false);

  const dueEventsCount = React.useMemo(() => {
    const today = new Date();
    const todayEnd = endOfDay(today);
    const dayOfMonth = today.getDate();
    
    const dueReminders = (reminders || []).filter(r => !r.isPaid && new Date(r.dueDate) <= todayEnd).length;
    
    // Only count recurring transactions if they haven't been added this month yet
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

  const categoryMap = React.useMemo(() => new Map(categories.map((cat) => [cat.id, cat])), [categories]);

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
    return categories.find(c => c.name === "Tabungan & Investasi")?.id;
  }, [categories]);

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
  const totalFilteredIncomes = React.useMemo(() => filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0), [incomes, date]);

  const remainingBudget = income - totalFilteredExpenses;

  const expensesByCategory = React.useMemo(() => {
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
  }, [filteredExpenses, categories]);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddExpenseFormOpen(true);
  };
  
  const handleDeleteRequest = (expenseId: string) => {
    setExpenseToDelete(expenseId);
  };

  const handleViewDetails = (expense: Expense) => {
    setExpenseDetail(expense);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    const updatedExpenses = expenses.filter(e => e.id !== expenseToDelete);
    await onExpensesUpdate(updatedExpenses);
    toast({ title: "Sukses", description: "Transaksi berhasil dihapus." });
    setExpenseToDelete(null);
  };

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

  const handleAddExpenseFormOpenChange = (open: boolean) => {
    if (!open) {
      setEditingExpense(null);
    }
    setIsAddExpenseFormOpen(open);
  };
  
  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Kategori', 'Jumlah', 'Catatan'];
    let rows = filteredExpenses.map(e => [
      new Date(e.date).toLocaleDateString('en-CA'),
      categoryMap.get(e.categoryId)?.name || 'N/A',
      e.amount,
      `"${e.notes?.replace(/"/g, '""') || ''}"`
    ].join(','));
    
    rows.push('');
    rows.push(`"Total",,"${totalFilteredExpenses}"`);
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "jagaduit_expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Laporan Pengeluaran - Jaga Duit", 14, 22);
    
    const tableData = filteredExpenses.map(e => {
        const category = categoryMap.get(e.categoryId);
        return [
            new Date(e.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            category?.name || 'N/A',
            e.notes || '',
            formatCurrency(e.amount),
        ];
    });

    autoTable(doc, {
        head: [['Tanggal', 'Kategori', 'Catatan', 'Jumlah']],
        body: tableData,
        startY: 30,
        headStyles: { fillColor: [41, 128, 185] }, // Primary color
        didDrawPage: (data) => {
            // Footer
            const aT = doc as any;
            const startY = aT.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`Total Pengeluaran: ${formatCurrency(totalFilteredExpenses)}`, data.settings.margin.left, startY);
        }
    });

    doc.save("jagaduit_expenses.pdf");
  };

  const handleExportIncomesCSV = () => {
    const headers = ['Tanggal', 'Jumlah', 'Catatan'];
    let rows = filteredIncomes.map(i => [
      new Date(i.date).toLocaleDateString('en-CA'),
      i.amount,
      `"${i.notes?.replace(/"/g, '""') || ''}"`
    ].join(','));
    
    rows.push('');
    rows.push(`"Total",${totalFilteredIncomes}`);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "jagaduit_incomes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportIncomesPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Laporan Pemasukan Tambahan - Jaga Duit", 14, 22);
    
    const tableData = filteredIncomes.map(i => {
        return [
            new Date(i.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            i.notes || '',
            formatCurrency(i.amount),
        ];
    });

    autoTable(doc, {
        head: [['Tanggal', 'Catatan', 'Jumlah']],
        body: tableData,
        startY: 30,
        headStyles: { fillColor: [41, 128, 185] },
        didDrawPage: (data) => {
            const aT = doc as any;
            const startY = aT.lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`Total Pemasukan Tambahan: ${formatCurrency(totalFilteredIncomes)}`, data.settings.margin.left, startY);
        }
    });

    doc.save("jagaduit_incomes.pdf");
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

  const detailCategory = expenseDetail ? categoryMap.get(expenseDetail.categoryId) : null;
  const detailSavingGoal = expenseDetail ? savingGoals.find(g => g.id === expenseDetail.savingGoalId) : null;
  const detailDebt = expenseDetail ? debts.find(d => d.id === expenseDetail.debtId) : null;
  const detailWallet = expenseDetail?.walletId ? wallets.find(w => w.id === expenseDetail.walletId) : null;
  const DetailCategoryIcon = detailCategory?.icon ? iconMap[detailCategory.icon] : null;

  const cashflowChartData = [{
    name: "Arus Kas",
    Pemasukan: totalFilteredIncomes,
    Pengeluaran: totalFilteredExpenses - totalSavings, // Exclude savings from expenses
    Tabungan: totalSavings,
  }];

  const weeklySpending = React.useMemo(() => {
    const today = new Date();
    const last7Days = filterByDateRange(expenses, {from: subDays(today, 6), to: today}).reduce((sum, e) => sum + e.amount, 0);
    const last30Days = filterByDateRange(expenses, {from: subDays(today, 29), to: today}).reduce((sum, e) => sum + e.amount, 0);
    return { last7Days, last30Days };
  }, [expenses]);

  return (
    <>
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-20">
          <div className='flex justify-between items-center flex-wrap gap-2'>
              <div className="flex items-center gap-2">
              </div>
              <DateRangePicker date={date} onDateChange={setDate} />
          </div>
          <StatsCards
            totalIncome={totalFilteredIncomes}
            totalExpenses={totalFilteredExpenses}
            remainingBudget={remainingBudget}
            totalSavings={totalSavings}
            totalWalletBalance={totalWalletBalance}
            periodLabel={periodLabel}
            onReset={() => setIsResetConfirmOpen(true)}
          />
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
                <Card>
                    <CardHeader>
                        <CardTitle>Arus Kas</CardTitle>
                        <CardDescription>Perbandingan pemasukan, pengeluaran, dan tabungan pada periode terpilih.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={cashflowChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => formatCurrency(value).replace('Rp\u00A0','')} />
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                <Legend />
                                <Bar dataKey="Pemasukan" fill="#4CAF50" radius={[4,4,0,0]} />
                                <Bar dataKey="Pengeluaran" fill="#F44336" radius={[4,4,0,0]}/>
                                <Bar dataKey="Tabungan" fill="#2196F3" radius={[4,4,0,0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Analisis Tren Pengeluaran</CardTitle>
                        <CardDescription>Perbandingan pengeluaran Anda dalam rentang waktu yang berbeda.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-center">
                        <div className="rounded-lg bg-secondary p-4">
                            <p className="text-sm text-muted-foreground">7 Hari Terakhir</p>
                            <p className="text-xl sm:text-2xl font-bold font-headline">{formatCurrency(weeklySpending.last7Days)}</p>
                        </div>
                        <div className="rounded-lg bg-secondary p-4">
                            <p className="text-sm text-muted-foreground">30 Hari Terakhir</p>
                            <p className="text-xl sm:text-2xl font-bold font-headline">{formatCurrency(weeklySpending.last30Days)}</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-muted-foreground">
                            * Data pengeluaran diambil relatif dari hari ini, bukan periode yang dipilih di atas.
                        </p>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Anggaran vs Realisasi</CardTitle>
                        <CardDescription>Perbandingan alokasi dan realisasi per kategori.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full pl-0">
                        <BudgetVsSpendingChart data={expensesByCategory} />
                    </CardContent>
                </Card>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 md:gap-8">
              <div className="lg:col-span-4">
                  <Tabs defaultValue="expenses" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="expenses">Pengeluaran</TabsTrigger>
                          <TabsTrigger value="incomes">Pemasukan</TabsTrigger>
                      </TabsList>
                      <TabsContent value="expenses" className="mt-4">
                          <ExpenseTable 
                              expenses={filteredExpenses} 
                              categories={categories} 
                              onExportCSV={handleExportCSV}
                              onExportPDF={handleExportPDF}
                              onEdit={handleEdit}
                              onDelete={handleDeleteRequest}
                              onRowClick={handleViewDetails}
                              title="Riwayat Pengeluaran"
                              description="Daftar pengeluaran pada rentang tanggal yang dipilih."
                               headerAction={
                                  <Button asChild variant="link" className="text-sm">
                                      <Link href="/history/current">Lihat Semua</Link>
                                  </Button>
                              }
                          />
                      </TabsContent>
                      <TabsContent value="incomes" className="mt-4">
                          <Card>
                               <CardHeader>
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <CardTitle className="font-headline">Riwayat Pemasukan</CardTitle>
                                          <CardDescription>Daftar pemasukan tambahan pada rentang tanggal yang dipilih.</CardDescription>
                                      </div>
                                      <Button asChild variant="link" className="text-sm">
                                          <Link href="/history/current">Lihat Semua</Link>
                                      </Button>
                                  </div>
                              </CardHeader>
                              <CardContent>
                                 <div className="max-h-[360px] overflow-auto">
                                      <Table>
                                          <TableHeader className="sticky top-0 bg-card">
                                              <TableRow>
                                                  <TableHead>Tanggal</TableHead>
                                                  <TableHead>Catatan</TableHead>
                                                  <TableHead className="text-right">Jumlah</TableHead>
                                                  <TableHead className="text-right">Aksi</TableHead>
                                              </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                              {filteredIncomes.length > 0 ? (
                                                  filteredIncomes.map(inc => (
                                                      <TableRow key={inc.id} onClick={() => onViewIncome(inc)} className="cursor-pointer">
                                                          <TableCell>{format(new Date(inc.date), "d MMM yyyy, HH:mm", { locale: idLocale })}</TableCell>
                                                          <TableCell>{inc.notes}</TableCell>
                                                          <TableCell className="text-right text-green-600 font-medium">{formatCurrency(inc.amount)}</TableCell>
                                                          <TableCell>
                                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditIncome(inc)}>
                                                                    <Pencil className="h-4 w-4" />
                                                                    <span className="sr-only">Ubah</span>
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeleteIncome(inc.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                    <span className="sr-only">Hapus</span>
                                                                </Button>
                                                            </div>
                                                          </TableCell>
                                                      </TableRow>
                                                  ))
                                              ) : (
                                                  <TableRow>
                                                      <TableCell colSpan={4} className="text-center h-24">
                                                          Belum ada pemasukan tambahan pada periode ini.
                                                      </TableCell>
                                                  </TableRow>
                                              )}
                                          </TableBody>
                                      </Table>
                                 </div>
                              </CardContent>
                               <CardFooter className="justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={handleExportIncomesCSV} disabled={filteredIncomes.length === 0}>
                                      <FileDown className="mr-2 h-4 w-4" />
                                      Ekspor CSV
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={handleExportIncomesPDF} disabled={filteredIncomes.length === 0}>
                                      <FileType2 className="mr-2 h-4 w-4" />
                                      Ekspor PDF
                                  </Button>
                              </CardFooter>
                          </Card>
                      </TabsContent>
                  </Tabs>
              </div>
              <div className="lg:col-span-3">
                  <WalletsSummaryCard
                      wallets={wallets}
                      expenses={expenses}
                      incomes={incomes}
                  />
              </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <Link href="/reports">
                  <ActionCard>
                      <BookMarked className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Laporan Keuangan</p>
                  </ActionCard>
              </Link>
              <Link href="/import">
                  <ActionCard>
                      <Upload className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Impor Transaksi</p>
                      {!isPremium && <Badge variant="destructive" className="mt-1 text-xs">Premium</Badge>}
                  </ActionCard>
              </Link>
              <Link href="/financial-calendar" className="relative">
                  <ActionCard>
                      <CalendarDays className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Kalender Finansial</p>
                      {!isPremium && <Badge variant="destructive" className="mt-1 text-xs">Premium</Badge>}
                  </ActionCard>
                  {dueEventsCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center">
                          {dueEventsCount}
                      </Badge>
                  )}
              </Link>
               <Link href="/reminders">
                  <ActionCard>
                      <BellRing className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Pengingat Bayar</p>
                  </ActionCard>
              </Link>
               <Link href="/achievements">
                  <ActionCard>
                      <Trophy className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Prestasi</p>
                  </ActionCard>
              </Link>
              <Link href="/calculators">
                  <ActionCard>
                      <Calculator className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Kalkulator</p>
                      {!isPremium && <Badge variant="destructive" className="mt-1 text-xs">Premium</Badge>}
                  </ActionCard>
              </Link>
              <Link href="/recurring">
                  <ActionCard>
                      <Repeat className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Transaksi Berulang</p>
                  </ActionCard>
              </Link>
               <Link href="/net-worth">
                  <ActionCard>
                      <Scale className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Kekayaan Bersih</p>
                       {!isPremium && <Badge variant="destructive" className="mt-1 text-xs">Premium</Badge>}
                  </ActionCard>
              </Link>
              <Link href="/split-bill">
                  <ActionCard>
                      <Users2 className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Bagi Tagihan</p>
                  </ActionCard>
              </Link>
              <Link href="/notes">
                  <ActionCard>
                      <FilePenLine className="h-7 w-7 mb-2 text-primary" />
                      <p className="font-semibold text-sm">Catatan Pribadi</p>
                  </ActionCard>
              </Link>
          </div>

          <PredictiveAnalysis
              expenses={filteredExpenses}
              categories={categories}
              dateRange={date}
          />
          <AiAssistant />
        </main>

        <SpeedDial mainIcon={<MessageSquare className="h-6 w-6" />} position="bottom-left">
          <SpeedDialAction label="Chat Konsultasi" onClick={handleChatbotClick}>
            <Bot className="h-5 w-5" />
          </SpeedDialAction>
          <SpeedDialAction label="Dukungan Aplikasi" onClick={() => setIsSupportDialogOpen(true)}>
            <LifeBuoy className="h-5 w-5" />
          </SpeedDialAction>
        </SpeedDial>
        
        <SpeedDial mainIcon={<PlusCircle className="h-7 w-7" />} position="bottom-right">
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
          onOpenChange={handleAddExpenseFormOpenChange}
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
        
         <Dialog open={!!expenseDetail} onOpenChange={(open) => !open && setExpenseDetail(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Detail Transaksi</DialogTitle>
                </DialogHeader>
                {expenseDetail && (
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg bg-secondary p-4">
                          <p className="text-sm text-muted-foreground">Jumlah</p>
                          <p className="text-2xl font-bold">{formatCurrency(expenseDetail.amount)}</p>
                          {expenseDetail.adminFee && expenseDetail.adminFee > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                  (Pokok: {formatCurrency(expenseDetail.baseAmount || 0)} + Admin: {formatCurrency(expenseDetail.adminFee)})
                              </p>
                          )}
                        </div>
                        <div className="space-y-3 pt-2">
                            {expenseDetail.isSplit ? (
                                <>
                                  <div className="flex items-start gap-3">
                                      <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                      <div>
                                          <p className="text-xs text-muted-foreground">Kategori</p>
                                          <p className="font-medium">Transaksi Split</p>
                                      </div>
                                  </div>
                                  <div className="pl-7 space-y-2">
                                    {(expenseDetail.splits || []).map((split, index) => (
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
                                        <p className="font-medium">{detailCategory?.name || 'Tidak ada kategori'}</p>
                                    </div>
                                </div>
                            )}
                            <Separator/>
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Tanggal</p>
                                    <p className="font-medium">{format(new Date(expenseDetail.date), "EEEE, d MMMM yyyy, HH:mm", { locale: idLocale })}</p>
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
                            {expenseDetail.notes && (
                                <div className="flex items-start gap-3">
                                    <FileText className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Catatan</p>
                                        <p className="font-medium whitespace-pre-wrap">{expenseDetail.notes}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
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


        <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini tidak dapat dibatalkan. Ini akan menghapus transaksi secara permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
