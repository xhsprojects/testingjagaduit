
"use client"

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';

import type { Asset, Debt, Expense, SavingGoal, Wallet, Income } from '@/lib/types';
import { AddAssetForm } from '@/components/AddAssetForm';
import { formatCurrency } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Pencil, Trash2, Loader2, Gem, Lock, Scale, TrendingUp, TrendingDown, Home, Coins, Landmark, PiggyBank, Check } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';

const assetIconMap = {
    'Properti': Home,
    'Investasi': TrendingUp,
    'Kas & Setara Kas': Coins,
    'Lainnya': Gem,
};

export default function NetWorthPage() {
    const { user, loading: authLoading, isPremium } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [assets, setAssets] = React.useState<Asset[]>([]);
    const [debts, setDebts] = React.useState<Debt[]>([]);
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [savingGoals, setSavingGoals] = React.useState<SavingGoal[]>([]);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [incomes, setIncomes] = React.useState<Income[]>([]);

    const [isDataLoading, setIsDataLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);
    const [assetToDelete, setAssetToDelete] = React.useState<string | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    React.useEffect(() => {
        if (!user) return;
        
        const fetchData = async () => {
            setIsDataLoading(true);
            try {
                // Fetch all data points concurrently
                const assetsPromise = getDocs(collection(db, 'users', user.uid, 'assets'));
                const debtsPromise = getDocs(collection(db, 'users', user.uid, 'debts'));
                const walletsPromise = getDocs(collection(db, 'users', user.uid, 'wallets'));
                const goalsPromise = getDocs(collection(db, 'users', user.uid, 'savingGoals'));
                const budgetPromise = getDoc(doc(db, 'users', user.uid, 'budgets', 'current'));
                
                const [assetsSnap, debtsSnap, walletsSnap, goalsSnap, budgetSnap] = await Promise.all([assetsPromise, debtsPromise, walletsPromise, goalsPromise, budgetPromise]);

                setAssets(assetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
                setWallets(walletsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Wallet)));
                setSavingGoals(goalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SavingGoal)));

                const budgetExpenses = budgetSnap.exists() ? (budgetSnap.data()?.expenses || []) : [];
                const budgetIncomes = budgetSnap.exists() ? (budgetSnap.data()?.incomes || []) : [];
                setExpenses(budgetExpenses);
                setIncomes(budgetIncomes);
                
                const debtsData = debtsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Debt));
                const debtsWithPaidAmount = debtsData.map(debt => {
                    const paid = budgetExpenses
                        .filter((e: Expense) => e.debtId === debt.id)
                        .reduce((sum: number, e: Expense) => sum + e.amount, 0);
                    return { ...debt, totalAmount: debt.totalAmount - paid };
                });
                setDebts(debtsWithPaidAmount);

            } catch (error) {
                console.error("Error fetching net worth data:", error);
                toast({ title: 'Gagal Memuat Data Komprehensif', variant: 'destructive' });
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchData();

    }, [user, toast]);

    const handleSaveAsset = async (assetData: Asset) => {
        if (!user) return;
        const isEditing = assets.some(a => a.id === assetData.id);
        
        try {
            const assetDocRef = doc(db, 'users', user.uid, 'assets', assetData.id);
            await setDoc(assetDocRef, assetData, { merge: true });

            toast({ title: 'Sukses', description: `Aset berhasil ${isEditing ? 'diperbarui' : 'disimpan'}.` });
            setIsFormOpen(false);
            setEditingAsset(null);
            // Manually re-trigger fetch after save
            const assetsSnap = await getDocs(collection(db, 'users', user.uid, 'assets'));
            setAssets(assetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
        } catch (error) {
            console.error('Error saving asset:', error);
            toast({ title: 'Gagal', description: 'Gagal menyimpan data aset.', variant: 'destructive' });
        }
    };

    const handleDeleteRequest = (assetId: string) => {
        setAssetToDelete(assetId);
    };

    const confirmDelete = async () => {
        if (!assetToDelete || !user) return;
        setIsDeleting(true);
        try {
            const assetDocRef = doc(db, 'users', user.uid, 'assets', assetToDelete);
            await deleteDoc(assetDocRef);
            toast({ title: "Sukses", description: "Aset berhasil dihapus." });
             // Manually re-trigger fetch after delete
            const assetsSnap = await getDocs(collection(db, 'users', user.uid, 'assets'));
            setAssets(assetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
        } catch (error) {
            console.error('Error deleting asset:', error);
            toast({ title: "Gagal", description: "Gagal menghapus aset.", variant: 'destructive' });
        } finally {
            setIsDeleting(false);
            setAssetToDelete(null);
        }
    };

    const handleOpenForm = (asset?: Asset) => {
        setEditingAsset(asset || null);
        setIsFormOpen(true);
    };
    
    // --- Calculations ---
    const manualAssetsValue = React.useMemo(() => assets.reduce((sum, asset) => sum + asset.value, 0), [assets]);
    
    const totalWalletBalance = React.useMemo(() => {
        const initialBalances = wallets.reduce((sum, w) => sum + w.initialBalance, 0);
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
        return initialBalances + totalIncome - totalExpense;
    }, [wallets, incomes, expenses]);

    const totalSavedAmount = React.useMemo(() => {
        return expenses
            .filter(e => e.savingGoalId)
            .reduce((sum, e) => sum + e.amount, 0);
    }, [expenses]);
    
    const totalAssets = manualAssetsValue + totalWalletBalance + totalSavedAmount;
    const totalDebts = React.useMemo(() => debts.reduce((sum, debt) => sum + debt.totalAmount, 0), [debts]);
    const netWorth = totalAssets - totalDebts;

    if (authLoading || isDataLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat Data Kekayaan Bersih...</div>
            </div>
        );
    }
    
    if (!isPremium) {
        return (
             <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Kembali</span>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        <h1 className="font-headline text-xl font-bold text-foreground">
                            Kekayaan Bersih
                        </h1>
                    </div>
                </header>
                 <main className="flex-1 flex items-center justify-center p-4 pb-20">
                    <Card className="w-full max-w-lg text-left">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    <Scale className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-2xl">Pahami Gambaran Besar Kekayaan Anda</CardTitle>
                                    <CardDescription>
                                        Kekayaan bersih adalah potret sejati dari kesehatan finansial Anda.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Lacak semua aset (properti, investasi, kas) dan utang Anda di satu tempat untuk melihat pertumbuhan kekayaan Anda dari waktu ke waktu. Fitur ini memberikan gambaran paling lengkap tentang posisi finansial Anda.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Lacak Semua Aset & Liabilitas</h4>
                                        <p className="text-sm text-muted-foreground">Catat semua yang Anda miliki (aset) dan semua yang Anda utangkan (liabilitas) dalam satu dasbor terpusat.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Lihat Pertumbuhan Kekayaan</h4>
                                        <p className="text-sm text-muted-foreground">Pantau bagaimana kekayaan bersih Anda berubah dari waktu ke waktu seiring Anda menabung, berinvestasi, dan melunasi utang.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Dapatkan Gambaran Finansial Menyeluruh</h4>
                                        <p className="text-sm text-muted-foreground">Memahami kekayaan bersih membantu Anda membuat keputusan yang lebih baik untuk mencapai tujuan finansial jangka panjang.</p>
                                    </div>
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href="/premium">
                                    <Gem className="mr-2 h-4 w-4" />
                                    Lihat Paket Premium & Buka Fitur Ini
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                 </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <h1 className="font-headline text-xl font-bold text-foreground flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    Kekayaan Bersih
                </h1>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 pb-20">
                <Card className="text-center">
                    <CardHeader>
                        <CardTitle className="text-base font-medium text-muted-foreground">Total Kekayaan Bersih</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-4xl font-bold font-headline ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netWorth)}</p>
                    </CardContent>
                    <CardFooter className="flex justify-around text-sm">
                        <div>
                            <p className="text-muted-foreground">Total Aset</p>
                            <p className="font-semibold text-green-600">{formatCurrency(totalAssets)}</p>
                        </div>
                         <div>
                            <p className="text-muted-foreground">Total Utang</p>
                            <p className="font-semibold text-red-600">{formatCurrency(totalDebts)}</p>
                        </div>
                    </CardFooter>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><TrendingUp className="text-green-500" /> Aset</CardTitle>
                             <CardDescription>Rincian semua aset yang Anda miliki.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 rounded-lg border bg-secondary/50 p-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold flex items-center gap-2"><Coins className="h-4 w-4" /> Total Saldo Dompet</span>
                                    <span className="font-bold">{formatCurrency(totalWalletBalance)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold flex items-center gap-2"><PiggyBank className="h-4 w-4" /> Total Dana Tabungan</span>
                                    <span className="font-bold">{formatCurrency(totalSavedAmount)}</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Aset Tercatat Lainnya</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Aset</TableHead>
                                            <TableHead className="text-right">Nilai</TableHead>
                                            <TableHead className="w-[100px] text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {assets.length > 0 ? assets.map(asset => {
                                            const Icon = assetIconMap[asset.type] || Gem;
                                            return (
                                                <TableRow key={asset.id}>
                                                    <TableCell className="font-medium flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{asset.name}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(asset.value)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenForm(asset)}><Pencil className="h-4 w-4" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(asset.id)}><Trash2 className="h-4 w-4" /></Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center h-24">Belum ada aset lain ditambahkan.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><TrendingDown className="text-red-500" /> Utang</CardTitle>
                             <CardDescription>Ringkasan sisa utang Anda. Kelola pembayaran di halaman Manajemen Utang.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Utang</TableHead>
                                        <TableHead className="text-right">Sisa Pokok</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {debts.length > 0 ? debts.map(debt => (
                                        <TableRow key={debt.id}>
                                            <TableCell className="font-medium">{debt.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(debt.totalAmount)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24">Anda tidak memiliki utang.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/debts">Kelola Utang & Pembayaran</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>

            <SpeedDial mainIcon={<PlusCircle className="h-7 w-7" />}>
                <SpeedDialAction label="Tambah Aset" onClick={() => handleOpenForm()}>
                    <Gem className="h-5 w-5 text-blue-500" />
                </SpeedDialAction>
            </SpeedDial>

            <AddAssetForm 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleSaveAsset}
                assetToEdit={editingAsset}
            />
            
            <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan menghapus aset secara permanen dari daftar Anda.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAssetToDelete(null)}>Batal</AlertDialogCancel>
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
