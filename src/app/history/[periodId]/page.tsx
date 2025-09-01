
"use client"

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { BudgetPeriod, Expense, Income, SavingGoal, Debt, Wallet, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Search, TrendingDown, TrendingUp, Wallet as WalletIcon, CreditCard, Landmark, FileText, Calendar, Tag, Coins, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { DateRangePicker } from '@/components/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { iconMap } from '@/lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { AddIncomeForm } from '@/components/AddIncomeForm';
import { updateTransaction, deleteTransaction } from '../actions';

const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (typeof data.toDate === 'function') {
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  if (typeof data === 'object' && data !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key of Object.keys(data)) {
      newObj[key] = convertTimestamps(data[key]);
    }
    return newObj;
  }
  return data;
};

// Combined type for the unified list
type UnifiedTransaction = (Expense | Income) & {
    type: 'income' | 'expense';
    categoryName?: string;
    categoryIcon?: React.ElementType;
};

export default function HistoryDetailPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const periodId = params.periodId as string;
    const { toast } = useToast();

    const [period, setPeriod] = React.useState<BudgetPeriod | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
    const [detailItem, setDetailItem] = React.useState<(UnifiedTransaction) | null>(null);
    
    // State for all data from all periods for passing to forms
    const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
    const [allIncomes, setAllIncomes] = React.useState<Income[]>([]);
    const [allCategories, setAllCategories] = React.useState<Category[]>([]);
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
    const [debts, setDebts] = React.useState<Debt[]>([]);
    
    // CRUD state
    const [isExpenseFormOpen, setIsExpenseFormOpen] = React.useState(false);
    const [isIncomeFormOpen, setIsIncomeFormOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<UnifiedTransaction | null>(null);
    const [itemToDelete, setItemToDelete] = React.useState<UnifiedTransaction | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);


    const loadData = React.useCallback(async () => {
        if (!user || !periodId) return;
        setIsLoading(true);
        try {
            // Load current period data
            let docRef = periodId === 'current'
                ? doc(db, 'users', user.uid, 'budgets', 'current')
                : doc(db, 'users', user.uid, 'archivedBudgets', periodId);
            
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const periodData = convertTimestamps(docSnap.data()) as BudgetPeriod;
                setPeriod(periodData);
                setDateRange({ from: new Date(periodData.periodStart), to: periodData.periodEnd ? new Date(periodData.periodEnd) : new Date() });
            } else {
                toast({ title: "Error", description: "Data periode tidak ditemukan.", variant: "destructive" });
                router.push('/history');
                return;
            }

            // Load all historical data for accurate balance calculations in forms
            const tempAllExpenses: Expense[] = [];
            const tempAllIncomes: Income[] = [];
            const tempAllCategories: Category[] = [];
            const categoryMap = new Map<string, Category>();

            const currentBudgetSnap = await getDoc(doc(db, 'users', user.uid, 'budgets', 'current'));
            if (currentBudgetSnap.exists()) {
                const data = convertTimestamps(currentBudgetSnap.data());
                tempAllExpenses.push(...(data.expenses || []));
                tempAllIncomes.push(...(data.incomes || []));
                (data.categories || []).forEach((c: Category) => !categoryMap.has(c.id) && categoryMap.set(c.id, c));
            }
            const archivedSnaps = await getDocs(collection(db, 'users', user.uid, 'archivedBudgets'));
            archivedSnaps.forEach(docSnap => {
                const data = convertTimestamps(docSnap.data());
                tempAllExpenses.push(...(data.expenses || []));
                tempAllIncomes.push(...(data.incomes || []));
                (data.categories || []).forEach((c: Category) => !categoryMap.has(c.id) && categoryMap.set(c.id, c));
            });
            setAllExpenses(tempAllExpenses);
            setAllIncomes(tempAllIncomes);
            setAllCategories(Array.from(categoryMap.values()));
            
            const walletsSnapshot = await getDocs(collection(db, 'users', user.uid, 'wallets'));
            setWallets(walletsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Wallet)));
            const goalsSnapshot = await getDocs(collection(db, 'users', user.uid, 'savingGoals'));
            setSavingGoals(goalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as SavingGoal[]);
            const debtsSnapshot = await getDocs(collection(db, 'users', user.uid, 'debts'));
            setDebts(debtsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Debt[]);

        } catch (error) {
            console.error("Failed to load period data:", error);
            toast({ title: 'Gagal Memuat Data', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [user, periodId, router, toast]);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user && periodId) {
            loadData();
        }
    }, [user, authLoading, router, periodId, loadData]);

    const filteredTransactions = React.useMemo(() => {
        if (!period) return [];
        const categoryMap = new Map(period.categories.map(c => [c.id, c]));
        const allTransactions: UnifiedTransaction[] = [];

        (period.expenses || []).forEach(exp => {
            const category = categoryMap.get(exp.categoryId);
            allTransactions.push({
                ...exp,
                type: 'expense',
                categoryName: category?.name,
                categoryIcon: category ? iconMap[category.icon] : Coins,
            });
        });

        (period.incomes || []).forEach(inc => {
            allTransactions.push({
                ...inc,
                type: 'income',
                categoryName: 'Pemasukan Tambahan',
                categoryIcon: TrendingUp,
            });
        });
        
        let filtered = allTransactions
            .filter(item => {
                if (!dateRange?.from) return true;
                const itemDate = new Date(item.date);
                const from = new Date(dateRange.from);
                from.setHours(0, 0, 0, 0);
                const to = dateRange.to ? new Date(dateRange.to) : from;
                to.setHours(23, 59, 59, 999);
                return itemDate >= from && itemDate <= to;
            });
        
        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [period, dateRange, searchQuery]);

    const summaryStats = React.useMemo(() => {
        if (!period) return { income: 0, expenses: 0, remaining: 0 };
        // FIX: Calculate income only from additional incomes, not base budget
        const income = (period.incomes || []).reduce((sum, i) => sum + i.amount, 0);
        const expenses = (period.expenses || []).reduce((sum, e) => sum + e.amount, 0);
        return {
            income,
            expenses,
            remaining: (period.income || 0) + income - expenses, // Remaining budget should still consider base budget
        };
    }, [period]);

    const handleEditRequest = (item: UnifiedTransaction) => {
        setDetailItem(null);
        setEditingItem(item);
        if (item.type === 'expense') {
            setIsExpenseFormOpen(true);
        } else {
            setIsIncomeFormOpen(true);
        }
    };
    
    const handleDeleteRequest = (item: UnifiedTransaction) => {
        setDetailItem(null);
        setItemToDelete(item);
    };

    const confirmDelete = async () => {
        if (!itemToDelete || !idToken) return;
        setIsDeleting(true);
        const result = await deleteTransaction(idToken, periodId, itemToDelete.id, itemToDelete.type);
        if (result.success) {
            toast({ title: "Sukses", description: "Transaksi berhasil dihapus." });
            loadData(); // Refresh data
        } else {
            toast({ title: "Gagal", description: result.message, variant: "destructive" });
        }
        setItemToDelete(null);
        setIsDeleting(false);
    };

    const handleSaveTransaction = async (data: Expense | Income, type: 'expense' | 'income') => {
        if (!idToken) return;
        const result = await updateTransaction(idToken, periodId, data, type);
         if (result.success) {
            toast({ title: "Sukses", description: "Transaksi berhasil diperbarui." });
            loadData(); // Refresh data
            setIsExpenseFormOpen(false);
            setIsIncomeFormOpen(false);
            setEditingItem(null);
        } else {
            toast({ title: "Gagal", description: result.message, variant: "destructive" });
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold">Memuat Detail Periode...</p>
            </div>
        );
    }
    
    if (!period) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <p className="text-lg font-semibold text-destructive">Gagal memuat data periode.</p>
            </div>
        )
    }
    
    const detailTransactionData = detailItem ? (detailItem.type === 'expense' ? period.expenses.find(e => e.id === detailItem.id) : period.incomes.find(i => i.id === detailItem.id)) : null;
    const detailWallet = detailItem && detailTransactionData?.walletId ? wallets.find(w => w.id === (detailTransactionData as Expense | Income).walletId) : null;
    const detailSavingGoal = detailItem?.type === 'expense' && detailTransactionData ? savingGoals.find(g => g.id === (detailTransactionData as Expense).savingGoalId) : null;
    const detailDebt = detailItem?.type === 'expense' && detailTransactionData ? debts.find(d => d.id === (detailTransactionData as Expense).debtId) : null;
    const DetailCategoryIcon = detailItem?.categoryIcon;


    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Kembali</span>
            </Button>
            <h1 className="font-headline text-xl font-bold text-foreground truncate">
                {periodId === 'current' ? 'Riwayat Periode Ini' : `Arsip Periode`}
            </h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center gap-4">
                        <TrendingUp className="h-6 w-6 text-green-500 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-muted-foreground">Pemasukan Tambahan</p>
                            <p className="font-bold text-lg">{formatCurrency(summaryStats.income)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                     <CardContent className="pt-6 flex items-center gap-4">
                        <TrendingDown className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                            <p className="font-bold text-lg">{formatCurrency(summaryStats.expenses)}</p>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                     <CardContent className="pt-6 flex items-center gap-4">
                        <WalletIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-muted-foreground">Sisa Anggaran</p>
                            <p className="font-bold text-lg">{formatCurrency(summaryStats.remaining)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transaksi</TableHead>
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
                                                    <span className="font-medium">{item.categoryName || 'Lainnya'}</span>
                                                </div>
                                            </TableCell>
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

        </main>
        
        <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Detail Transaksi</DialogTitle>
                </DialogHeader>
                {detailItem && detailTransactionData && (
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
                    <Button variant="ghost" className="text-destructive" onClick={() => handleDeleteRequest(detailItem!)}>Hapus</Button>
                    <Button onClick={() => handleEditRequest(detailItem!)}>Ubah Transaksi</Button>
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
            expenses={allExpenses}
            incomes={allIncomes}
        />
        
        <AddIncomeForm
            isOpen={isIncomeFormOpen}
            onOpenChange={setIsIncomeFormOpen}
            wallets={wallets}
            onSubmit={(data) => handleSaveTransaction(data, 'income')}
            incomeToEdit={editingItem?.type === 'income' ? editingItem as Income : null}
            expenses={allExpenses}
            incomes={allIncomes}
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
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                       {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                       Ya, Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </div>
    );
}
