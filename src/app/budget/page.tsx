
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
import type { Category, Expense, Wallet as WalletType, Income, BudgetCategory } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, collection, writeBatch, updateDoc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';

const budgetCategorySchema = z.object({
  categoryId: z.string(),
  budget: z.coerce.number().min(0, "Anggaran harus angka positif.").default(0),
});

const budgetFormSchema = z.object({
  categoryBudgets: z.array(budgetCategorySchema),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetFormSchema),
        defaultValues: {
            categoryBudgets: [],
        },
        mode: "onChange",
    });
    
    const { fields, replace } = useFieldArray({
        control: form.control,
        name: "categoryBudgets",
    });

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    React.useEffect(() => {
        if (!user) return;
        
        const loadData = async () => {
            setIsLoadingData(true);
            try {
                // 1. Fetch master categories first. This is the source of truth.
                const categoriesQuery = collection(db, 'users', user.uid, 'categories');
                const categoriesSnapshot = await getDocs(categoriesQuery);
                const masterCategories = categoriesSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as Category);
                setCategories(masterCategories);

                // 2. Fetch or create the budget document.
                const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
                const budgetDocSnap = await getDoc(budgetDocRef);
                
                let categoryBudgets: BudgetCategory[] = [];
                let existingExpenses: Expense[] = [];

                if (budgetDocSnap.exists()) {
                    const budgetData = budgetDocSnap.data();
                    existingExpenses = budgetData.expenses || [];

                    // Check if categoryBudgets field exists. If not, create it for backward compatibility.
                    if (budgetData.categoryBudgets) {
                        categoryBudgets = budgetData.categoryBudgets;
                    } else {
                        // Old account, categoryBudgets field is missing. Create it.
                        categoryBudgets = masterCategories.map(cat => ({
                            categoryId: cat.id,
                            budget: 0, // Default to 0, user can set it up.
                        }));
                        // IMPORTANT: Update the document in Firestore so it exists for next time.
                        await updateDoc(budgetDocRef, { categoryBudgets });
                    }
                } else {
                    // This case should ideally be handled by the initial setup page, but as a fallback:
                    categoryBudgets = masterCategories.map(cat => ({
                        categoryId: cat.id,
                        budget: 0,
                    }));
                }
                
                setExpenses(existingExpenses);

                // 3. Ensure every master category has a corresponding entry in the form.
                const formBudgets = masterCategories.map(cat => {
                    const existingBudget = categoryBudgets.find(b => b.categoryId === cat.id);
                    return {
                        categoryId: cat.id,
                        budget: existingBudget?.budget || 0,
                    };
                });
                
                replace(formBudgets);

            } catch (error) {
                console.error("Error loading budget page data: ", error);
                toast({title: "Gagal Memuat Data", variant: "destructive"});
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();

    }, [user, replace, toast]);
  
    const categoryMap = React.useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
    const watchCategoryBudgets = useWatch({ control: form.control, name: 'categoryBudgets' });

    const totalAllocated = React.useMemo(() => {
        return (watchCategoryBudgets || []).reduce((sum, cat) => sum + (Number(cat.budget) || 0), 0);
    }, [watchCategoryBudgets]);
    
    const spentByCategory = React.useMemo(() => {
        return (expenses || []).reduce((acc, expense) => {
            if (expense.isSplit) {
                 (expense.splits || []).forEach(split => {
                    acc[split.categoryId] = (acc[split.categoryId] || 0) + split.amount;
                });
            } else if(expense.categoryId) {
                acc[expense.categoryId] = (acc[expense.categoryId] || 0) + expense.amount;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [expenses]);

    const onSubmit = async (data: BudgetFormValues) => {
        if (!idToken || !user) {
            toast({ title: 'Error', description: 'Sesi tidak valid, silakan login ulang.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            const totalIncome = data.categoryBudgets.reduce((sum, cb) => sum + cb.budget, 0);
            await updateDoc(budgetDocRef, {
                categoryBudgets: data.categoryBudgets,
                income: totalIncome
            });
            toast({ title: 'Sukses!', description: "Anggaran berhasil diperbarui." });
            router.push('/');
        } catch (error: any) {
             toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
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
                             {fields.map((field, index) => {
                                const category = categoryMap.get(field.categoryId);
                                if (!category) return null;
                                
                                const budget = watchCategoryBudgets?.[index]?.budget || 0;
                                const spent = spentByCategory[category.id] || 0;
                                const progress = budget > 0 ? (spent / budget) * 100 : 0;
                                const remaining = budget - spent;

                                return (
                                <Card key={field.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-secondary rounded-lg">
                                                {React.createElement(iconMap[category.icon], { className: 'h-8 w-8 text-primary' })}
                                            </div>
                                            <div className="flex-grow space-y-2">
                                                <p className="text-base font-semibold">{category.name}</p>
                                                <FormField
                                                    control={form.control}
                                                    name={`categoryBudgets.${index}.budget`}
                                                    render={({ field: budgetField }) => (
                                                        <FormItem className="m-0">
                                                            <FormControl>
                                                                <Input 
                                                                    type="text" 
                                                                    placeholder="Anggaran (Rp)" 
                                                                    value={budgetField.value > 0 ? formatCurrency(budgetField.value) : ""}
                                                                    onChange={(e) => {
                                                                        const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                                        budgetField.onChange(numericValue);
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
                            <div className="flex justify-end -mt-2">
                                <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                                    <Link href="/categories">
                                        <PlusCircle className="mr-1 h-3 w-3" />
                                        Kelola Daftar Kategori
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <Card className="sticky top-20">
                                <CardHeader>
                                    <CardTitle>Ringkasan Anggaran</CardTitle>
                                    <CardDescription>
                                        Total alokasi dana akan menjadi anggaran bulanan Anda.
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
                                    <p className="text-xs text-muted-foreground mt-2">Pemasukan tambahan dapat dicatat di Dasbor.</p>
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
        </div>
    );
}
