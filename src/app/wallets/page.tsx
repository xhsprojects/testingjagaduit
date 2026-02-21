
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Wallet, Expense, Income, Category, SavingGoal, Debt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Wallet as WalletIcon, PlusCircle, Loader2, ArrowLeft, TrendingUp, TrendingDown, ArrowLeftRight, ChevronRight, Pencil, Trash2, History, X, Calendar, Landmark, CreditCard, Tag, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';
import { AddWalletForm } from '@/components/AddWalletForm';
import { deleteWallet } from './actions';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { AddIncomeForm } from '@/components/AddIncomeForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { updateTransaction, deleteTransaction } from '../history/actions';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { TransferFundsForm } from '@/components/TransferFundsForm';
import { iconMap } from '@/lib/icons';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type UnifiedTransaction = (Expense | Income) & {
  type: 'expense' | 'income';
};

const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (data?.toDate) {
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

export default function WalletsPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
    const [allIncomes, setAllIncomes] = React.useState<Income[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
    const [debts, setDebts] = React.useState<Debt[]>([]);
    
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingWallet, setEditingWallet] = React.useState<Wallet | null>(null);
    const [walletToDelete, setWalletToDelete] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);

    const [isAddExpenseFormOpen, setIsAddExpenseFormOpen] = React.useState(false);
    const [isAddIncomeFormOpen, setIsAddIncomeFormOpen] = React.useState(false);
    const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
    const [editingIncome, setEditingIncome] = React.useState<Income | null>(null);
    const [detailWallet, setDetailWallet] = React.useState<Wallet | null>(null);
    const [transactionDetail, setTransactionDetail] = React.useState<UnifiedTransaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = React.useState<UnifiedTransaction | null>(null);
    const [isTransferFormOpen, setIsTransferFormOpen] = React.useState(false);

    const [dialogFilter, setDialogFilter] = React.useState<{ tab: 'all' | 'expense' | 'income'; query: string }>({
        tab: 'all',
        query: '',
    });

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Data loading effect
    React.useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const walletsUnsub = onSnapshot(collection(db, 'users', user.uid, 'wallets'), (snapshot) => {
            const walletsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet));
            setWallets(walletsData.sort((a,b) => a.name.localeCompare(b.name)));
        }, (err) => {
            console.error("Failed to load wallets", err);
            toast({ title: "Gagal memuat dompet", variant: "destructive" });
        });
        
        const loadAllTransactions = async () => {
            const tempAllExpenses: Expense[] = [];
            const tempAllIncomes: Income[] = [];
            
            // Fetch current period
            const currentBudgetSnap = await getDoc(doc(db, 'users', user.uid, 'budgets', 'current'));
            if (currentBudgetSnap.exists()) {
                 const data = convertTimestamps(currentBudgetSnap.data());
                 tempAllExpenses.push(...(data.expenses || []));
                 tempAllIncomes.push(...(data.incomes || []));
                 setCategories(data.categories || []);
            }

            // Fetch archived periods
            const archivedSnaps = await getDocs(collection(db, 'users', user.uid, 'archivedBudgets'));
            archivedSnaps.forEach(docSnap => {
                const data = convertTimestamps(docSnap.data());
                tempAllExpenses.push(...(data.expenses || []));
                tempAllIncomes.push(...(data.incomes || []));
            });
            
            setAllExpenses(tempAllExpenses);
            setAllIncomes(tempAllIncomes);
        };
        
        loadAllTransactions().catch(err => {
             console.error("Failed to load all transaction data", err);
             toast({ title: "Gagal memuat semua riwayat transaksi", variant: "destructive" });
        });
        
        const goalsUnsub = onSnapshot(collection(db, 'users', user.uid, 'savingGoals'), (snapshot) => {
            setSavingGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingGoal)));
        });

        const debtsUnsub = onSnapshot(collection(db, 'users', user.uid, 'debts'), (snapshot) => {
            setDebts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt)));
            setIsLoading(false); // Set loading to false after the last fetch
        });

        return () => {
            walletsUnsub();
            goalsUnsub();
            debtsUnsub();
        };
    }, [user, toast]);
    
    const calculateWalletBalance = React.useCallback((walletId: string, initialBalance: number) => {
        const totalIncome = allIncomes.filter(i => i.walletId === walletId).reduce((sum, inc) => sum + inc.amount, 0);
        const totalExpense = allExpenses.filter(e => e.walletId === walletId).reduce((sum, e) => sum + e.amount, 0);
        return initialBalance + totalIncome - totalExpense;
    }, [allIncomes, allExpenses]);

    const totalAllWalletsBalance = React.useMemo(() => {
        return wallets.reduce((total, wallet) => {
            return total + calculateWalletBalance(wallet.id, wallet.initialBalance);
        }, 0);
    }, [wallets, calculateWalletBalance]);
    
     const walletsWithBalance = React.useMemo(() => {
        return wallets.map(wallet => ({
            ...wallet,
            currentBalance: calculateWalletBalance(wallet.id, wallet.initialBalance),
        })).sort((a,b) => b.currentBalance - a.currentBalance);
    }, [wallets, calculateWalletBalance]);

    const handleOpenForm = (wallet?: Wallet) => {
        setEditingWallet(wallet || null);
        setIsFormOpen(true);
    };

    const handleDeleteRequest = (walletId: string) => {
        setDetailWallet(null);
        setWalletToDelete(walletId);
    };

    const confirmDelete = async () => {
        if (!walletToDelete || !idToken) return;
        setIsDeleting(true);
        const result = await deleteWallet(idToken, walletToDelete);
        if (result.success) {
            toast({ title: 'Sukses', description: result.message });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setWalletToDelete(null);
        setIsDeleting(false);
    };
    
    const handleSaveTransaction = async (data: Expense | Income, type: 'expense' | 'income') => {
        if (!idToken) return;
        const currentPeriodId = 'current';

        const result = await updateTransaction(idToken, currentPeriodId, data, type);
        if (result.success) {
            toast({ title: "Sukses", description: `Transaksi berhasil disimpan.` });
        } else {
            toast({ title: "Gagal", description: result.message, variant: "destructive" });
        }
        
        setIsAddExpenseFormOpen(false);
        setIsAddIncomeFormOpen(false);
        setEditingExpense(null);
        setEditingIncome(null);
    };
    
    const handleDeleteTransactionRequest = (item: UnifiedTransaction) => {
        setTransactionToDelete(item);
    };

    const confirmDeleteTransaction = async () => {
        if (!transactionToDelete || !idToken) return;
        setIsDeleting(true);
        const result = await deleteTransaction(idToken, 'current', transactionToDelete.id, transactionToDelete.type);
        if (result.success) {
            toast({ title: 'Sukses', description: 'Transaksi berhasil dihapus.' });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setTransactionToDelete(null);
        setTransactionDetail(null); 
        setIsDeleting(false);
    };
    
    const handleEditTransaction = (item: UnifiedTransaction) => {
        setTransactionDetail(null);
        if (item.type === 'expense') {
            setEditingExpense(item as Expense);
            setIsAddExpenseFormOpen(true);
        } else {
            setEditingIncome(item as Income);
            setIsAddIncomeFormOpen(true);
        }
    };

    const categoryMap = new Map(categories.map(c => [c.id, { name: c.name, icon: c.icon }]));

    const filteredTransactionsForWallet = React.useMemo(() => {
        if (!detailWallet) return [];
        const walletExpenses = allExpenses.filter(e => e.walletId === detailWallet.id).map(e => ({...e, type: 'expense' as const}));
        const walletIncomes = allIncomes.filter(i => i.walletId === detailWallet.id).map(i => ({...i, type: 'income' as const}));
        
        let allTransactions: UnifiedTransaction[] = [...walletExpenses, ...walletIncomes];

        if (dialogFilter.tab !== 'all') {
            allTransactions = allTransactions.filter(t => t.type === dialogFilter.tab);
        }

        if (dialogFilter.query) {
            const lowercasedQuery = dialogFilter.query.toLowerCase();
            allTransactions = allTransactions.filter(t => {
                const category = t.type === 'expense' ? categoryMap.get(t.categoryId) : null;
                const noteMatch = t.notes?.toLowerCase().includes(lowercasedQuery);
                const categoryMatch = category?.name.toLowerCase().includes(lowercasedQuery);
                const incomeMatch = t.type === 'income' && 'pemasukan'.includes(lowercasedQuery);
                return noteMatch || categoryMatch || incomeMatch;
            });
        }
        
        return allTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allExpenses, allIncomes, detailWallet, dialogFilter.tab, dialogFilter.query, categoryMap]);

    const handleWalletClick = (wallet: Wallet) => {
        setDetailWallet(wallet);
        setDialogFilter({ tab: 'all', query: '' });
    };

    const handleEditWalletClick = (wallet: Wallet) => {
        setDetailWallet(null);
        handleOpenForm(wallet);
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat Data Dompet...</div>
            </div>
        );
    }

    const detailSavingGoal = transactionDetail?.type === 'expense' && (transactionDetail as Expense).savingGoalId ? savingGoals.find(g => g.id === (transactionDetail as Expense).savingGoalId) : null;
    const detailDebt = transactionDetail?.type === 'expense' && (transactionDetail as Expense).debtId ? debts.find(d => d.id === (transactionDetail as Expense).debtId) : null;
    const detailCategory = transactionDetail?.type === 'expense' && (transactionDetail as Expense).categoryId ? categoryMap.get((transactionDetail as Expense).categoryId) : null;
    const DetailCategoryIcon = detailCategory ? iconMap[detailCategory.icon as keyof typeof iconMap] : Tag;

    const isExpense = transactionDetail?.type === 'expense';
    const amountColor = isExpense ? "text-red-500" : "text-emerald-500";
    const badgeBg = isExpense ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500";
    const typeLabel = isExpense ? "Pengeluaran" : "Pemasukan";
    const walletLabel = isExpense ? "DIBAYAR DARI" : "MASUK KE";
    const detailWalletObj = transactionDetail?.walletId ? wallets.find(w => w.id === transactionDetail.walletId) : null;
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex items-center gap-2">
                    <WalletIcon className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Manajemen Dompet
                    </h1>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-24">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Ringkasan Total Saldo</CardTitle>
                        <CardDescription>Total dana yang Anda miliki di semua dompet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold font-headline text-primary">{formatCurrency(totalAllWalletsBalance)}</p>
                    </CardContent>
                </Card>

                {wallets.length === 0 ? (
                     <div className="text-center text-muted-foreground py-16">
                        <p className="text-lg font-semibold">Belum Ada Dompet</p>
                        <p>Anda belum menambahkan sumber dana. Gunakan tombol (+) untuk memulai.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {walletsWithBalance.map(wallet => {
                            const Icon = iconMap[wallet.icon as keyof typeof iconMap] || WalletIcon;
                            return (
                                <Card 
                                    key={wallet.id}
                                    className="flex flex-col cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                                >
                                    <CardHeader className="flex-grow pb-2" onClick={() => handleWalletClick(wallet)}>
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg">
                                                <Icon className="h-7 w-7 text-primary" />
                                            </div>
                                             <p className="text-2xl font-bold font-headline text-foreground/90 mt-1 text-right">
                                                {formatCurrency(wallet.currentBalance)}
                                            </p>
                                        </div>
                                         <CardTitle className="font-headline text-lg leading-tight pt-2">{wallet.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0" onClick={() => handleWalletClick(wallet)}>
                                         <p className="text-xs text-muted-foreground">Saldo Awal: {formatCurrency(wallet.initialBalance)}</p>
                                    </CardContent>
                                    <CardFooter className="grid grid-cols-3 gap-2 pt-3 border-t">
                                        <Button variant="outline" size="sm" onClick={() => handleWalletClick(wallet)}>
                                            <History className="mr-2 h-4 w-4"/> Riwayat
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenForm(wallet); }}>
                                            <Pencil className="mr-2 h-4 w-4"/> Ubah
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(wallet.id); }}>
                                            <Trash2 className="mr-2 h-4 w-4"/> Hapus
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>

            <SpeedDial mainIcon={<PlusCircle className="h-7 w-7" />} position="bottom-right">
                 <SpeedDialAction label="Transfer Dana" onClick={() => setIsTransferFormOpen(true)}>
                    <ArrowLeftRight className="h-5 w-5 text-purple-500" />
                </SpeedDialAction>
                 <SpeedDialAction label="Tambah Pengeluaran" onClick={() => setIsAddExpenseFormOpen(true)}>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                </SpeedDialAction>
                <SpeedDialAction label="Tambah Pemasukan" onClick={() => setIsAddIncomeFormOpen(true)}>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                </SpeedDialAction>
                <SpeedDialAction label="Tambah Dompet Baru" onClick={() => handleOpenForm()}>
                    <WalletIcon className="h-5 w-5 text-blue-500" />
                </SpeedDialAction>
            </SpeedDial>

            <AddWalletForm
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                walletToEdit={editingWallet}
            />
            
            <TransferFundsForm
                isOpen={isTransferFormOpen}
                onOpenChange={setIsTransferFormOpen}
                wallets={wallets}
                expenses={allExpenses}
                incomes={allIncomes}
            />

            <AddExpenseForm
                isOpen={isAddExpenseFormOpen}
                onOpenChange={handleAddExpenseFormOpenChange}
                categories={categories}
                savingGoals={savingGoals}
                debts={debts}
                wallets={wallets}
                expenses={allExpenses}
                incomes={allIncomes}
                onSubmit={(data) => handleSaveTransaction(data, 'expense')}
                expenseToEdit={editingExpense}
            />
            
            <AddIncomeForm
                isOpen={isAddIncomeFormOpen}
                onOpenChange={handleAddIncomeFormOpenChange}
                wallets={wallets}
                expenses={allExpenses}
                incomes={allIncomes}
                onSubmit={(data) => handleSaveTransaction(data, 'income')}
                incomeToEdit={editingIncome}
            />
            
            <Dialog open={!!detailWallet} onOpenChange={(open) => !open && setDetailWallet(null)}>
                <DialogContent className="h-full flex flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className='font-headline'>{detailWallet?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <Input 
                            placeholder="Cari transaksi..."
                            value={dialogFilter.query}
                            onChange={(e) => setDialogFilter(prev => ({ ...prev, query: e.target.value }))}
                        />
                         <Tabs 
                            value={dialogFilter.tab} 
                            onValueChange={(value) => setDialogFilter(prev => ({...prev, tab: value as any}))} 
                            className="w-full mt-2"
                        >
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="all">Semua</TabsTrigger>
                                <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
                                <TabsTrigger value="income">Pemasukan</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Detail</TableHead>
                                    <TableHead className="text-right">Jumlah</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {filteredTransactionsForWallet.length > 0 ? (
                                    filteredTransactionsForWallet.map(t => {
                                        const category = t.type === 'expense' ? categoryMap.get(t.categoryId) : null;
                                        return (
                                        <TableRow key={t.id} onClick={() => setTransactionDetail(t)} className="cursor-pointer">
                                            <TableCell>
                                                <p className="font-medium">{t.notes || category?.name || 'Pemasukan'}</p>
                                                <p className="text-xs text-muted-foreground">{format(t.date, 'd MMM, HH:mm')}</p>
                                            </TableCell>
                                            <TableCell className={`text-right font-semibold ${t.type === 'income' ? 'text-green-600' : ''}`}>
                                                {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                            </TableCell>
                                        </TableRow>
                                    )})
                               ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">Tidak ada transaksi ditemukan.</TableCell>
                                    </TableRow>
                               )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="p-4 border-t flex justify-end gap-2">
                        <Button variant="destructive" onClick={() => detailWallet && handleDeleteRequest(detailWallet.id)}>Hapus</Button>
                        <Button variant="outline" onClick={() => detailWallet && handleEditWalletClick(detailWallet)}>Ubah</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!transactionDetail} onOpenChange={(open) => !open && setTransactionDetail(null)}>
                <DialogContent className="sm:max-w-lg sm:rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
                        <DialogTitle className="font-bold text-xl text-slate-800 dark:text-white mx-auto">Detail Transaksi</DialogTitle>
                        <DialogClose className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </DialogClose>
                    </DialogHeader>
                    
                    {transactionDetail && (
                        <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh] hide-scrollbar">
                            {/* Amount Card */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] p-10 text-center border border-slate-100 dark:border-slate-800 shadow-inner">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{typeLabel}</p>
                                <p className={cn("text-5xl font-black tracking-tighter mb-4", amountColor)}>
                                    {formatCurrency(transactionDetail.amount || 0)}
                                </p>
                                <Badge variant="outline" className={cn("border-none font-black uppercase text-[10px] tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm", badgeBg)}>
                                    {transactionDetail.type}
                                </Badge>
                            </div>

                            <div className="space-y-8 px-2">
                                {/* Date */}
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                                        <Calendar className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TANGGAL</p>
                                        <p className="font-bold text-slate-800 dark:text-white text-base">
                                            {transactionDetail.date ? format(new Date(transactionDetail.date), "EEEE, d MMMM yyyy", { locale: idLocale }) : '-'}
                                        </p>
                                        <p className="text-sm font-bold text-slate-400 mt-0.5">{transactionDetail.date ? format(new Date(transactionDetail.date), "HH:mm") : '-'}</p>
                                    </div>
                                </div>

                                {/* Wallet */}
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 shrink-0 shadow-sm">
                                        <WalletIcon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{walletLabel}</p>
                                        <p className="font-bold text-slate-800 dark:text-white text-base">{detailWalletObj?.name || 'Tanpa Dompet'}</p>
                                    </div>
                                </div>

                                {/* Category */}
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

                                {/* Saving Goal */}
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

                                {/* Debt */}
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

                                {/* Notes */}
                                <div className="flex items-start gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">CATATAN</p>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                "{transactionDetail.notes || 'Tidak ada catatan untuk transaksi ini'}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="p-8 bg-white dark:bg-slate-950 border-t dark:border-slate-800 flex flex-col gap-4">
                        <Button 
                            className="w-full h-16 rounded-[1.5rem] bg-[#F97316] hover:bg-[#EA580C] text-white font-black text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                            onClick={() => transactionDetail && handleEditTransaction(transactionDetail)}
                        >
                            <Pencil className="h-6 w-6" />
                            Ubah Transaksi
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full text-red-500 font-black uppercase text-xs tracking-[0.2em] hover:bg-red-50 dark:hover:bg-red-900/20 h-10 rounded-xl"
                            onClick={() => transactionDetail && handleDeleteTransactionRequest(transactionDetail)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Hapus Transaksi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!walletToDelete} onOpenChange={(open) => !open && setWalletToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Tindakan ini akan menghapus dompet secara permanen. Ini hanya dapat dilakukan jika belum ada transaksi yang terkait dengannya.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setWalletToDelete(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Transaksi Ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTransaction} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
