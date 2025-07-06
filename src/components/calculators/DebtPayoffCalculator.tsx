
"use client"

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import type { Debt, Expense } from '@/lib/types';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, addMonths } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const formSchema = z.object({
  extraPayment: z.coerce.number().min(0, "Pembayaran tambahan tidak boleh negatif."),
});

type FormValues = z.infer<typeof formSchema>;

interface DebtWithBalance extends Debt {
    remainingBalance: number;
}

interface PayoffResult {
    strategy: 'Avalanche' | 'Snowball';
    totalMonths: number;
    totalInterestPaid: number;
    payoffDate: Date;
    payoffOrder: { name: string; payoffDate: string }[];
}

export default function DebtPayoffCalculator() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isCalculating, setIsCalculating] = React.useState(false);
    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [debts, setDebts] = React.useState<DebtWithBalance[]>([]);
    const [results, setResults] = React.useState<{ avalanche: PayoffResult, snowball: PayoffResult } | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            extraPayment: 100000,
        },
    });

    React.useEffect(() => {
        if (!user) return;
        
        const debtsUnsubscribe = onSnapshot(collection(db, 'users', user.uid, 'debts'), async (debtsSnapshot) => {
            const debtsData = debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[];

            const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
            const budgetSnap = await getDoc(budgetDocRef);
            const expenses = budgetSnap.exists() ? (budgetSnap.data()?.expenses || []) : [];
            
            const debtsWithBalance = debtsData.map(debt => {
                const paid = expenses
                    .filter((e: Expense) => e.debtId === debt.id)
                    .reduce((sum: number, e: Expense) => sum + e.amount, 0);
                return { ...debt, remainingBalance: debt.totalAmount - paid };
            }).filter(d => d.remainingBalance > 0);

            setDebts(debtsWithBalance);
            setIsLoadingData(false);
        }, (error) => {
            console.error("Error fetching debts for calculator:", error);
            toast({ title: 'Gagal Memuat Data Utang', variant: 'destructive' });
            setIsLoadingData(false);
        });

        return () => debtsUnsubscribe();
    }, [user, toast]);

    const calculatePayoff = (debtsToSimulate: DebtWithBalance[], extraPayment: number, strategy: 'Avalanche' | 'Snowball'): PayoffResult => {
        let localDebts = JSON.parse(JSON.stringify(debtsToSimulate)) as DebtWithBalance[];

        if (strategy === 'Avalanche') {
            localDebts.sort((a, b) => b.interestRate - a.interestRate);
        } else { // Snowball
            localDebts.sort((a, b) => a.remainingBalance - b.remainingBalance);
        }

        let months = 0;
        let totalInterestPaid = 0;
        const payoffOrder: { name: string; payoffDate: string }[] = [];
        const today = new Date();

        while (localDebts.some(d => d.remainingBalance > 0)) {
            months++;
            let paymentPool = extraPayment;
            
            // Calculate interest and add minimum payments to the pool
            for (const debt of localDebts) {
                if (debt.remainingBalance > 0) {
                    const monthlyInterest = debt.remainingBalance * (debt.interestRate / 100 / 12);
                    debt.remainingBalance += monthlyInterest;
                    totalInterestPaid += monthlyInterest;
                    paymentPool += debt.minimumPayment;
                }
            }

            // Apply payments
            for (const debt of localDebts) {
                if (debt.remainingBalance > 0 && paymentPool > 0) {
                    const paymentAmount = Math.min(debt.remainingBalance, paymentPool);
                    debt.remainingBalance -= paymentAmount;
                    paymentPool -= paymentAmount;

                    if (debt.remainingBalance <= 0) {
                         if (!payoffOrder.find(p => p.name === debt.name)) {
                             payoffOrder.push({ name: debt.name, payoffDate: format(addMonths(today, months), "MMMM yyyy", { locale: idLocale }) });
                         }
                    }
                }
            }
             if (months > 1200) { // Safety break after 100 years
                console.error("Calculation timed out");
                break;
            }
        }
        
        return {
            strategy,
            totalMonths: months,
            totalInterestPaid: totalInterestPaid,
            payoffDate: addMonths(today, months),
            payoffOrder
        };
    };

    const handleSubmit = (data: FormValues) => {
        if (debts.length === 0) {
            toast({ title: 'Tidak Ada Utang', description: 'Anda tidak memiliki utang aktif untuk dihitung.' });
            return;
        }
        setIsCalculating(true);
        setResults(null);

        setTimeout(() => {
            const avalancheResult = calculatePayoff(debts, data.extraPayment, 'Avalanche');
            const snowballResult = calculatePayoff(debts, data.extraPayment, 'Snowball');
            setResults({ avalanche: avalancheResult, snowball: snowballResult });
            setIsCalculating(false);
        }, 500);
    };

    const formatYearsMonths = (totalMonths: number) => {
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        let result = '';
        if (years > 0) result += `${years} tahun `;
        if (months > 0) result += `${months} bulan`;
        return result.trim() || 'Langsung Lunas';
    }

    if (isLoadingData) {
        return (
            <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed bg-secondary/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (debts.length === 0) {
         return (
            <Alert>
                <AlertTitle className="font-headline">Anda Bebas Utang!</AlertTitle>
                <AlertDescription>Kalkulator ini hanya berfungsi jika Anda memiliki catatan utang aktif. Anda bisa menambahkannya di halaman Manajemen Utang.</AlertDescription>
            </Alert>
        );
    }
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Kalkulator Pelunasan Utang</CardTitle>
                    <CardDescription>Masukkan dana tambahan yang bisa Anda alokasikan per bulan untuk melihat seberapa cepat Anda bisa bebas utang.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="extraPayment"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Dana Tambahan per Bulan (Rp)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="text" 
                                        placeholder="100.000" 
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
                        <Button type="submit" className="w-full" disabled={isCalculating}>
                           {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Hitung Strategi
                        </Button>
                    </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
         <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Hasil Simulasi</CardTitle>
                    <CardDescription>Perbandingan antara dua strategi pelunasan utang populer.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isCalculating && (
                         <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-dashed bg-secondary/50">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    {!results && !isCalculating && (
                        <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-dashed bg-secondary/50">
                            <p className="text-muted-foreground">Hasil perbandingan akan muncul di sini.</p>
                        </div>
                    )}
                    {results && (
                        <div className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <Card>
                                   <CardHeader>
                                       <CardTitle className="text-lg font-bold">Metode Avalanche</CardTitle>
                                       <CardDescription>Prioritaskan utang dengan bunga tertinggi. Paling hemat biaya.</CardDescription>
                                   </CardHeader>
                                   <CardContent className="text-sm space-y-2">
                                       <p><strong>Bebas utang dalam:</strong> {formatYearsMonths(results.avalanche.totalMonths)}</p>
                                       <p><strong>Tanggal lunas:</strong> {format(results.avalanche.payoffDate, "MMMM yyyy", { locale: idLocale })}</p>
                                       <p><strong>Total bunga dibayar:</strong> {formatCurrency(results.avalanche.totalInterestPaid)}</p>
                                   </CardContent>
                               </Card>
                                <Card>
                                   <CardHeader>
                                       <CardTitle className="text-lg font-bold">Metode Snowball</CardTitle>
                                       <CardDescription>Prioritaskan utang dengan saldo terkecil. Paling memotivasi.</CardDescription>
                                   </CardHeader>
                                   <CardContent className="text-sm space-y-2">
                                       <p><strong>Bebas utang dalam:</strong> {formatYearsMonths(results.snowball.totalMonths)}</p>
                                       <p><strong>Tanggal lunas:</strong> {format(results.snowball.payoffDate, "MMMM yyyy", { locale: idLocale })}</p>
                                       <p><strong>Total bunga dibayar:</strong> {formatCurrency(results.snowball.totalInterestPaid)}</p>
                                   </CardContent>
                               </Card>
                           </div>
                           <div>
                               <h4 className="font-semibold mb-2">Urutan Pelunasan (Metode Avalanche)</h4>
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Utang</TableHead>
                                            <TableHead className="text-right">Akan Lunas Pada</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.avalanche.payoffOrder.map((item, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-right">{item.payoffDate}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                               </Table>
                           </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    );
}
