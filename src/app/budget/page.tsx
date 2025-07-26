"use client";

import * as React from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Trash2, PlusCircle, Wallet, ArrowLeft, Loader2, PiggyBank, RefreshCw, FileDown, FileType2, Tag } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import type { Category, Expense, Wallet as WalletType, Income } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, collection, writeBatch, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveBudget } from './actions';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Link from 'next/link';

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
            } else {
                // If no budget doc, probably new user, redirect them or show setup
                router.push('/');
            }
            setIsLoadingData(false);
        }, (error) => {
            console.error("Error fetching budget data:", error);
            setIsLoadingData(false);
        });
        
        return () => budgetUnsubscribe();
    }, [user, form, router]);
  
    const { fields } = useFieldArray({
        control: form.control,
        name: "categories",
    });

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
        if (!idToken) {
            toast({ title: 'Error', description: 'Sesi tidak valid, silakan login ulang.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        const result = await saveBudget(idToken, data.categories as Category[]);
        if (result.success) {
            toast({ title: 'Sukses!', description: result.message });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
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
                            <Card>
                                <CardHeader>
                                    <CardTitle>Alokasi Dana</CardTitle>
                                    <CardDescription>Atur jumlah dana untuk setiap kategori. Untuk menambah atau mengubah kategori, kunjungi halaman Kategori.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {fields.map((field, index) => {
                                        const category = watchCategories?.[index];
                                        const spent = category ? spentByCategory[category.id] || 0 : 0;
                                        const budget = category?.budget || 0;
                                        const progress = budget > 0 ? (spent / budget) * 100 : 0;
                                        const remaining = budget - spent;
                                        const Icon = iconMap[category.icon as keyof typeof iconMap] || Wallet;

                                        return (
                                        <div key={field.id} className="p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Icon className="h-6 w-6 text-muted-foreground shrink-0"/>
                                                <div className="flex-grow">
                                                    <p className="font-semibold">{category.name}</p>
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
                                        </div>
                                    )})}
                                </CardContent>
                                <CardFooter>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link href="/categories"><Tag className="mr-2 h-4 w-4" /> Kelola Kategori</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>

                        <div className="lg:col-span-1">
                            <Card className="sticky top-20">
                                <CardHeader>
                                    <CardTitle>Ringkasan Anggaran</CardTitle>
                                    <CardDescription>
                                        Total alokasi dana untuk periode ini.
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
                                </CardContent>
                                <CardFooter>
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
        </div>
    );
}
