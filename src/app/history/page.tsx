
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { BudgetPeriod, Category, Debt, Expense, Income, SavingGoal, Wallet } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Archive, ChevronRight, TrendingUp, TrendingDown, Wallet as WalletIcon, Loader2, Trash2, FileDown, FileType2, Search, Tag, Coins, FileText, Calendar, Landmark, CreditCard, Pencil, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { iconMap } from '@/lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { AddIncomeForm } from '@/components/AddIncomeForm';
import { updateTransaction, deleteTransaction } from './actions';

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
  type: 'expense' | 'income';
  periodId: string;
  categoryName?: string;
  categoryIcon?: React.ElementType;
};

// Component for a single period card
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

    const totalIncome = (period.incomes || []).reduce((sum, i) => sum + i.amount, period.income || 0);
    const totalExpenses = (period.expenses || []).reduce((sum, e) => sum + e.amount, 0);
    const remaining = totalIncome - totalExpenses;

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

            const rows = allTransactions.map(t => [
                new Date(t.date).toLocaleString('en-CA'),
                t.type,
                `"${t.category}"`,
                t.amount,
                `"${t.notes?.replace(/"/g, '""') || ''}"`
            ].join(','));
            
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
                    const spent = expenses.filter(e => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0);
                    return [
                        c.name,
                        formatCurrency(c.budget),
                        formatCurrency(spent),
                        formatCurrency(c.budget - spent)
                    ];
                }),
                startY: 30,
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
                        <p className="text-muted-foreground">Pemasukan</p>
                        <p className="font-bold">{formatCurrency(totalIncome)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-md">
                       <TrendingDown className="h-5 w-5 text-red-500"/>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Pengeluaran</p>
                        <p className="font-bold">{formatCurrency(totalExpenses)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                        <WalletIcon className="h-5 w-5 text-blue-500"/>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Sisa</p>
                        <p className="font-bold">{formatCurrency(remaining)}</p>
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


export default function HistoryPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // State for Archive Tab
    const [currentPeriod, setCurrentPeriod] = React.useState<BudgetPeriod | null>(null);
    const [archivedPeriods, setArchivedPeriods] = React.useState<(BudgetPeriod & {id: string})[]>([]);
    const [archiveToDelete, setArchiveToDelete] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    // State for All Transactions Tab
    const [allTransactions, setAllTransactions] = React.useState<UnifiedTransaction[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [detailItem, setDetailItem] = React.useState<UnifiedTransaction | null>(null);
    
    // Shared state
    const [allCategories, setAllCategories] = React.useState<Category[]>([]);
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
    const [debts, setDebts] = React.useState<Debt[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    // CRUD State
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

            // Fetch current budget
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

            // Fetch archived budgets
            const archiveQuery = query(collection(db, 'users', user.uid, 'archivedBudgets'), orderBy('periodStart', 'desc'));
            const archiveSnapshot = await getDocs(archiveQuery);
            const archives = archiveSnapshot.docs
                .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) }))
                .filter(period => period.periodStart) as (BudgetPeriod & {id: string})[];
            setArchivedPeriods(archives);
            archives.forEach(arch => {
                allBudgetPeriods.push(arch);
                allCats.push(...(arch.categories || []));
            });
            setAllCategories(allCats);
            
            // Fetch shared data
            const walletsSnapshot = await getDocs(collection(db, 'users', user.uid, 'wallets'));
            setWallets(walletsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Wallet[]);
            const goalsSnapshot = await getDocs(collection(db, 'users', user.uid, 'savingGoals'));
            setSavingGoals(goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SavingGoal[]);
            const debtsSnapshot = await getDocs(collection(db, 'users', user.uid, 'debts'));
            setDebts(debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[]);
            
            // Compile all transactions
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
                        categoryIcon: category ? iconMap[category.icon] : Coins,
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
            loadData(); // Reload all data after deletion
        } catch (error) {
            console.error("Error deleting archive:", error);
            toast({ title: 'Gagal Menghapus Arsip', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const filteredTransactions = React.useMemo(() => {
        if (!allTransactions) return [];
        let filtered = allTransactions;
        
        if (dateRange?.from) {
            const from = new Date(dateRange.from);
            from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : from;
            to.setHours(23, 59, 59, 999);
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= from && itemDate <= to;
            });
        }
        
        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [allTransactions, dateRange, searchQuery]);

    const handleExport = (type: 'csv' | 'pdf') => {
        if (filteredTransactions.length === 0) {
            toast({ title: "Tidak Ada Data", description: "Tidak ada transaksi untuk diekspor pada filter ini.", variant: "destructive" });
            return;
        }

        const periodName = `riwayat_${format(new Date(), "yyyy-MM-dd")}`;
        const walletMap = new Map(wallets.map(w => [w.id, w.name]));

        if (type === 'csv') {
            const headers = ['Tanggal', 'Tipe', 'Kategori/Detail', 'Jumlah', 'Dompet', 'Catatan'];
            const rows = filteredTransactions.map(t => [
                new Date(t.date).toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                `"${t.categoryName || 'Lainnya'}"`,
                t.type === 'income' ? t.amount : -t.amount,
                `"${t.walletId ? walletMap.get(t.walletId) || '' : ''}"`,
                `"${t.notes?.replace(/"/g, '""') || ''}"`
            ].join(','));
            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `jagaduit_${periodName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else { // PDF
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`Riwayat Transaksi Jaga Duit`, 14, 22);
            doc.setFontSize(11);
            doc.text(`Filter: ${dateRange?.from ? format(dateRange.from, 'd MMM yyyy') : ''} - ${dateRange?.to ? format(dateRange.to, 'd MMM yyyy') : ''}`, 14, 30);

            const tableData = filteredTransactions.map(t => [
                format(new Date(t.date), "d MMM, HH:mm", { locale: idLocale }),
                t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
                t.categoryName || '-',
                formatCurrency(t.type === 'income' ? t.amount : -t.amount),
                t.walletId ? walletMap.get(t.walletId) || '-' : '-'
            ]);
            
            autoTable(doc, {
                head: [['Tanggal', 'Tipe', 'Kategori', 'Jumlah', 'Dompet']],
                body: tableData,
                startY: 38,
                headStyles: { fillColor: [41, 128, 185] },
            });
            doc.save(`jagaduit_${periodName}.pdf`);
        }
    };
    
    // CRUD handlers
    const handleEditRequest = (item: UnifiedTransaction) => {
        setDetailItem(null);
        setEditingItem(item);
        if (item.type === 'expense') setIsExpenseFormOpen(true);
        else setIsIncomeFormOpen(true);
    };

    const handleDeleteRequest = (item: UnifiedTransaction) => {
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

    // Detail Dialog Data
    const categoryMap = new Map(allCategories.map(c => [c.id, c]));
    const detailWallet = detailItem?.walletId ? wallets.find(w => w.id === detailItem.walletId) : null;
    const expenseData = detailItem?.type === 'expense' ? (detailItem as Expense) : null;
    const detailSavingGoal = expenseData?.savingGoalId ? savingGoals.find(g => g.id === expenseData.savingGoalId) : null;
    const detailDebt = expenseData?.debtId ? debts.find(d => d.id === expenseData.debtId) : null;
    const DetailCategoryIcon = detailItem?.categoryIcon;


    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold">Memuat Riwayat...</p>
            </div>
        );
    }
    
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
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Cari berdasarkan catatan atau kategori..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                        </div>

                        <Card>
                             <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <CardTitle className="font-headline">Tabel Transaksi</CardTitle>
                                        <CardDescription>Menampilkan {filteredTransactions.length} transaksi sesuai filter.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                                            <FileDown className="mr-2 h-4 w-4" /> CSV
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                                            <FileType2 className="mr-2 h-4 w-4" /> PDF
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Transaksi</TableHead>
                                            <TableHead className="hidden md:table-cell">Catatan</TableHead>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead className="text-right">Jumlah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTransactions.length > 0 ? (
                                            filteredTransactions.map(item => {
                                                const Icon = item.categoryIcon || Coins;
                                                return (
                                                    <TableRow key={item.id} onClick={() => setDetailItem(item)} className="cursor-pointer">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4 text-muted-foreground" />
                                                                <span className="font-medium truncate max-w-[120px] sm:max-w-xs">{item.categoryName || 'Lainnya'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="hidden md:table-cell max-w-xs truncate">{item.notes}</TableCell>
                                                        <TableCell>{format(new Date(item.date), "d MMM, HH:mm", { locale: idLocale })}</TableCell>
                                                        <TableCell className={cn("text-right font-semibold", item.type === 'income' ? 'text-green-600' : 'text-foreground')}>
                                                            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">Tidak ada transaksi yang cocok dengan filter Anda.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="arsip-anggaran" className="mt-6 space-y-4">
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
                    </TabsContent>
                </Tabs>
            </main>
            
            <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detail Transaksi</DialogTitle>
                    </DialogHeader>
                    {detailItem && (
                        <div className="space-y-4 py-2">
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
                                {detailItem.categoryName && detailItem.type === 'expense' && (
                                    <div className="flex items-start gap-3">
                                        <Tag className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-muted-foreground">Kategori</p>
                                            <p className="font-medium">{detailItem.categoryName}</p>
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
                     <DialogFooter>
                        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(detailItem!)}>Hapus</Button>
                        <Button onClick={() => handleEditRequest(detailItem!)}>Ubah</Button>
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
                        <AlertDialogAction onClick={confirmDeleteArchive} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
