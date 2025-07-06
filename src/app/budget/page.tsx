
"use client";

import * as React from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Wallet, ArrowLeft, Loader2, PiggyBank, RefreshCw, FileDown, FileType2 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { iconNames, IconName, iconMap } from '@/lib/icons';
import type { Category, Expense, Wallet as WalletType, Income } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, collection, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveBudget } from './actions';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Link from 'next/link';

const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama kategori tidak boleh kosong."),
  budget: z.coerce.number().min(0, "Anggaran harus angka positif.").default(0),
  icon: z.string().min(1, "Pilih ikon."),
  isEssential: z.boolean().optional(),
  isDebtCategory: z.boolean().optional(),
});

const budgetFormSchema = z.object({
  categories: z.array(categorySchema).min(1, "Harus ada minimal satu kategori anggaran."),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
    const [isResetting, setIsResetting] = React.useState(false);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [incomes, setIncomes] = React.useState<Income[]>([]);
    const [wallets, setWallets] = React.useState<WalletType[]>([]);
    
    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetFormSchema),
        defaultValues: {
            categories: [],
        },
        mode: "onChange",
    });

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    React.useEffect(() => {
        if (!user) return;
        setIsLoadingData(true);
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
        const budgetUnsubscribe = onSnapshot(budgetDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset({ categories: data.categories || [] });
                setExpenses(data.expenses || []);
                setIncomes(data.incomes || []);
            }
            setIsLoadingData(false); // Set loading false after budget data is processed
        }, (error) => {
            console.error("Error fetching budget data:", error);
            setIsLoadingData(false);
        });

        const walletsUnsubscribe = onSnapshot(collection(db, 'users', user.uid, 'wallets'), (snapshot) => {
            const walletsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WalletType));
            setWallets(walletsData);
        }, (error) => {
            console.error("Error fetching wallets data:", error);
        });
        
        return () => {
            budgetUnsubscribe();
            walletsUnsubscribe();
        };
    }, [user, form]);
  
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "categories",
    });

    const watchCategories = useWatch({ control: form.control, name: 'categories' });

    const totalAllocated = React.useMemo(() => {
        return (watchCategories || []).reduce((sum, cat) => sum + (Number(cat.budget) || 0), 0);
    }, [watchCategories]);
    
    const spentByCategory = React.useMemo(() => {
        return (expenses || []).reduce((acc, expense) => {
            if (expense.amount > 0) { // only positive amounts are expenses
                acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [expenses]);


    const handleAddNewCategory = () => {
        append({
            id: `cat-new-${Date.now()}`,
            name: '',
            budget: 0,
            icon: 'PiggyBank',
            isEssential: false,
            isDebtCategory: false,
        });
    };

    const onSubmit = async (data: BudgetFormValues) => {
        if (!idToken) {
            toast({ title: 'Error', description: 'Sesi tidak valid, silakan login ulang.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        const result = await saveBudget(idToken, data.categories.map(c => ({...c, icon: c.icon as IconName })));
        if (result.success) {
            toast({ title: 'Sukses!', description: result.message });
            router.push('/');
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    const handleReset = async () => {
        if (!user || !idToken) return;
        setIsResetting(true);
        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
        const budgetDocSnap = await getDoc(budgetDocRef);

        if (budgetDocSnap.exists()) {
            try {
                const batch = writeBatch(db);
                const currentData = budgetDocSnap.data();

                // Calculate final balances and prepare wallet updates
                wallets.forEach(wallet => {
                    const totalIncome = (currentData.incomes || [])
                        .filter((i: Income) => i.walletId === wallet.id)
                        .reduce((sum: number, i: Income) => sum + i.amount, 0);
                    const totalExpense = (currentData.expenses || [])
                        .filter((e: Expense) => e.walletId === wallet.id)
                        .reduce((sum: number, e: Expense) => sum + e.amount, 0);
                    const finalBalance = wallet.initialBalance + totalIncome - totalExpense;

                    const walletDocRef = doc(db, 'users', user.uid, 'wallets', wallet.id);
                    batch.update(walletDocRef, { initialBalance: finalBalance });
                });
                
                 const archivedPeriod = {
                    ...currentData,
                    periodEnd: new Date().toISOString(),
                };
                
                const archiveDocRef = doc(collection(db, 'users', user.uid, 'archivedBudgets'));
                batch.set(archiveDocRef, archivedPeriod);
                batch.delete(budgetDocRef);
                
                await batch.commit();

                toast({ title: 'Periode Baru Dimulai', description: 'Data lama telah diarsipkan dan saldo dompet diperbarui.' });
                router.push('/'); // Redirect to dashboard to trigger setup page
            } catch (error) {
                console.error("Error resetting budget:", error);
                toast({ title: 'Error', description: 'Gagal mengarsipkan data dan memperbarui saldo.', variant: 'destructive' });
            }
        }
        setIsResetting(false);
        setIsResetConfirmOpen(false);
    };
    
    const handleExport = (type: 'csv' | 'pdf') => {
        const periodName = `periode_saat_ini_${format(new Date(), "yyyy-MM-dd")}`;
        const categoryMap = new Map(watchCategories.map(c => [c.id, c.name]));

        if (type === 'csv') {
            const headers = ['Tanggal', 'Kategori', 'Jumlah', 'Catatan'];
            const rows = expenses.map(e => [
                new Date(e.date).toLocaleString('en-CA'),
                `"${categoryMap.get(e.categoryId) || 'N/A'}"`,
                e.amount,
                `"${e.notes?.replace(/"/g, '""') || ''}"`
            ].join(','));
            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `jagaduit_${periodName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`Laporan Anggaran Periode Saat Ini`, 14, 22);

            autoTable(doc, {
                head: [['Kategori', 'Anggaran', 'Realisasi', 'Sisa']],
                body: watchCategories.map(c => {
                    const spent = spentByCategory[c.id] || 0;
                    return [
                        c.name,
                        formatCurrency(c.budget),
                        formatCurrency(spent),
                        formatCurrency(c.budget - spent)
                    ];
                }),
                startY: 30,
            });
            doc.save(`jagaduit_${periodName}.pdf`);
        }
    };

    if (authLoading || isLoadingData) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold">Memuat Anggaran...</p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Kembali</span>
                    </Button>
                    <PiggyBank className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Kelola Anggaran
                    </h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-8 md:p-8">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                             {fields.map((field, index) => {
                                const category = watchCategories?.[index];
                                const spent = category ? spentByCategory[category.id] || 0 : 0;
                                const budget = category?.budget || 0;
                                const progress = budget > 0 ? (spent / budget) * 100 : 0;
                                const remaining = budget - spent;

                                return (
                                <Card key={field.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Controller
                                                control={form.control}
                                                name={`categories.${index}.icon`}
                                                render={({ field }) => {
                                                    const Icon = iconMap[field.value as IconName] || Wallet;
                                                    return (
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-16 h-16 shrink-0">
                                                                    <SelectValue>
                                                                        <Icon className="h-6 w-6 mx-auto" />
                                                                    </SelectValue>
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {iconNames.map(iconName => {
                                                                    const IconComponent = iconMap[iconName];
                                                                    return (
                                                                        <SelectItem key={iconName} value={iconName}>
                                                                            <div className="flex items-center gap-2">
                                                                                <IconComponent className="h-4 w-4" />
                                                                                <span>{iconName}</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    )
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                    )
                                                }}
                                            />
                                            <div className="flex-grow space-y-2">
                                                <div className="flex items-start justify-between">
                                                    <FormField
                                                        control={form.control}
                                                        name={`categories.${index}.name`}
                                                        render={({ field }) => (
                                                            <FormItem className="m-0 flex-grow">
                                                                <FormControl>
                                                                    <Input placeholder="Nama Kategori" {...field} disabled={watchCategories?.[index]?.isEssential} className="text-base font-semibold"/>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                     <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        type="button" 
                                                        onClick={() => remove(index)} 
                                                        className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-8 w-8 ml-2"
                                                        disabled={watchCategories?.[index]?.isEssential}
                                                        title={watchCategories?.[index]?.isEssential ? "Kategori ini tidak dapat dihapus" : "Hapus kategori"}
                                                        >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormField
                                                    control={form.control}
                                                    name={`categories.${index}.budget`}
                                                    render={({ field }) => (
                                                        <FormItem className="m-0">
                                                            <FormControl>
                                                                <Input 
                                                                    type="text" 
                                                                    placeholder="Anggaran (Rp)" 
                                                                    value={field.value > 0 ? formatCurrency(field.value) : ""}
                                                                    onChange={(e) => {
                                                                        const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                                        field.onChange(numericValue);
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                         <div className="mt-3 space-y-1">
                                            <Progress value={progress} className={cn(progress > 100 && 'bg-destructive/20 [&>*]:bg-destructive')} />
                                            <div className="text-xs flex justify-between font-medium">
                                                <span className="text-muted-foreground">Terpakai: {formatCurrency(spent)}</span>
                                                <span className={cn(remaining < 0 && 'text-destructive')}>Sisa: {formatCurrency(remaining)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )})}
                            {form.formState.errors.categories && (
                                <p className="text-sm font-medium text-destructive">{form.formState.errors.categories.message || form.formState.errors.categories.root?.message}</p>
                            )}
                             <Button type="button" variant="outline" onClick={handleAddNewCategory} className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Tambah Kategori Baru
                            </Button>
                        </div>

                        <div className="lg:col-span-1">
                            <Card className="sticky top-20">
                                <CardHeader>
                                    <CardTitle>Ringkasan Anggaran</CardTitle>
                                    <CardDescription>
                                        Total alokasi dana dan opsi ekspor data.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-4 bg-secondary rounded-lg flex justify-between items-center text-lg">
                                        <span className="font-bold font-headline flex items-center gap-2">
                                        <Wallet className="h-5 w-5 text-primary" />
                                        Total Alokasi
                                        </span>
                                        <span className="font-bold font-headline text-primary">{formatCurrency(totalAllocated)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">Ini akan menjadi total anggaran bulanan Anda. Pemasukan tambahan dapat dicatat di Dasbor.</p>
                                    
                                    <div className="mt-4 pt-4 border-t flex gap-2">
                                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleExport('csv')}>
                                            <FileDown className="h-4 w-4 mr-2"/> CSV
                                        </Button>
                                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleExport('pdf')}>
                                            <FileType2 className="h-4 w-4 mr-2"/> PDF
                                        </Button>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                    <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Simpan Perubahan Anggaran
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </form>
                </Form>
                 
            </main>
            <Button 
                onClick={() => setIsResetConfirmOpen(true)}
                className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-40 md:bottom-6"
                size="icon"
                aria-label="Mulai Periode Baru"
            >
                <RefreshCw className="h-6 w-6" />
            </Button>
            <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mulai Periode Anggaran Baru?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini akan mengarsipkan semua data dari periode saat ini dan mengatur ulang dasbor Anda. Saldo dompet akan diperbarui. Anda dapat melihat data lama di halaman "Riwayat". Apakah Anda yakin?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset} disabled={isResetting}>
                            {isResetting ? 'Mengarsipkan...' : 'Ya, Mulai Periode Baru'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
