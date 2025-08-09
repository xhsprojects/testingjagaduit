
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import type { BudgetPeriod, Category, Debt, Expense, Income } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDays, addMonths, endOfDay, endOfMonth, endOfWeek, format, startOfDay, startOfMonth, startOfWeek, subDays, subWeeks, subMonths } from 'date-fns';
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

    const [allExpenses, setAllExpenses] = React.useState<Expense[]>([]);
    const [allIncomes, setAllIncomes] = React.useState<Income[]>([]);
    const [allCategories, setAllCategories] = React.useState<Category[]>([]);
    const [allDebts, setAllDebts] = React.useState<Debt[]>([]);
    const [currentBudget, setCurrentBudget] = React.useState<BudgetPeriod | null>(null);

    const [isLoading, setIsLoading] = React.useState(true);
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    // Fetch all necessary data from all periods
    React.useEffect(() => {
        if (!user || authLoading) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch current and archived periods concurrently
                const currentBudgetPromise = getDoc(doc(db, 'users', user.uid, 'budgets', 'current'));
                const archivedBudgetsPromise = getDocs(query(collection(db, 'users', user.uid, 'archivedBudgets'), orderBy('periodStart', 'desc')));
                const debtsPromise = getDocs(collection(db, 'users', user.uid, 'debts'));
                
                const [currentBudgetSnap, archivedBudgetsSnap, debtsSnap] = await Promise.all([
                    currentBudgetPromise,
                    archivedBudgetsPromise,
                    debtsPromise
                ]);

                const allPeriods: BudgetPeriod[] = [];
                if (currentBudgetSnap.exists()) {
                    const currentData = convertTimestamps(currentBudgetSnap.data()) as BudgetPeriod;
                    allPeriods.push(currentData);
                    setCurrentBudget(currentData);
                }
                archivedBudgetsSnap.forEach(doc => {
                    allPeriods.push(convertTimestamps(doc.data()) as BudgetPeriod);
                });

                // Aggregate all data from all periods
                const expenses: Expense[] = [];
                const incomes: Income[] = [];
                const categories: Category[] = [];
                const categoryMap = new Map<string, Category>();

                for (const period of allPeriods) {
                    expenses.push(...(period.expenses || []));
                    incomes.push(...(period.incomes || []));
                    (period.categories || []).forEach(cat => {
                        if (!categoryMap.has(cat.id)) {
                            categoryMap.set(cat.id, cat);
                        }
                    });
                }
                
                setAllExpenses(expenses);
                setAllIncomes(incomes);
                setAllCategories(Array.from(categoryMap.values()));
                setAllDebts(debtsSnap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) as Debt })));

            } catch (error) {
                console.error("Failed to load report data:", error);
                toast({ title: 'Gagal memuat data komprehensif', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, authLoading, toast]);

    // Memoized filtered data based on dateRange
    const filteredData = React.useMemo(() => {
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
            expenses: filterItems(allExpenses),
            incomes: filterItems(allIncomes),
        };
    }, [allExpenses, allIncomes, dateRange]);


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
    
    if (allExpenses.length === 0 && allIncomes.length === 0) {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <ReportHeader />
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center space-y-4">
                        <p className="text-lg font-semibold">Data Transaksi Tidak Ditemukan</p>
                        <p className="text-muted-foreground max-w-sm">Anda perlu mencatat transaksi terlebih dahulu untuk dapat melihat laporan.</p>
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
            <Button size="sm" variant={dateRange?.from === startOfDay(subDays(new Date(), 29)) ? 'default' : 'outline'} onClick={() => setDateRange({ from: subDays(new Date(), 29), to: new Date() })}>30 Hari Terakhir</Button>
            <Button size="sm" variant={dateRange?.from === startOfMonth(new Date()) ? 'default' : 'outline'} onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>Bulan Ini</Button>
            <Button size="sm" variant={dateRange?.from === startOfMonth(subMonths(new Date(), 1)) ? 'default' : 'outline'} onClick={() => setDateRange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) })}>Bulan Lalu</Button>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>
    );
    
    // TAB: Laporan Content
    const LaporanTab = () => {
        const expenseByCategory = (allCategories || []).filter(Boolean).map((cat: Category) => {
            const spent = (filteredData?.expenses || []).reduce((sum: number, e: Expense) => {
                if (e.isSplit) {
                    return sum + (e.splits || []).filter(s => s.categoryId === cat.id).reduce((splitSum, s) => splitSum + s.amount, 0);
                }
                if (e.categoryId === cat.id) {
                    return sum + e.amount;
                }
                return sum;
            }, 0);
            return { name: cat.name, spent, budget: cat.budget };
        }).filter((c: any) => c.spent > 0);
        
        const totalAddedIncomes = filteredData?.incomes.reduce((sum, i) => sum + i.amount, 0) || 0;
        const totalExpenses = filteredData?.expenses.reduce((sum, e) => sum + e.amount, 0) || 0;
        const savingsCategoryId = allCategories.find((c: Category) => c.name === "Tabungan & Investasi")?.id;
        const totalSavings = (filteredData?.expenses || []).reduce((sum: number, e: Expense) => {
            if (e.isSplit) {
                return sum + (e.splits || []).filter(s => s.categoryId === savingsCategoryId).reduce((splitSum, s) => splitSum + s.amount, 0);
            }
            if (e.categoryId === savingsCategoryId) {
                return sum + e.amount;
            }
            return sum;
        }, 0);

        const incomeData = [{ name: "Pemasukan Tambahan", value: totalAddedIncomes }].filter(i => i.value > 0);
        
        const cashflowData = [{
            name: 'Arus Kas',
            Pendapatan: totalAddedIncomes,
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
                                <CardHeader><CardTitle>Distribusi Pengeluaran</CardTitle><CardDescription>Distribusi pengeluaran Anda berdasarkan kategori.</CardDescription></CardHeader>
                                <CardContent><BudgetChart data={expenseByCategory} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="pemasukan" className="mt-4">
                           <Card>
                                <CardHeader><CardTitle>Distribusi Pemasukan</CardTitle><CardDescription>Distribusi pemasukan tambahan Anda.</CardDescription></CardHeader>
                                <CardContent><BudgetChart data={incomeData.map(d => ({name: d.name, spent: d.value, budget: d.value}))} /></CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                <Card>
                    <CardHeader><CardTitle className="font-headline">Profil Arus Kas Kamu</CardTitle></CardHeader>
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
                     <CardHeader><CardTitle className="font-headline">Pengeluaran Berdasarkan Kategori</CardTitle></CardHeader>
                     <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {(allCategories || []).filter(Boolean).map((cat: Category) => {
                                const spent = (filteredData?.expenses || []).reduce((sum: number, e: Expense) => {
                                    if (e.isSplit) {
                                        return sum + (e.splits || []).filter(s => s.categoryId === cat.id).reduce((splitSum, s) => splitSum + s.amount, 0);
                                    }
                                    if (e.categoryId === cat.id) {
                                        return sum + e.amount;
                                    }
                                    return sum;
                                }, 0);
                                // Use the budget from the current period for comparison
                                const currentCategoryBudget = currentBudget?.categories.find(c => c.id === cat.id)?.budget || 0;
                                const progress = currentCategoryBudget > 0 ? (spent / currentCategoryBudget) * 100 : 0;
                                if (spent === 0) return null;

                                return (
                                    <AccordionItem value={cat.id} key={cat.id}>
                                        <AccordionTrigger>
                                            <div className="w-full text-left">
                                                <div className="flex justify-between items-center"><span>{cat.name}</span><span className="font-bold">{formatCurrency(spent)}</span></div>
                                                {currentCategoryBudget > 0 && <Progress value={progress} className="mt-2 h-2" />}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Table>
                                                <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Catatan</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                {(filteredData?.expenses || []).flatMap((e: Expense) => 
                                                    e.isSplit ? 
                                                    (e.splits || []).filter(s => s.categoryId === cat.id).map(s => ({...s, date: e.date})) : 
                                                    e.categoryId === cat.id ? [{...e, amount: e.amount, date: e.date, notes: e.notes}] : []
                                                ).map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{format(new Date(item.date), 'd MMM yyyy')}</TableCell>
                                                        <TableCell>{item.notes || '-'}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
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
        const categoryMap = new Map(allCategories.map((c: Category) => [c.id, c.name]));
        const topSpendingCategory = (filteredData?.expenses || []).reduce((acc: Record<string, number>, exp: Expense) => {
            if (exp.isSplit) {
                (exp.splits || []).forEach(s => {
                    acc[s.categoryId] = (acc[s.categoryId] || 0) + s.amount;
                });
            } else if(exp.categoryId) {
                acc[exp.categoryId] = (acc[exp.categoryId] || 0) + exp.amount;
            }
            return acc;
        }, {});

        const topCategory = Object.entries(topSpendingCategory).sort((a,b) => b[1] - a[1])[0];
        
        const last4WeeksData = React.useMemo(() => {
            const weeks = Array.from({ length: 4 }).map((_, i) => {
                const end = subWeeks(new Date(), i);
                const start = subWeeks(new Date(), i + 1);
                return {
                    name: `Minggu ${4 - i}`,
                    Pemasukan: allIncomes.filter((inc: Income) => new Date(inc.date) > start && new Date(inc.date) <= end).reduce((sum: number, inc: Income) => sum + inc.amount, 0),
                    Pengeluaran: allExpenses.filter((exp: Expense) => new Date(exp.date) > start && new Date(exp.date) <= end).reduce((sum: number, exp: Expense) => sum + exp.amount, 0)
                };
            }).reverse();
            return weeks;
        }, [allIncomes, allExpenses]);
        
        const insightSpentByCategory = (currentBudget?.categories || []).filter(Boolean).map((c: Category) => {
            const spent = (filteredData?.expenses || []).reduce((sum: number, e: Expense) => {
                if (e.isSplit) {
                    return sum + (e.splits || []).filter(s => s.categoryId === c.id).reduce((splitSum, s) => splitSum + s.amount, 0);
                }
                if (e.categoryId === c.id) {
                    return sum + e.amount;
                }
                return sum;
            }, 0);
            return { ...c, spent };
        });

        return (
             <div className="space-y-6">
                 <FinancialReport
                    expenses={filteredData?.expenses || []}
                    categories={currentBudget?.categories || []}
                    baseBudget={currentBudget?.income || 0}
                    additionalIncomes={filteredData?.incomes || []}
                    periodLabel={format(dateRange?.from ?? new Date(), "d MMM yyyy")}
                />
                 <Card>
                    <CardHeader><CardTitle className="font-headline">Ringkasan Periode</CardTitle></CardHeader>
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
                            <p className="text-sm text-muted-foreground">Arus Kas Bersih</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency((filteredData?.incomes.reduce((s: number,i: Income) => s+i.amount, 0) || 0) - (filteredData?.expenses.reduce((s:number,e:Expense) => s+e.amount, 0) || 0))}</p>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle className="font-headline">4 Minggu Perbandingan Arus Keuangan</CardTitle></CardHeader>
                    <CardContent>
                       <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={last4WeeksData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(value) => formatCurrency(value).replace('Rp\u00A0', 'Rp')} width={80} tickLine={false} axisLine={false} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Bar dataKey="Pemasukan" barSize={20} fill="#4CAF50" />
                                <Line type="monotone" dataKey="Pengeluaran" stroke="#F44336" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle className="font-headline">Pengeluaran vs Anggaran (Bulan Ini)</CardTitle></CardHeader>
                    <CardContent>
                        <BudgetVsSpendingChart data={insightSpentByCategory} />
                    </CardContent>
                </Card>
             </div>
        );
    }

    // TAB: Utang Content
    const UtangTab = () => {
        const debtsWithBalance = (allDebts || []).map((debt: Debt) => {
            const paid = (allExpenses || [])
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
                    <CardHeader><CardTitle className="font-headline">Rincian Utang</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Nama Utang</TableHead><TableHead>Total Pinjaman</TableHead><TableHead>Sisa</TableHead></TableRow></TableHeader>
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
                    <TabsContent value="laporan" className="mt-6"><LaporanTab /></TabsContent>
                    <TabsContent value="insight" className="mt-6"><InsightTab /></TabsContent>
                    <TabsContent value="utang" className="mt-6"><UtangTab /></TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
