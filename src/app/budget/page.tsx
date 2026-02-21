"use client";

import * as React from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Trash2, PlusCircle, Wallet, ArrowLeft, Loader2, PiggyBank, RefreshCw, FileDown, FileType2, Tag, Landmark } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import type { Category, Expense, Wallet as WalletType, Income } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, collection, writeBatch, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveBudget, resetBudgetPeriod } from './actions';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const categoryBudgetSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  budget: z.coerce.number().min(0, "Anggaran harus angka positif.").default(0),
});

const budgetFormSchema = z.object({
  categories: z.array(categoryBudgetSchema),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isResetting, setIsResetting] = React.useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    
    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetFormSchema),
        defaultValues: { categories: [] },
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
                const categoriesWithBudget = (data.categories || []).map((c: any) => ({ ...c, budget: c.budget || 0 }));
                form.reset({ categories: categoriesWithBudget });
                setExpenses(data.expenses || []);
            }
            setIsLoadingData(false);
        });
        return () => budgetUnsubscribe();
    }, [user, form]);
  
    const { fields } = useFieldArray({ control: form.control, name: "categories" });
    const watchCategories = useWatch({ control: form.control, name: 'categories' });

    const totalAllocated = React.useMemo(() => {
        return (watchCategories || []).reduce((sum, cat) => sum + (Number(cat.budget) || 0), 0);
    }, [watchCategories]);
    
    const spentByCategory = React.useMemo(() => {
        return (expenses || []).reduce((acc, expense) => {
             if (expense.isSplit && expense.splits) {
                expense.splits.forEach(split => {
                    acc[split.categoryId] = (acc[split.categoryId] || 0) + split.amount;
                });
            } else if (expense.categoryId) {
                acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [expenses]);

    const onSubmit = async (data: BudgetFormValues) => {
        if (!idToken) return;
        setIsSubmitting(true);
        const result = await saveBudget(idToken, data.categories as Category[]);
        if (result.success) toast({ title: 'Sukses!', description: result.message });
        else toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        setIsSubmitting(false);
    };

    const handleReset = async () => {
        if (!idToken) return;
        setIsResetting(true);
        const result = await resetBudgetPeriod(idToken);
        if (result.success) toast({ title: 'Sukses!', description: result.message });
        setIsResetting(false);
        setIsResetConfirmOpen(false);
    }

    if (authLoading || isLoadingData) {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 pb-24">
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full -ml-2 text-slate-400">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Alokasi Anggaran</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Atur Keuangan Bulanan</p>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                    <Landmark className="h-5 w-5" />
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border-slate-100 dark:border-slate-800">
                                <CardHeader className="p-0 mb-6">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Daftar Alokasi Dana</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Masukkan budget untuk setiap kategori</p>
                                </CardHeader>
                                <div className="space-y-4">
                                    {fields.map((field, index) => {
                                        const category = watchCategories?.[index];
                                        const spent = category ? spentByCategory[category.id] || 0 : 0;
                                        const budget = category?.budget || 0;
                                        const progress = budget > 0 ? (spent / budget) * 100 : 0;
                                        const remaining = budget - spent;
                                        const Icon = iconMap[category.icon as keyof typeof iconMap] || Wallet;

                                        return (
                                        <div key={field.id} className="p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner group transition-all">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 group-focus-within:border-primary/50 group-focus-within:text-primary transition-all">
                                                    <Icon className="h-6 w-6"/>
                                                </div>
                                                <div className="flex-grow">
                                                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-1">{category.name}</p>
                                                     <FormField
                                                        control={form.control}
                                                        name={`categories.${index}.budget`}
                                                        render={({ field }) => (
                                                            <FormItem className="m-0">
                                                                <FormControl>
                                                                    <Input 
                                                                        className="h-10 text-sm font-black tabular-nums border-none shadow-none p-0 focus-visible:ring-0 bg-transparent placeholder:text-slate-300"
                                                                        type="text" 
                                                                        placeholder="Atur Anggaran (Rp)" 
                                                                        value={field.value > 0 ? formatCurrency(field.value) : ""}
                                                                        onChange={(e) => {
                                                                            const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                                            field.onChange(numericValue);
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                             <div className="space-y-2">
                                                <div className="h-2 w-full bg-white dark:bg-slate-900 rounded-full overflow-hidden">
                                                    <div className={cn("h-full transition-all duration-1000", progress > 100 ? 'bg-rose-500' : 'bg-primary')} style={{ width: `${Math.min(progress, 100)}%` }} />
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                                    <span className="text-slate-400">Terpakai: {formatCurrency(spent)}</span>
                                                    <span className={cn(remaining < 0 ? 'text-rose-500' : 'text-primary')}>Sisa: {formatCurrency(remaining)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                                <div className="mt-8 flex gap-3">
                                    <Button asChild variant="outline" className="flex-1 h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-slate-200">
                                        <Link href="/categories"><Tag className="mr-2 h-4 w-4" /> Edit Kategori</Link>
                                    </Button>
                                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-slate-200" onClick={() => setIsResetConfirmOpen(true)}>
                                        <RefreshCw className="mr-2 h-4 w-4" /> Mulai Baru
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                            <Card className="bg-slate-900 dark:bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-900/20 border-none relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10">
                                    <Landmark className="h-24 w-24 text-white" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Total Budget Bulanan</p>
                                    <p className="text-4xl font-black tracking-tighter text-primary mb-2">{formatCurrency(totalAllocated)}</p>
                                    <p className="text-[10px] font-medium text-slate-400 leading-relaxed max-w-[80%]">Semua alokasi di kiri dijumlahkan menjadi target belanja bulanan Anda.</p>
                                </div>
                            </Card>
                            
                            <Button type="submit" className="w-full h-16 rounded-3xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/30 active:scale-95 transition-all" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Simpan Anggaran'}
                            </Button>
                        </div>
                    </div>
                </form>
                </Form>

                 <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
                    <AlertDialogContent className="rounded-3xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-bold uppercase tracking-widest text-xs">Mulai Periode Baru?</AlertDialogTitle>
                            <AlertDialogDescription className="text-xs font-bold text-slate-400">Tindakan ini akan mengarsipkan data saat ini ke riwayat dan membersihkan dasbor Anda.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row gap-2 mt-4">
                            <AlertDialogCancel className="flex-1 rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest">Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReset} disabled={isResetting} className="flex-1 rounded-xl h-10 bg-primary text-[10px] font-bold uppercase tracking-widest">
                                {isResetting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ya, Mulai"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </div>
    );
}
