
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import type { BudgetPeriod, Category, Debt, Expense, Income } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDays, addMonths, endOfDay, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek, subDays, subWeeks } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import Link from 'next/link';

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, BookMarked, TrendingUp, TrendingDown, PiggyBank, Banknote } from 'lucide-react';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import BudgetChart from '@/components/charts/BudgetChart';
import BudgetVsSpendingChart from '@/components/charts/BudgetVsSpendingChart';
import FinancialReport from '@/components/FinancialReport';
import DebtAnalysis from '@/components/DebtAnalysis';

// Data conversion utility
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (typeof data.toDate === 'function') return data.toDate();
  if (Array.isArray(data)) return data.map(convertTimestamps);
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: convertTimestamps(data[key]) }), {});
  }
  return data;
};

// Main component
export default function ReportsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [data, setData] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    // Fetch all necessary data
    React.useEffect(() => {
        if (!user) return;
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
                const budgetSnap = await getDoc(budgetDocRef);
                const budget = budgetSnap.exists() ? convertTimestamps(budgetSnap.data()) : null;

                const debtsSnap = await getDocs(collection(db, 'users', user.uid, 'debts'));
                const debts = debtsSnap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) }));

                setData({ budget, debts });
            } catch (error) {
                console.error("Failed to load report data:", error);
                toast({ title: 'Gagal memuat data', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, authLoading, router, toast]);

    // Memoized filtered data
    const filteredData = React.useMemo(() => {
        if (!data?.budget) return null;
        
        const filterItems = <T extends { date: Date }>(items: T[]): T[] => {
            if (!dateRange?.from) return items;
            const from = startOfDay(dateRange.from);
            const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
            return (items || []).filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= from && itemDate <= to;
            });
        };

        return {
            expenses: filterItems(data.budget.expenses),
            incomes: filterItems(data.budget.incomes),
        };
    }, [data, dateRange]);


    const ReportHeader = () => (
         <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </Button>
            <div className="flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-primary" />
                <h1 className="font-headline text-xl font-bold text-foreground">
                    Laporan Keuanganmu
                </h1>
            </div>
        </header>
    );

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="flex items-center gap-3 text-lg font-semibold text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Memuat Laporan Keuangan...</span>
                </div>
            </div>
        );
    }
    
    if (!data?.budget) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <ReportHeader />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center space-y-4">
                        <p className="text-lg font-semibold">Data Anggaran Tidak Ditemukan</p>
                        <p className="text-muted-foreground max-w-sm">Anda perlu mengatur anggaran terlebih dahulu di dasbor untuk dapat melihat laporan.</p>
                        <Button asChild>
                            <Link href="/">Kembali ke Dasbor</Link>
                        </Button>
                    </div>
                </main>
            </div>
        )
    }

    // Helper components for the report page
    const DateFilter = () => (
        <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={dateRange?.from === startOfDay(subDays(new Date(), 6)) ? 'default' : 'outline'} onClick={() => setDateRange({ from: subDays(new Date(), 6), to: new Date() })}>7 Hari Terakhir</Button>
            <Button size="sm" variant={dateRange?.from === startOfDay(subDays(new Date(), 13)) ? 'default' : 'outline'} onClick={() => setDateRange({ from: subDays(new Date(), 13), to: new Date() })}>2 Minggu Terakhir</Button>
            <Button size="sm" variant={dateRange?.from === startOfMonth(new Date()) ? 'default' : 'outline'} onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>Bulan Ini</Button>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>
    );
    
    // TAB: Laporan Content
    const LaporanTab = () => {
        const totalExpenses = filteredData?.expenses.reduce((sum, e) => sum + e.amount, 0) || 0;
        const totalAddedIncomes = filteredData?.incomes.reduce((sum, i) => sum + i.amount, 0) || 0;
        
        const savingsCategoryId = data.budget.categories.find((c: Category) => c.name === "Tabungan & Investasi")?.id;
        const totalSavings = filteredData?.expenses.filter(e => e.categoryId === savingsCategoryId).reduce((sum, e) => sum + e.amount, 0) || 0;

        const expenseByCategory = data.budget.categories.map((cat: Category) => ({
            name: cat.name,
            spent: filteredData?.expenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0) || 0,
            budget: cat.budget
        })).filter(c => c.spent > 0);

        const incomeData = [
            // Base budget is not considered "income" in reports, only additional income.
            { name: "Pemasukan Tambahan", value: totalAddedIncomes }
        ].filter(i => i.value > 0);
        
        const cashflowData = [{
            name: 'Arus Kas',
            Pendapatan: totalAddedIncomes, // Only additional income
            Pengeluaran: totalExpenses,
            Tabungan: totalSavings,
        }];

        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-2xl font-bold font-headline mb-2">Bagaimana Alokasi Keuanganmu?</h3>
                    <Tabs defaultValue="pengeluaran">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="pengeluaran">Pengeluaran</TabsTrigger>
                            <TabsTrigger value="pemasukan">Pemasukan</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pengeluaran" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Distribusi Pengeluaran</CardTitle>
                                    <CardDescription>Distribusi pengeluaran Anda berdasarkan kategori.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <BudgetChart data={expenseByCategory} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="pemasukan" className="mt-4">
                           <Card>
                                <CardHeader>
                                    <CardTitle>Distribusi Pemasukan</CardTitle>
                                    <CardDescription>Distribusi pemasukan tambahan Anda.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <BudgetChart data={incomeData.map(d => ({name: d.name, spent: d.value, budget: d.value}))} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Profil Arus Kas Kamu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={cashflowData} layout="vertical" barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }} formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="Pendapatan" fill="#4CAF50" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Pengeluaran" fill="#F44336" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="Tabungan" fill="#2196F3" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                
                <Card>
                     <CardHeader>
                        <CardTitle className="font-headline">Pengeluaran Berdasarkan Kategori</CardTitle>
                    </CardHeader>
                     <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {data.budget.categories.map((cat: Category) => {
                                const spent = filteredData?.expenses.filter(e => e.categoryId === cat.id).reduce((sum, e) => sum + e.amount, 0) || 0;
                                const progress = cat.budget > 0 ? (spent / cat.budget) * 100 : 0;
                                if (spent === 0) return null;

                                return (
                                    <AccordionItem value={cat.id} key={cat.id}>
                                        <AccordionTrigger>
                                            <div className="w-full text-left">
                                                <div className="flex justify-between items-center">
                                                    <span>{cat.name}</span>
                                                    <span className="font-bold">{formatCurrency(spent)}</span>
                                                </div>
                                                <Progress value={progress} className="mt-2 h-2" />
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Tanggal</TableHead>
                                                        <TableHead>Catatan</TableHead>
                                                        <TableHead className="text-right">Jumlah</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                {filteredData?.expenses.filter(e => e.categoryId === cat.id).map(e => (
                                                    <TableRow key={e.id}>
                                                        <TableCell>{format(new Date(e.date), 'd MMM yyyy')}</TableCell>
                                                        <TableCell>{e.notes || '-'}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                     </CardContent>
                </Card>
            </div>
        );
    }
    
    // TAB: Insight Content
    const InsightTab = () => {
        const topSpendingCategory = [...(filteredData?.expenses || [])]
            .reduce((acc, exp) => {
                acc[exp.categoryId] = (acc[exp.categoryId] || 0) + exp.amount;
                return acc;
            }, {} as Record<string, number>);

        const topCategory = Object.entries(topSpendingCategory).sort((a,b) => b[1] - a[1])[0];
        const categoryMap = new Map(data.budget.categories.map((c: Category) => [c.id, c.name]));
        
        const last4WeeksData = React.useMemo(() => {
            const weeks = Array.from({ length: 4 }).map((_, i) => {
                const end = subWeeks(new Date(), i);
                const start = subWeeks(new Date(), i + 1);
                return {
                    name: `Minggu ${4 - i}`,
                    Pemasukan: (data.budget.incomes || []).filter((inc: Income) => new Date(inc.date) > start && new Date(inc.date) <= end).reduce((sum: number, inc: Income) => sum + inc.amount, 0),
                    Pengeluaran: (data.budget.expenses || []).filter((exp: Expense) => new Date(exp.date) > start && new Date(exp.date) <= end).reduce((sum: number, exp: Expense) => sum + exp.amount, 0)
                };
            }).reverse();
            return weeks;
        }, [data.budget]);
        
        return (
             <div className="space-y-6">
                 <FinancialReport
                    expenses={filteredData?.expenses || []}
                    categories={data.budget.categories}
                    baseBudget={data.budget.income}
                    additionalIncomes={filteredData?.incomes || []}
                    periodLabel={format(dateRange?.from ?? new Date(), "d MMM yyyy")}
                />
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Ringkasan Periode</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-secondary rounded-lg">
                            <p className="text-sm text-muted-foreground">Pengeluaran Terbanyak</p>
                            <p className="text-lg font-bold text-primary truncate">{topCategory ? categoryMap.get(topCategory[0]) : 'N/A'}</p>
                            <p className="text-sm font-semibold">{topCategory ? formatCurrency(topCategory[1]) : formatCurrency(0)}</p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Transaksi</p>
                            <p className="text-2xl font-bold text-primary">{(filteredData?.expenses.length || 0) + (filteredData?.incomes.length || 0)}</p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                            <p className="text-sm text-muted-foreground">Sisa Anggaran</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency((data.budget.income || 0) + (filteredData?.incomes.reduce((s: number,i: Income) => s+i.amount, 0) || 0) - (filteredData?.expenses.reduce((s:number,e:Expense) => s+e.amount, 0) || 0))}</p>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">4 Minggu Perbandingan Arus Keuangan</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={last4WeeksData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => formatCurrency(value).replace('Rp\u00A0', 'Rp')} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="Pemasukan" barSize={20} fill="#4CAF50" />
                                <Line type="monotone" dataKey="Pengeluaran" stroke="#F44336" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Pengeluaran vs Anggaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <BudgetVsSpendingChart data={data.budget.categories.map((c: Category) => ({ ...c, spent: (filteredData?.expenses || []).filter(e => e.categoryId === c.id).reduce((s,e) => s+e.amount, 0)}))} />
                    </CardContent>
                </Card>
             </div>
        );
    }

    // TAB: Utang Content
    const UtangTab = () => {
        const debtsWithBalance = (data.debts || []).map((debt: Debt) => {
            const paid = (data.budget.expenses || [])
                .filter((e: Expense) => e.debtId === debt.id)
                .reduce((sum: number, e: Expense) => sum + e.amount, 0);
            return { ...debt, remainingBalance: debt.totalAmount - paid };
        }).filter((d: any) => d.remainingBalance > 0);

        const totalDebt = debtsWithBalance.reduce((sum: number, d: any) => sum + d.remainingBalance, 0);

        const COLORS = ["#3DA3FF", "#735CDD", "#FFB45A", "#4CAF50", "#FF6B6B", "#3DDBD9", "#A855F7"];

        return (
            <div className="space-y-6">
                <DebtAnalysis debts={debtsWithBalance} />
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Distribusi Utang</CardTitle>
                        <CardDescription>Total Sisa Utang: <span className="font-bold text-destructive">{formatCurrency(totalDebt)}</span></CardDescription>
                    </CardHeader>
                     <CardContent className="h-[350px]">
                        {totalDebt > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip formatter={(value: number) => formatCurrency(value as number)} />
                                    <Legend />
                                    <Pie data={debtsWithBalance} dataKey="remainingBalance" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                                         {debtsWithBalance.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="text-center text-muted-foreground pt-16">Anda bebas utang!</div>}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Rincian Utang</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Utang</TableHead>
                                    <TableHead>Total Pinjaman</TableHead>
                                    <TableHead>Sisa</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debtsWithBalance.map((debt: any) => (
                                    <TableRow key={debt.id}>
                                        <TableCell>{debt.name}</TableCell>
                                        <TableCell>{formatCurrency(debt.totalAmount)}</TableCell>
                                        <TableCell className="font-bold text-destructive">{formatCurrency(debt.remainingBalance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <ReportHeader />
            <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 pb-20">
                <DateFilter />
                <Tabs defaultValue="laporan" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="laporan">Laporan</TabsTrigger>
                        <TabsTrigger value="insight">Insight</TabsTrigger>
                        <TabsTrigger value="utang">Utang</TabsTrigger>
                    </TabsList>
                    <TabsContent value="laporan" className="mt-6">
                        <LaporanTab />
                    </TabsContent>
                    <TabsContent value="insight" className="mt-6">
                        <InsightTab />
                    </TabsContent>
                    <TabsContent value="utang" className="mt-6">
                        <UtangTab />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
