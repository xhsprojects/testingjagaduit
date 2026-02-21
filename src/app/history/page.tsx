
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { BudgetPeriod, Category, Debt, Expense, Income, SavingGoal, Wallet } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
    Archive, ChevronRight, TrendingUp, TrendingDown, 
    Wallet as WalletIcon, Loader2, Trash2, FileDown, 
    FileType2, Search, Tag, Coins, FileText, Calendar, 
    Landmark, CreditCard, Pencil, ArrowLeft, 
    GitCommitHorizontal, ArrowLeftRight, X, MoreVertical, Filter, History, ChevronDown
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/DateRangePicker';
import { iconMap } from '@/lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { AddIncomeForm } from '@/components/AddIncomeForm';
import { updateTransaction, deleteTransaction } from './actions';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (typeof data.toDate === 'function') return data.toDate();
  if (Array.isArray(data)) return data.map(convertTimestamps);
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: convertTimestamps(data[key]) }), {});
  }
  return data;
};

type UnifiedTransaction = (Expense | Income) & {
  type: 'income' | 'expense';
  periodId: string;
  categoryName?: string;
  categoryIcon?: React.ElementType;
  categoryColor?: string;
};

// --- Transaction Row Component ---
const TransactionItem = React.memo(({ transaction, categoryMap, walletMap, onClick }: { 
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
    
    let bgColor = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    let iconToRender = <TrendingUp className="h-[18px] w-[18px]" />;

    if (isExpense) {
        bgColor = "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800";
        iconToRender = <CreditCard className="h-[18px] w-[18px]" />;
        
        const expense = transaction as Expense;
        if (expense.categoryId) {
            const category = categoryMap.get(expense.categoryId);
            if (category) {
                const CategoryIcon = iconMap[category.icon] || Tag;
                iconToRender = <CategoryIcon className="h-[18px] w-[18px]" />;
                title = expense.notes || category.name;
                
                // Color heuristics for icons
                if (category.name.toLowerCase().includes('makan')) bgColor = "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800";
                else if (category.name.toLowerCase().includes('belanja')) bgColor = "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800";
                else if (category.name.toLowerCase().includes('pinjam') || category.name.toLowerCase().includes('utang')) bgColor = "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
            }
        }
    }

    return (
        <div onClick={onClick} className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105", bgColor)}>
                {iconToRender}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate pr-2 leading-none">{title}</h3>
                    <p className={cn("font-bold text-sm whitespace-nowrap tabular-nums", isExpense ? "text-slate-800 dark:text-slate-100" : "text-emerald-600 dark:text-emerald-400")}>
                        {isExpense ? '-' : '+'} {formatCurrency(amount)}
                    </p>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider">
                        {walletName}
                    </span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tabular-nums">
                        {format(new Date(transaction.date), "d MMM • HH:mm", { locale: idLocale })}
                    </p>
                </div>
            </div>
        </div>
    );
});
TransactionItem.displayName = 'TransactionItem';

// --- Archive Period Card ---
const PeriodCard = ({ period, id, onDelete }: { 
    period: BudgetPeriod, 
    id: string, 
    onDelete: (id: string) => void,
}) => {
    const isCurrent = id === 'current';
    const title = isCurrent
        ? `Periode Anggaran Saat Ini`
        : `Arsip: ${format(new Date(period.periodStart), "d MMM yyyy", { locale: idLocale })} - ${period.periodEnd ? format(new Date(period.periodEnd), "d MMM yyyy", { locale: idLocale }) : 'Sekarang'}`;
    
    const summary = React.useMemo(() => {
        const totalIn = (period.incomes || []).reduce((sum, i) => sum + i.amount, 0);
        const totalOut = (period.expenses || []).reduce((sum, e) => sum + e.amount, 0);
        return { totalIn, totalOut, remaining: (period.income || 0) + totalIn - totalOut };
    }, [period]);

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start space-y-0">
                <div>
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">
                        {period.expenses.length + (period.incomes?.length || 0)} Transaksi Tercatat
                    </CardDescription>
                </div>
                {!isCurrent && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => onDelete(id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-2 grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg text-center border border-emerald-100 dark:border-emerald-800/50">
                    <p className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Masuk</p>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">{formatCurrency(summary.totalIn)}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg text-center border border-rose-100 dark:border-rose-800/50">
                    <p className="text-[8px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-1">Keluar</p>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">{formatCurrency(summary.totalOut)}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center border border-blue-100 dark:border-blue-800/50">
                    <p className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Sisa</p>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">{formatCurrency(summary.remaining)}</p>
                </div>
            </CardContent>
            <CardFooter className="p-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                <Button variant="link" size="sm" asChild className="text-[10px] font-bold uppercase tracking-widest h-8">
                    <Link href={`/history/${id}`}>Lihat Detail <ChevronRight className="ml-1 h-3 w-3" /></Link>
                </Button>
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold uppercase"><FileDown className="h-3 w-3 mr-1" /> CSV</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold uppercase"><FileType2 className="h-3 w-3 mr-1" /> PDF</Button>
                </div>
            </CardFooter>
        </Card>
    );
};

// --- Main Page Component ---
export default function HistoryPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = React.useState<'all' | 'archive'>('all');
    const [currentPeriod, setCurrentPeriod] = React.useState<BudgetPeriod | null>(null);
    const [archivedPeriods, setArchivedPeriods] = React.useState<(BudgetPeriod & {id: string})[]>([]);
    const [allTransactions, setAllTransactions] = React.useState<UnifiedTransaction[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
    const [typeFilter, setTypeFilter] = React.useState<'all' | 'income' | 'expense'>('all');
    const [walletFilter, setWalletFilter] = React.useState<string>('all');
    
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [allCategories, setAllCategories] = React.useState<Category[]>([]);
    const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
    const [debts, setDebts] = React.useState<Debt[]>([]);
    
    const [isLoading, setIsLoading] = React.useState(true);
    const [detailItem, setDetailItem] = React.useState<UnifiedTransaction | null>(null);
    const [isExpenseFormOpen, setIsExpenseFormOpen] = React.useState(false);
    const [isIncomeFormOpen, setIsIncomeFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<UnifiedTransaction | null>(null);
    const [itemToDelete, setItemToDelete] = React.useState<UnifiedTransaction | null>(null);
    const [archiveToDelete, setArchiveToDelete] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const loadData = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const allBudgetPeriods: (BudgetPeriod & {id: string})[] = [];
            const categoryMap = new Map<string, Category>();

            const currentDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            const currentDocSnap = await getDoc(currentDocRef);
            if (currentDocSnap.exists()) {
                const data = convertTimestamps(currentDocSnap.data());
                if (data.periodStart) {
                    setCurrentPeriod(data);
                    allBudgetPeriods.push({ id: 'current', ...data });
                    (data.categories || []).forEach((c: Category) => categoryMap.set(c.id, c));
                }
            }

            const archiveSnapshot = await getDocs(query(collection(db, 'users', user.uid, 'archivedBudgets'), orderBy('periodStart', 'desc')));
            const archives = archiveSnapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) })) as (BudgetPeriod & {id: string})[];
            setArchivedPeriods(archives);
            archives.forEach(arch => {
                allBudgetPeriods.push(arch);
                (arch.categories || []).forEach((c: Category) => !categoryMap.has(c.id) && categoryMap.set(c.id, c));
            });
            
            const cats = Array.from(categoryMap.values());
            setAllCategories(cats);
            
            const walletsSnapshot = await getDocs(collection(db, 'users', user.uid, 'wallets'));
            setWallets(walletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Wallet[]);
            
            const goalsSnapshot = await getDocs(collection(db, 'users', user.uid, 'savingGoals'));
            setSavingGoals(goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavingGoal[]);
            
            const debtsSnapshot = await getDocs(collection(db, 'users', user.uid, 'debts'));
            setDebts(debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[]);
            
            const unifiedTransactions: UnifiedTransaction[] = [];
            allBudgetPeriods.forEach(period => {
                (period.expenses || []).forEach((exp: Expense) => {
                    unifiedTransactions.push({ ...exp, periodId: period.id, type: 'expense' });
                });
                (period.incomes || []).forEach((inc: Income) => {
                    unifiedTransactions.push({ ...inc, periodId: period.id, type: 'income' });
                });
            });
            setAllTransactions(unifiedTransactions);

        } catch (error) {
            console.error("Failed to load history data:", error);
            toast({ title: 'Gagal Memuat Data', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    React.useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        else if (user) loadData();
    }, [user, authLoading, router, loadData]);

    const filteredTransactions = React.useMemo(() => {
        let filtered = allTransactions;
        
        if (dateRange?.from) {
            const from = startOfDay(dateRange.from);
            const to = dateRange.to ? endOfDay(dateRange.to) : from;
            filtered = filtered.filter(item => {
                const d = new Date(item.date);
                return d >= from && d <= to;
            });
        }
        if (typeFilter !== 'all') filtered = filtered.filter(item => item.type === typeFilter);
        if (walletFilter !== 'all') filtered = filtered.filter(item => item.walletId === walletFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(item => item.notes?.toLowerCase().includes(q));
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions, dateRange, searchQuery, typeFilter, walletFilter]);

    const confirmDeleteTransaction = async () => {
        if (!itemToDelete || !idToken) return;
        setIsDeleting(true);
        const result = await deleteTransaction(idToken, itemToDelete.periodId, itemToDelete.id, itemToDelete.type);
        if (result.success) {
            toast({ title: 'Berhasil', description: 'Transaksi dihapus.' });
            loadData();
        }
        setItemToDelete(null);
        setIsDeleting(false);
    };

    const handleSaveTransaction = async (data: Expense | Income, type: 'expense' | 'income') => {
        if (!idToken || !editingItem) return;
        const result = await updateTransaction(idToken, editingItem.periodId, data, type);
        if (result.success) {
            toast({ title: 'Berhasil', description: 'Transaksi diperbarui.' });
            loadData();
        }
        setIsExpenseFormOpen(false);
        setIsIncomeFormOpen(false);
        setEditingItem(null);
    };

    const walletMap = React.useMemo(() => new Map(wallets.map(w => [w.id, w])), [wallets]);
    const categoryMapRef = React.useMemo(() => new Map(allCategories.map(c => [c.id, c])), [allCategories]);

    if (authLoading) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    const detailWallet = detailItem?.walletId ? walletMap.get(detailItem.walletId) : null;
    const detailSavingGoal = detailItem?.type === 'expense' && (detailItem as Expense).savingGoalId ? savingGoals.find(g => g.id === (detailItem as Expense).savingGoalId) : null;
    const detailDebt = detailItem?.type === 'expense' && (detailItem as Expense).debtId ? debts.find(d => d.id === (detailItem as Expense).debtId) : null;
    const detailCategory = detailItem?.type === 'expense' ? categoryMapRef.get((detailItem as Expense).categoryId || '') : null;
    const DetailCategoryIcon = detailCategory ? iconMap[detailCategory.icon] : Tag;

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full -ml-2 text-slate-400 hover:text-primary transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Riwayat Transaksi</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Jaga Duit Professional</p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full text-primary">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl w-48 p-2">
                        <DropdownMenuItem className="rounded-xl cursor-pointer py-3"><FileDown className="h-4 w-4 mr-2" /> Ekspor ke CSV</DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl cursor-pointer py-3"><FileType2 className="h-4 w-4 mr-2" /> Ekspor ke PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <main className="flex-1 flex flex-col pb-24">
                {/* Tab Switcher */}
                <div className="px-4 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex shadow-inner">
                        <button 
                            onClick={() => setActiveTab('all')}
                            className={cn(
                                "flex-1 text-[11px] font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all",
                                activeTab === 'all' 
                                ? "bg-white dark:bg-slate-700 text-primary shadow-sm border border-slate-200 dark:border-slate-600" 
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            Semua Transaksi
                        </button>
                        <button 
                            onClick={() => setActiveTab('archive')}
                            className={cn(
                                "flex-1 text-[11px] font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all",
                                activeTab === 'archive' 
                                ? "bg-white dark:bg-slate-700 text-primary shadow-sm border border-slate-200 dark:border-slate-600" 
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            Arsip Anggaran
                        </button>
                    </div>
                </div>

                {activeTab === 'all' ? (
                    <>
                        {/* Search & Filter Bar */}
                        <div className="px-4 py-4 bg-white/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 sticky top-[72px] z-20 backdrop-blur-md">
                            <div className="flex flex-col gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <Input 
                                        className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs py-5 pl-10 pr-4 rounded-2xl shadow-sm focus:ring-primary" 
                                        placeholder="Cari transaksi..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    {/* Date Range Picker - Full Width on Mobile */}
                                    <DateRangePicker 
                                        date={dateRange} 
                                        onDateChange={setDateRange} 
                                        className="w-full"
                                    />
                                    
                                    {/* Type and Wallet Selects - Side by Side on Mobile */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                                            <SelectTrigger className="rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full">
                                                <div className="flex items-center gap-1.5"><Filter className="h-3 w-3" /><SelectValue placeholder="Tipe" /></div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl"><SelectItem value="all">Semua</SelectItem><SelectItem value="income">Pemasukan</SelectItem><SelectItem value="expense">Pengeluaran</SelectItem></SelectContent>
                                        </Select>
                                        <Select value={walletFilter} onValueChange={setWalletFilter}>
                                            <SelectTrigger className="rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full">
                                                <div className="flex items-center gap-1.5"><WalletIcon className="h-3 w-3" /><SelectValue placeholder="Dompet" /></div>
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                <SelectItem value="all">Semua</SelectItem>
                                                {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search Results List */}
                        <section className="flex-1 bg-white dark:bg-slate-900">
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em]">Hasil Pencarian</h2>
                                <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-extrabold uppercase">{isLoading ? '...' : `${filteredTransactions.length} Item`}</span>
                            </div>
                            
                            {isLoading ? (
                                <div className="p-4 space-y-4">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {filteredTransactions.length > 0 ? (
                                        filteredTransactions.map(t => (
                                            <TransactionItem 
                                                key={t.id} 
                                                transaction={t} 
                                                categoryMap={categoryMapRef} 
                                                walletMap={walletMap} 
                                                onClick={() => setDetailItem(t)} 
                                            />
                                        ))
                                    ) : (
                                        <div className="py-20 text-center text-slate-400 italic text-sm font-bold uppercase tracking-widest">
                                            Tidak ada transaksi ditemukan.
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    /* Archive List */
                    <section className="p-4 space-y-4">
                        {archivedPeriods.length > 0 ? (
                            archivedPeriods.map(period => (
                                <PeriodCard key={period.id} id={period.id} period={period} onDelete={setArchiveToDelete} />
                            ))
                        ) : (
                            <div className="py-20 text-center text-slate-400 italic text-sm font-bold uppercase tracking-widest">
                                Belum ada arsip anggaran.
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* Bottom Nav Placeholder - Space for the real BottomNavbar component */}
            <div className="h-24 md:hidden" />

            {/* --- Dialogs --- */}
            
            {/* Transaction Detail Dialog */}
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl">
                    <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="font-bold text-lg uppercase tracking-widest text-slate-800 dark:text-white text-center">Detail Transaksi</DialogTitle>
                    </DialogHeader>
                    
                    {detailItem && (
                        <div className="flex-1 p-8 space-y-8 overflow-y-auto hide-scrollbar">
                            <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 text-center border border-slate-100 dark:border-slate-800 shadow-inner">
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-3">{detailItem.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</p>
                                <p className={cn("text-4xl font-black tracking-tighter mb-4", detailItem.type === 'expense' ? "text-rose-500" : "text-emerald-500")}>
                                    {formatCurrency(detailItem.amount || 0)}
                                </p>
                                <Badge variant="outline" className={cn("border-none font-extrabold uppercase text-[9px] tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm", detailItem.type === 'expense' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500")}>
                                    {detailItem.type}
                                </Badge>
                            </div>

                            <div className="space-y-8 px-2">
                                <div className="flex items-start gap-5">
                                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0 border border-blue-100 dark:border-blue-800/50">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-1">TANGGAL</p>
                                        <p className="font-bold text-slate-800 dark:text-white text-sm">
                                            {format(new Date(detailItem.date), "EEEE, d MMMM yyyy", { locale: idLocale })}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{format(new Date(detailItem.date), "HH:mm")}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-5">
                                    <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 shrink-0 border border-purple-100 dark:border-purple-800/50">
                                        <WalletIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-1">{detailItem.type === 'expense' ? 'DIBAYAR DARI' : 'MASUK KE'}</p>
                                        <p className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">{detailWallet?.name || 'Tanpa Dompet'}</p>
                                    </div>
                                </div>

                                {detailItem.type === 'expense' && detailCategory && (
                                    <div className="flex items-start gap-5">
                                        <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 shrink-0 border border-orange-100 dark:border-orange-800/50">
                                            <DetailCategoryIcon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-1">KATEGORI</p>
                                            <p className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">{detailCategory.name}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-5">
                                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200 dark:border-slate-700">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-3">CATATAN</p>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 italic text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                                            "{detailItem.notes || 'Tidak ada catatan untuk transaksi ini'}"
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-row gap-3">
                        <button 
                            className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            onClick={() => detailItem && handleEditClick(detailItem)}
                        >
                            <Pencil className="h-4 w-4" /> Ubah
                        </button>
                        <button 
                            className="flex-1 h-12 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-500 font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            onClick={() => detailItem && setItemToDelete(detailItem)}
                        >
                            <Trash2 className="h-4 w-4" /> Hapus
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Forms */}
            <AddExpenseForm
                isOpen={isExpenseFormOpen}
                onOpenChange={setIsExpenseFormOpen}
                categories={allCategories}
                savingGoals={savingGoals}
                debts={debts}
                wallets={wallets}
                onSubmit={(data) => handleSaveTransaction(data, 'expense')}
                expenseToEdit={editingItem?.type === 'expense' ? editingItem as Expense : null}
            />
            
            <AddIncomeForm
                isOpen={isIncomeFormOpen}
                onOpenChange={setIsIncomeFormOpen}
                wallets={wallets}
                onSubmit={(data) => handleSaveTransaction(data, 'income')}
                incomeToEdit={editingItem?.type === 'income' ? editingItem as Income : null}
            />

            {/* Alert Dialogs */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-bold uppercase tracking-widest text-xs">Hapus Transaksi?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs font-bold text-slate-400">Tindakan ini permanen dan tidak bisa dibatalkan.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest border-slate-200">Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTransaction} disabled={isDeleting} className="flex-1 rounded-xl h-10 bg-rose-500 text-[10px] font-bold uppercase tracking-widest">
                            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin"/> : "Ya, Hapus"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!archiveToDelete} onOpenChange={(open) => !open && setArchiveToDelete(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-bold uppercase tracking-widest text-xs text-rose-500">Hapus Arsip?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs font-bold text-slate-400">Seluruh riwayat transaksi pada periode arsip ini akan dihapus selamanya.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4">
                        <AlertDialogCancel className="flex-1 rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest border-slate-200">Batal</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={async () => {
                                if (!archiveToDelete || !user) return;
                                setIsDeleting(true);
                                await deleteDoc(doc(db, 'users', user.uid, 'archivedBudgets', archiveToDelete));
                                toast({ title: 'Arsip dihapus' });
                                setArchiveToDelete(null);
                                setIsDeleting(false);
                                loadData();
                            }} 
                            disabled={isDeleting} 
                            className="flex-1 rounded-xl h-10 bg-rose-500 text-[10px] font-bold uppercase tracking-widest"
                        >
                            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin"/> : "Hapus Permanen"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );

    function handleEditClick(item: UnifiedTransaction) {
        setDetailItem(null);
        setEditingItem(item);
        if (item.type === 'expense') setIsExpenseFormOpen(true);
        else setIsIncomeFormOpen(true);
    }
}
