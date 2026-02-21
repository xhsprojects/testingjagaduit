"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { BudgetPeriod, Category, Debt, Expense, Income, SavingGoal, Wallet } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Archive, ChevronRight, TrendingUp, TrendingDown, Wallet as WalletIcon, Loader2, Trash2, FileDown, FileType2, Search, Tag, Coins, FileText, Calendar, Landmark, CreditCard, Pencil, ArrowLeft, GitCommitHorizontal, ArrowLeftRight, X } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/DateRangePicker';
import { iconMap } from '@/lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { AddIncomeForm } from '@/components/AddIncomeForm';
import { updateTransaction, deleteTransaction } from './actions';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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
};

const TransactionItem = React.memo(({ transaction, categoryMap, walletMap, onClick }: { 
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
                Icon = iconMap[category.icon as keyof typeof iconMap] || Tag;
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
                    <p className={cn("font-semibold whitespace-nowrap text-sm", isExpense ? "text-foreground" : "text-primary")}>
                        {isExpense ? '-' : '+'} {formatCurrency(amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{format(new Date(transaction.date), "d MMM, HH:mm", { locale: idLocale })}</p>
                </div>
            </div>
        </div>
    );
});
TransactionItem.displayName = 'TransactionItem';

const PeriodCard = ({ period, id, onDelete }: { 
    period: BudgetPeriod, 
    id: string, 
    onDelete: (id: string) => void,
}) => {
    const isCurrent = id === 'current';
    const title = isCurrent
        ? `Periode Anggaran Saat Ini`
        : `Arsip: ${format(new Date(period.periodStart), "d MMM yyyy", { locale: idLocale })} - ${period.periodEnd ? format(new Date(period.periodEnd), "d MMM yyyy", { locale: idLocale }) : 'Sekarang'}`;
    const description = isCurrent
        ? `${format(new Date(period.periodStart), "d MMM yyyy", { locale: idLocale })} - Sekarang`
        : `Total ${(period.expenses || []).length + (period.incomes || []).length} transaksi`;

    const summary = React.useMemo(() => {
        if (period.totalIncome !== undefined && period.totalExpenses !== undefined && period.remainingBudget !== undefined) {
            return {
                totalAddedIncomes: period.totalIncome - period.income,
                totalExpenses: period.totalExpenses,
                remaining: period.remainingBudget,
            }
        }
        const totalAddedIncomes = (period.incomes || []).reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = (period.expenses || []).reduce((sum, e) => sum + e.amount, 0);
        const remaining = (period.income || 0) + totalAddedIncomes - totalExpenses;
        return { totalAddedIncomes, totalExpenses, remaining };
    }, [period]);

    const handleExport = (type: 'csv' | 'pdf') => {
        const periodName = `periode_${format(new Date(period.periodStart), "yyyy-MM-dd")}`;
        const expenses = period.expenses || [];
        const incomes = period.incomes || [];
        const categoryMap = new Map((period.categories || []).map(c => [c.id, c.name]));

        if (type === 'csv') {
            const headers = ['Tanggal', 'Tipe', 'Kategori/Detail', 'Jumlah', 'Catatan'];
            const allTransactions = [
                ...incomes.map(i => ({ type: 'Pemasukan', date: i.date, category: 'Pemasukan Tambahan', amount: i.amount, notes: i.notes })),
                ...expenses.map(e => ({ type: 'Pengeluaran', date: e.date, category: categoryMap.get(e.categoryId) || 'N/A', amount: -e.amount, notes: e.notes }))
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            let rows = allTransactions.map(t => [
                new Date(t.date).toLocaleString('en-CA'),
                t.type,
                `"${t.category}"`,
                t.amount,
                `"${t.notes?.replace(/"/g, '""') || ''}"`
            ].join(','));
            
            rows.push('');
            rows.push(`"Total Pemasukan Tambahan",${summary.totalAddedIncomes}`);
            rows.push(`"Total Pengeluaran",${-summary.totalExpenses}`);
            rows.push(`"Sisa Anggaran",${summary.remaining}`);

            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `jagaduit_export_${periodName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else { // PDF
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`Laporan Anggaran Periode ${format(new Date(period.periodStart), "d MMM yyyy")}`, 14, 22);

            autoTable(doc, {
                head: [['Kategori', 'Anggaran', 'Realisasi', 'Sisa']],
                body: (period.categories || []).map(c => {
                    const spent = expenses.reduce((sum, exp) => {
                        if (exp.isSplit) {
                            return sum + (exp.splits || []).filter(s => s.categoryId === c.id).reduce((splitSum, s) => splitSum + s.amount, 0);
                        }
                        if (exp.categoryId === c.id) {
                            return sum + exp.amount;
                        }
                        return sum;
                    }, 0);
                    return [
                        c.name,
                        formatCurrency(c.budget),
                        formatCurrency(spent),
                        formatCurrency(c.budget - spent)
                    ];
                }),
                startY: 30,
            });

            const finalY = (doc as any).lastAutoTable.finalY || 100;
            autoTable(doc, {
                startY: finalY + 10,
                head: [['Ringkasan', 'Jumlah']],
                body: [
                    ['Pemasukan Tambahan', formatCurrency(summary.totalAddedIncomes)],
                    ['Total Pengeluaran', formatCurrency(summary.totalExpenses)],
                    ['Sisa Anggaran', formatCurrency(summary.remaining)],
                ],
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] }
            });

            doc.save(`jagaduit_laporan_${periodName}.pdf`);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="font-headline text-lg">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                {!isCurrent && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive flex-shrink-0"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
                        aria-label="Hapus Arsip"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-md">
                        <TrendingUp className="h-5 w-5 text-green-500"/>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Pemasukan Tambahan</p>
                        <p className="font-bold">{formatCurrency(summary.totalAddedIncomes)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-md">
                       <TrendingDown className="h-5 w-5 text-red-500"/>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Pengeluaran</p>
                        <p className="font-bold">{formatCurrency(summary.totalExpenses)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                        <WalletIcon className="h-5 w-5 text-blue-500"/>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Sisa</p>
                        <p className="font-bold">{formatCurrency(summary.remaining)}</p>
                    </div>
                </div>
            </CardContent>
             <CardFooter className="border-t p-3 flex flex-wrap justify-between items-center gap-2">
                 <Button asChild variant="link" size="sm">
                    <Link href={`/history/${id}`}>
                        Lihat Detail <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
                        <FileDown className="h-4 w-4 mr-2"/> CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>
                        <FileType2 className="h-4 w-4 mr-2"/> PDF
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

const TransactionList = React.memo(({ transactions, categoryMap, walletMap, onTransactionClick }: {
    transactions: UnifiedTransaction[];
    categoryMap: Map<string, Category>;
    walletMap: Map<string, Wallet>;
    onTransactionClick: (item: UnifiedTransaction) => void;
}) => {
    if (transactions.length === 0) {
        return (
            <div className="h-24 text-center flex flex-col justify-center items-center">
                <p className="font-semibold">Tidak ada transaksi ditemukan.</p>
                <p className="text-sm text-muted-foreground">Coba ubah filter Anda.</p>
            </div>
        );
    }
    return (
        <div className="space-y-1">
            {transactions.map(item => (
                <TransactionItem
                    key={item.id}
                    transaction={item}
                    categoryMap={categoryMap}
                    walletMap={walletMap}
                    onClick={() => onTransactionClick(item)}
                />
            ))}
        </div>
    );
});
TransactionList.displayName = 'TransactionList';

export default function HistoryPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [currentPeriod, setCurrentPeriod] = React.useState<BudgetPeriod | null>(null);
    const [archivedPeriods, setArchivedPeriods] = React.useState<(BudgetPeriod & {id: string})[]>([]);
    const [archiveToDelete, setArchiveToDelete] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    const [allTransactions, setAllTransactions] = React.useState<UnifiedTransaction[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
    const [detailItem, setDetailItem] = React.useState<UnifiedTransaction | null>(null);
    const [typeFilter, setTypeFilter] = React.useState<'all' | 'income' | 'expense'>('all');
    const [walletFilter, setWalletFilter] = React.useState<string>('all');
    
    const [allCategories, setAllCategories] = React.useState<Category[]>([]);
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
    const [debts, setDebts] = React.useState<Debt[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    const [isExpenseFormOpen, setIsExpenseFormOpen] = React.useState(false);
    const [isIncomeFormOpen, setIsIncomeFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<UnifiedTransaction | null>(null);
    const [itemToDelete, setItemToDelete] = React.useState<UnifiedTransaction | null>(null);

    const loadData = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const allBudgetPeriods: (BudgetPeriod & {id: string})[] = [];
            let allCats: Category[] = [];

            const currentDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            const currentDocSnap = await getDoc(currentDocRef);
            if (currentDocSnap.exists()) {
                const data = convertTimestamps(currentDocSnap.data());
                if (data.periodStart) {
                    setCurrentPeriod(data);
                    allBudgetPeriods.push({ id: 'current', ...data });
                    allCats.push(...(data.categories || []));
                }
            } else {
                setCurrentPeriod(null);
            }

            const archiveQuery = query(collection(db, 'users', user.uid, 'archivedBudgets'), orderBy('periodStart', 'desc'));
            const archiveSnapshot = await getDocs(archiveQuery);
            const archives = archiveSnapshot.docs
                .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }))
                .filter(period => period.periodStart) as (BudgetPeriod & {id: string})[];
            setArchivedPeriods(archives);
            archives.forEach(arch => {
                allBudgetPeriods.push(arch);
                (arch.categories || []).forEach(cat => {
                    if (!allCats.find(c => c.id === cat.id)) {
                        allCats.push(cat);
                    }
                });
            });
            setAllCategories(allCats);
            
            const walletsSnapshot = await getDocs(collection(db, 'users', user.uid, 'wallets'));
            const walletsData = walletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Wallet[];
            setWallets(walletsData);
            const goalsSnapshot = await getDocs(collection(db, 'users', user.uid, 'savingGoals'));
            setSavingGoals(goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavingGoal[]);
            const debtsSnapshot = await getDocs(collection(db, 'users', user.uid, 'debts'));
            setDebts(debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[]);
            
            const unifiedTransactions: UnifiedTransaction[] = [];
            const categoryMap = new Map(allCats.map(c => [c.id, c]));

            allBudgetPeriods.forEach(period => {
                (period.expenses || []).forEach((exp: Expense) => {
                    const category = categoryMap.get(exp.categoryId);
                    unifiedTransactions.push({
                        ...exp,
                        periodId: period.id,
                        type: 'expense',
                        categoryName: category?.name,
                        categoryIcon: category ? iconMap[category.icon as keyof typeof iconMap] : Coins,
                    });
                });
                (period.incomes || []).forEach((inc: Income) => {
                    unifiedTransactions.push({
                        ...inc,
                        periodId: period.id,
                        type: 'income',
                        categoryName: 'Pemasukan Tambahan',
                        categoryIcon: TrendingUp,
                    });
                });
            });
            setAllTransactions(unifiedTransactions);

        } catch (error) {
            console.error("Failed to load history data from Firestore", error);
            toast({ title: 'Gagal Memuat Data', description: 'Tidak dapat memuat data riwayat dari cloud.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            loadData();
        }
    }, [user, authLoading, router, loadData]);

    const handleDeleteArchiveRequest = (periodId: string) => setArchiveToDelete(periodId);

    const confirmDeleteArchive = async () => {
        if (!archiveToDelete || !user) return;
        setIsDeleting(true);
        const archiveDocRef = doc(db, 'users', user.uid, 'archivedBudgets', archiveToDelete);
        try {
            await deleteDoc(archiveDocRef);
            toast({ title: "Sukses", description: "Arsip berhasil dihapus." });
            setArchiveToDelete(null);
            loadData();
        } catch (error) {
            console.error("Error deleting archive:", error);
            toast({ title: 'Gagal Menghapus Arsip', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const filteredTransactions = React.useMemo(() => {
        let filtered = allTransactions;
        
        if (dateRange?.from) {
            const from = startOfDay(dateRange.from);
            const to = dateRange.to ? endOfDay(dateRange.to) : from;
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= from && itemDate <= to;
            });
        }
        
        if (typeFilter !== 'all') {
            filtered = filtered.filter(item => item.type === typeFilter);
        }

        if (walletFilter !== 'all') {
            filtered = filtered.filter(item => item.walletId === walletFilter);
        }
        
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.notes?.toLowerCase().includes(lowercasedQuery) ||
                item.categoryName?.toLowerCase().includes(lowercasedQuery)
            );
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [allTransactions, dateRange, searchQuery, typeFilter, walletFilter]);

    const handleEditRequest = (item: UnifiedTransaction) => {
        setDetailItem(null);
        setEditingItem(item);
        if (item.type === 'expense') setIsExpenseFormOpen(true);
        else setIsIncomeFormOpen(true);
    };

    const handleDeleteTransactionRequest = (item: UnifiedTransaction) => {
        setDetailItem(null);
        setItemToDelete(item);
    };
    
    const confirmDeleteTransaction = async () => {
        if (!itemToDelete || !idToken) return;
        setIsDeleting(true);
        const result = await deleteTransaction(idToken, itemToDelete.periodId, itemToDelete.id, itemToDelete.type);
        if (result.success) {
            toast({ title: 'Sukses', description: 'Transaksi berhasil dihapus.' });
            loadData();
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setItemToDelete(null);
        setIsDeleting(false);
    };
    
    const handleSaveTransaction = async (data: Expense | Income, type: 'expense' | 'income') => {
        if (!idToken || !editingItem) return;
        const result = await updateTransaction(idToken, editingItem.periodId, data, type);
        if (result.success) {
            toast({ title: 'Sukses', description: 'Transaksi berhasil diperbarui.' });
            loadData();
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setIsExpenseFormOpen(false);
        setIsIncomeFormOpen(false);
        setEditingItem(null);
    };

    const categoryMap = React.useMemo(() => new Map(allCategories.map(c => [c.id, c])), [allCategories]);
    const walletMap = React.useMemo(() => new Map(wallets.map(w => [w.id, w])), [wallets]);
    const detailWallet = detailItem?.walletId ? walletMap.get(detailItem.walletId) : null;
    const expenseData = detailItem?.type === 'expense' ? (detailItem as Expense) : null;
    const detailSavingGoal = expenseData?.savingGoalId ? savingGoals.find(g => g.id === expenseData.savingGoalId) : null;
    const detailDebt = expenseData?.debtId ? debts.find(d => d.id === expenseData.debtId) : null;
    const detailCategory = detailItem?.type === 'expense' ? categoryMap.get(detailItem.categoryId || '') : null;
    const DetailCategoryIcon = detailCategory ? iconMap[detailCategory.icon as keyof typeof iconMap] : Tag;

    const isExpense = detailItem?.type === 'expense';
    const amountColor = isExpense ? "text-red-500" : "text-emerald-500";
    const badgeBg = isExpense ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500";
    const typeLabel = isExpense ? "Pengeluaran" : "Pemasukan";
    const walletLabel = isExpense ? "DIBAYAR DARI" : "MASUK KE";

    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const LoadingState = () => (
        <div className="space-y-4">
             <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
             <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                         <div className="text-right space-y-2">
                            <Skeleton className="h-4 w-20 ml-auto" />
                            <Skeleton className="h-3 w-24 ml-auto" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Riwayat &amp; Arsip Anggaran
                    </h1>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <Tabs defaultValue="all-transactions">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all-transactions">Semua Transaksi</TabsTrigger>
                        <TabsTrigger value="arsip-anggaran">Arsip Anggaran</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="all-transactions" className="mt-6 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Filter Transaksi</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-grow">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="Cari berdasarkan catatan atau kategori..."
                                            className="w-full pl-8"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                                        <SelectTrigger><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Tipe</SelectItem>
                                            <SelectItem value="expense">Pengeluaran</SelectItem>
                                            <SelectItem value="income">Pemasukan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={walletFilter} onValueChange={setWalletFilter}>
                                        <SelectTrigger><SelectValue placeholder="Semua Dompet" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Dompet</SelectItem>
                                            {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Hasil Pencarian</CardTitle>
                                <CardDescription>Menampilkan {isLoading ? '...' : filteredTransactions.length} transaksi sesuai filter.</CardDescription>
                            </CardHeader>
                            <CardContent>
                               {isLoading ? <LoadingState /> : (
                                    <TransactionList
                                        transactions={filteredTransactions}
                                        categoryMap={categoryMap}
                                        walletMap={walletMap}
                                        onTransactionClick={setDetailItem}
                                    />
                               )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="arsip-anggaran" className="mt-6 space-y-4">
                         {isLoading ? <LoadingState /> : (
                            <>
                                {!currentPeriod && archivedPeriods.length === 0 && (
                                    <div className="text-center text-muted-foreground py-16">
                                        <p className="text-lg font-semibold">Tidak Ada Data</p>
                                        <p>Belum ada riwayat atau arsip anggaran yang tersimpan.</p>
                                    </div>
                                )}
                                
                                {currentPeriod && (
                                    <PeriodCard period={currentPeriod} id="current" onDelete={() => {}} />
                                )}

                                {archivedPeriods.map((period) => (
                                    <PeriodCard key={period.id} period={period} id={period.id} onDelete={handleDeleteArchiveRequest} />
                                ))}
                            </>
                         )}
                    </TabsContent>
                </Tabs>
            </main>
            
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
                    <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
                        <DialogTitle className="font-bold text-xl text-slate-800 dark:text-white mx-auto">Detail Transaksi</DialogTitle>
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

                    <DialogFooter className="p-6 bg-white dark:bg-slate-950 border-t dark:border-slate-800 flex flex-row gap-3">
                        <button 
                            className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            onClick={() => detailItem && handleEditRequest(detailItem)}
                        >
                            <Pencil className="h-4 w-4" />
                            Ubah
                        </button>
                        <button 
                            className="flex-1 h-12 rounded-2xl border border-red-200 dark:border-red-900/50 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            onClick={() => detailItem && handleDeleteTransactionRequest(detailItem)}
                        >
                            <Trash2 className="h-4 w-4" />
                            Hapus
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
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

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Transaksi Ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus transaksi ini secara permanen dari riwayat Anda. Ini tidak bisa dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTransaction} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                           {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                           Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!archiveToDelete} onOpenChange={(open) => !open && setArchiveToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Arsip Ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data arsip untuk periode ini secara permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setArchiveToDelete(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteArchive} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
