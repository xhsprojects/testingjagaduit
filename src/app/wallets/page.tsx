
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Wallet, Expense, Income, Category, SavingGoal, Debt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Wallet as WalletIcon, PlusCircle, Loader2, ArrowLeft, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';
import { AddWalletForm } from '@/components/AddWalletForm';
import { deleteWallet } from './actions';
import { AddExpenseForm } from '@/components/AddExpenseForm';
import { AddIncomeForm } from '@/components/AddIncomeForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { updateTransaction, deleteTransaction } from '../history/actions';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { TransferFundsForm } from '@/components/TransferFundsForm';
import { WalletCard } from '@/components/WalletCard';

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
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [incomes, setIncomes] = React.useState<Income[]>([]);
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

        const budgetUnsub = onSnapshot(doc(db, 'users', user.uid, 'budgets', 'current'), (snapshot) => {
            if (snapshot.exists()) {
                const budgetData = convertTimestamps(snapshot.data());
                setExpenses(budgetData.expenses || []);
                setIncomes(budgetData.incomes || []);
                setCategories(budgetData.categories || []);
            } else {
                setExpenses([]);
                setIncomes([]);
                setCategories([]);
            }
        }, (err) => {
            console.error("Failed to load budget data", err);
            toast({ title: "Gagal memuat transaksi", variant: "destructive" });
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
            budgetUnsub();
            goalsUnsub();
            debtsUnsub();
        };
    }, [user, toast]);
    
    const calculateWalletBalance = React.useCallback((walletId: string, initialBalance: number) => {
        const totalIncome = incomes.filter(i => i.walletId === walletId).reduce((sum, i) => sum + i.amount, 0);
        const totalExpense = expenses.filter(e => e.walletId === walletId).reduce((sum, e) => sum + e.amount, 0);
        return initialBalance + totalIncome - totalExpense;
    }, [incomes, expenses]);

    const totalAllWalletsBalance = React.useMemo(() => {
        return wallets.reduce((total, wallet) => {
            return total + calculateWalletBalance(wallet.id, wallet.initialBalance);
        }, 0);
    }, [wallets, calculateWalletBalance]);

    const handleOpenForm = (wallet?: Wallet) => {
        setEditingWallet(wallet || null);
        setIsFormOpen(true);
    };

    const handleDeleteRequest = (walletId: string) => {
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
        const currentPeriodId = 'current'; // Wallets page only deals with current period

        // If it's a new transaction, assign a new ID. Otherwise, use the existing one.
        const transactionData = {
            ...data,
            id: type === 'expense'
                ? (editingExpense?.id || `exp-${Date.now()}`)
                : (editingIncome?.id || `inc-${Date.now()}`),
        };
        
        const result = await updateTransaction(idToken, currentPeriodId, transactionData, type);
        if (result.success) {
            toast({ title: "Sukses", description: `Transaksi berhasil ${editingExpense || editingIncome ? 'diperbarui' : 'ditambahkan'}.` });
        } else {
            toast({ title: "Gagal", description: result.message, variant: "destructive" });
        }
        
        // Close forms
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
        setTransactionDetail(null); // Close the detail view
        setIsDeleting(false);
    };
    
    const handleAddExpenseFormOpenChange = (open: boolean) => {
        if (!open) setEditingExpense(null);
        setIsAddExpenseFormOpen(open);
    };
    
    const handleAddIncomeFormOpenChange = (open: boolean) => {
        if (!open) setEditingIncome(null);
        setIsAddIncomeFormOpen(open);
    };

    const categoryMap = new Map(categories.map(c => [c.id, { name: c.name, icon: c.icon }]));

    const filteredTransactionsForWallet = React.useMemo(() => {
        if (!detailWallet) return [];
        const walletExpenses = expenses.filter(e => e.walletId === detailWallet.id).map(e => ({...e, type: 'expense' as const}));
        const walletIncomes = incomes.filter(i => i.walletId === detailWallet.id).map(i => ({...i, type: 'income' as const}));
        
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
    }, [expenses, incomes, detailWallet, dialogFilter.tab, dialogFilter.query, categoryMap]);

    const handleWalletClick = (wallet: Wallet) => {
        setDetailWallet(wallet);
        setDialogFilter({ tab: 'all', query: '' });
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat Data Dompet...</div>
            </div>
        );
    }
    
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
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-20">
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
                        {wallets.map(wallet => (
                            <WalletCard
                                key={wallet.id}
                                wallet={wallet}
                                balance={calculateWalletBalance(wallet.id, wallet.initialBalance)}
                                onHistory={() => handleWalletClick(wallet)}
                                onEdit={() => handleOpenForm(wallet)}
                                onDelete={() => handleDeleteRequest(wallet.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            <SpeedDial mainIcon={<PlusCircle className="h-7 w-7" />}>
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
                expenses={expenses}
                incomes={incomes}
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
                onSubmit={(data) => handleSaveTransaction(data, 'expense')}
                expenseToEdit={editingExpense}
            />
            
            <AddIncomeForm
                isOpen={isAddIncomeFormOpen}
                onOpenChange={handleAddIncomeFormOpenChange}
                wallets={wallets}
                expenses={expenses}
                incomes={incomes}
                onSubmit={(data) => handleSaveTransaction(data, 'income')}
                incomeToEdit={editingIncome}
            />
            
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
        </div>
    );
}

