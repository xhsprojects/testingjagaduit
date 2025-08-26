
"use client";

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Wallet, ArrowLeft, Loader2, Tag } from 'lucide-react';
import { iconNames, IconName, iconMap } from '@/lib/icons';
import type { Category } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveCategories } from './actions';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama kategori tidak boleh kosong."),
  icon: z.string().min(1, "Pilih ikon."),
  isEssential: z.boolean().optional(),
  isDebtCategory: z.boolean().optional(),
});

const categoryFormSchema = z.object({
  categories: z.array(categorySchema).min(1, "Harus ada minimal satu kategori."),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoriesClientPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
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

        const loadAndSyncCategories = async () => {
            setIsLoadingData(true);
            try {
                const categoriesCollectionRef = collection(db, 'users', user.uid, 'categories');
                const categoriesSnapshot = await getDoc(doc(categoriesCollectionRef)); // Dummy getDoc for consistency with single doc reads
                
                onSnapshot(categoriesCollectionRef, (snapshot) => {
                    if (!snapshot.empty) {
                        const categoriesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
                        form.reset({ categories: categoriesData });
                        setIsLoadingData(false);
                    } else {
                        // Fallback: If categories collection is empty, try to load from budget doc (for older accounts)
                        const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
                        getDoc(budgetDocRef).then(budgetSnap => {
                            if (budgetSnap.exists() && budgetSnap.data().categories?.length > 0) {
                                const budgetCategories = budgetSnap.data().categories as Category[];
                                form.reset({ categories: budgetCategories });
                                // Optionally, you could write these back to the categories collection here
                            }
                            setIsLoadingData(false);
                        });
                    }
                }, (error) => {
                    console.error("Error fetching categories:", error);
                    toast({ title: "Gagal Memuat Kategori", variant: "destructive" });
                    setIsLoadingData(false);
                });

            } catch (error) {
                 console.error("Error loading categories page data: ", error);
                 setIsLoadingData(false);
            }
        };
        
        loadAndSyncCategories();

    }, [user, form, toast]);
  
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "categories",
    });

    const { formState: { isDirty = false } = {} } = form;

    const handleAddNewCategory = () => {
        append({
            id: `cat-new-${Date.now()}`,
            name: '',
            icon: 'PiggyBank',
            isEssential: false,
            isDebtCategory: false,
        });
    };

    const onSubmit = async (data: CategoryFormValues) => {
        if (!idToken) {
            toast({ title: 'Error', description: 'Sesi tidak valid, silakan login ulang.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        const result = await saveCategories(idToken, data.categories as Category[]);
        if (result.success) {
            toast({ title: 'Sukses!', description: result.message });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    if (authLoading || isLoadingData) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
                     <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-5 w-5 rounded-md" />
                        <Skeleton className="h-6 w-32 rounded-md" />
                    </div>
                </header>
                <main className="flex-1 p-4 sm:px-6 sm:py-8 md:p-8">
                     <div className="mx-auto max-w-2xl space-y-4">
                        <Skeleton className="h-96 w-full" />
                        <Skeleton className="h-12 w-full" />
                     </div>
                </main>
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
                    <Tag className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Kelola Kategori
                    </h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-8 md:p-8">
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                    <div className="mx-auto max-w-2xl space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daftar Kategori Anda</CardTitle>
                                <CardDescription>Tambah, ubah nama, ikon, atau hapus kategori pengeluaran Anda. Kategori esensial tidak dapat dihapus.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {fields.map((field, index) => {
                                    const Icon = iconMap[field.icon as IconName] || Wallet;
                                    return (
                                    <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                                    <Controller
                                        control={form.control}
                                        name={`categories.${index}.icon`}
                                        render={({ field: controllerField }) => (
                                            <Select onValueChange={controllerField.onChange} value={controllerField.value}>
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
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`categories.${index}.name`}
                                        render={({ field: formField }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input placeholder="Nama Kategori" {...formField} disabled={field.isEssential} />
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
                                        className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-10 w-10"
                                        disabled={field.isEssential}
                                        title={field.isEssential ? "Kategori ini tidak dapat dihapus" : "Hapus kategori"}
                                        >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    </div>
                                )})}
                                {form.formState.errors.categories && (
                                    <p className="text-sm font-medium text-destructive">{form.formState.errors.categories.message || form.formState.errors.categories.root?.message}</p>
                                )}
                            </CardContent>
                             <CardFooter className="flex flex-col gap-2">
                                <Button type="button" variant="outline" onClick={handleAddNewCategory} className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Tambah Kategori Baru
                                </Button>
                            </CardFooter>
                        </Card>
                        <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || !isDirty}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
                </Form>
            </main>
        </div>
    );
}
