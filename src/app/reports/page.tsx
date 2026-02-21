"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import type { BudgetPeriod, Category, Debt, Expense, Income } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays, subMonths, subWeeks } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import Link from 'next/link';

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, BookMarked, TrendingUp, TrendingDown, Wallet as WalletIcon, Landmark, ChevronRight, FileText } from 'lucide-react';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import BudgetChart from '@/components/charts/BudgetChart';
import BudgetVsSpendingChart from '@/components/charts/BudgetVsSpendingChart';
import FinancialReport from '@/components/FinancialReport';
import DebtAnalysis from '@/components/DebtAnalysis';

const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (typeof data.toDate === 'function') return data.toDate();
  if (Array.isArray(data)) return data.map(convertTimestamps);
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: convertTimestamps(data[key]) }), {});
  }
  return data;
};

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

    React.useEffect(() => {
        if (!user || authLoading) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
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

                const expenses: Expense[] = [];
                const incomes: Income[] = [];
                const categoryMap = new Map<string, Category>();

                for (const period of allPeriods) {
                    expenses.push(...(period.expenses || []));
                    incomes.push(...(period.incomes || []));
                    (period.categories || []).forEach(cat => {
                        if (!categoryMap.has(cat.id)) categoryMap.set(cat.id, cat);
                    });
                }
                
                setAllExpenses(expenses);
                setAllIncomes(incomes);
                setAllCategories(Array.from(categoryMap.values()));
                setAllDebts(debtsSnap.docs.map(d => ({ id: d.id, ...convertTimestamps(d.data()) as Debt })));

            } catch (error) {
                console.error("Failed to load report data:", error);
                toast({ title: 'Gagal memuat data laporan', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, authLoading, toast]);

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

    if (authLoading || isLoading) {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const totalAddedIncomes = filteredData.incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const netCashflow = totalAddedIncomes - totalExpenses;

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full -ml-2 text-slate-400">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Analisis Laporan</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Wawasan Keuangan Cerdas</p>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                    <BookMarked className="h-5 w-5" />
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
                {/* Date Filter Bar */}
                <div className="flex flex-col gap-4">
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
                        <Button size="sm" variant={dateRange?.from === startOfDay(subDays(new Date(), 6)) ? 'default' : 'outline'} className="rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 shrink-0" onClick={() => setDateRange({ from: subDays(new Date(), 6), to: new Date() })}>7 Hari</Button>
                        <Button size="sm" variant={dateRange?.from === startOfDay(subDays(new Date(), 29)) ? 'default' : 'outline'} className="rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 shrink-0" onClick={() => setDateRange({ from: subDays(new Date(), 29), to: new Date() })}>30 Hari</Button>
                        <Button size="sm" variant={dateRange?.from && format(dateRange.from, 'MM-yyyy') === format(startOfMonth(new Date()), 'MM-yyyy') ? 'default' : 'outline'} className="rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 shrink-0" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>Bulan Ini</Button>
                        <Button size="sm" variant={dateRange?.from && format(dateRange.from, 'MM-yyyy') === format(startOfMonth(subMonths(new Date(), 1)), 'MM-yyyy') ? 'default' : 'outline'} className="rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 shrink-0" onClick={() => setDateRange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) })}>Bulan Lalu</Button>
                    </div>
                    <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full" />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border-slate-100 dark:border-slate-800">
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><TrendingUp className="h-3 w-3 text-emerald-500"/> Total Masuk</p>
                        <p className="text-2xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalAddedIncomes)}</p>
                    </Card>
                    <Card className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border-slate-100 dark:border-slate-800">
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><TrendingDown className="h-3 w-3 text-rose-500"/> Total Keluar</p>
                        <p className="text-2xl font-black text-rose-500 tracking-tighter">{formatCurrency(totalExpenses)}</p>
                    </Card>
                    <Card className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border-slate-100 dark:border-slate-800">
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><WalletIcon className="h-3 w-3 text-primary"/> Arus Bersih</p>
                        <p className={cn("text-2xl font-black tracking-tighter", netCashflow >= 0 ? "text-primary" : "text-rose-500")}>{formatCurrency(netCashflow)}</p>
                    </Card>
                </div>

                <Tabs defaultValue="laporan" className="w-full">
                    <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex shadow-inner mb-8 h-12">
                        <TabsTrigger value="laporan" className="flex-1 text-[11px] font-bold uppercase tracking-widest rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-primary data-[state=active]:shadow-sm">Laporan</TabsTrigger>
                        <TabsTrigger value="insight" className="flex-1 text-[11px] font-bold uppercase tracking-widest rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-primary data-[state=active]:shadow-sm">Insight</TabsTrigger>
                        <TabsTrigger value="utang" className="flex-1 text-[11px] font-bold uppercase tracking-widest rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-primary data-[state=active]:shadow-sm">Utang</TabsTrigger>
                    </TabsList>

                    <TabsContent value="laporan" className="space-y-8 mt-0">
                        <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border-slate-100 dark:border-slate-800">
                            <CardHeader className="p-0 mb-8">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Distribusi Pengeluaran</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Perbandingan antar kategori</p>
                            </CardHeader>
                            <BudgetChart data={allCategories.map(cat => ({
                                name: cat.name,
                                spent: filteredData.expenses.reduce((s, e) => {
                                    if (e.isSplit) return s + (e.splits?.filter(sp => sp.categoryId === cat.id).reduce((ss, sp) => ss + sp.amount, 0) || 0);
                                    return e.categoryId === cat.id ? s + e.amount : s;
                                }, 0),
                                budget: cat.budget
                            }))} />
                        </Card>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest px-1">Rincian Per Kategori</h3>
                            <Accordion type="single" collapsible className="space-y-3">
                                {allCategories.map(cat => {
                                    const spent = filteredData.expenses.reduce((s, e) => {
                                        if (e.isSplit) return s + (e.splits?.filter(sp => sp.categoryId === cat.id).reduce((ss, sp) => ss + sp.amount, 0) || 0);
                                        return e.categoryId === cat.id ? s + e.amount : s;
                                    }, 0);
                                    if (spent === 0) return null;
                                    return (
                                        <AccordionItem key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 rounded-[1.5rem] px-6 border-slate-100 dark:border-slate-800 shadow-sm border-none overflow-hidden">
                                            <AccordionTrigger className="hover:no-underline py-5">
                                                <div className="flex flex-col w-full text-left gap-1">
                                                    <div className="flex justify-between items-center pr-4">
                                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">{cat.name}</span>
                                                        <span className="font-black text-sm text-primary tabular-nums">{formatCurrency(spent)}</span>
                                                    </div>
                                                    <Progress value={cat.budget > 0 ? (spent / cat.budget) * 100 : 0} className="h-1.5 w-[95%]" />
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-6">
                                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {filteredData.expenses.flatMap(e => 
                                                        e.isSplit ? (e.splits?.filter(s => s.categoryId === cat.id).map(s => ({...s, date: e.date})) || []) :
                                                        e.categoryId === cat.id ? [{...e, date: e.date}] : []
                                                    ).sort((a,b) => b.date.getTime() - a.date.getTime()).map((item, idx) => (
                                                        <div key={idx} className="py-3 flex justify-between items-center">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.notes || 'Transaksi'}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{format(new Date(item.date), 'd MMM yyyy')}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 tabular-nums">{formatCurrency(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    )
                                })}
                            </Accordion>
                        </div>
                    </TabsContent>

                    <TabsContent value="insight" className="space-y-8 mt-0">
                        <FinancialReport
                            expenses={filteredData.expenses}
                            categories={allCategories}
                            baseBudget={currentBudget?.income || 0}
                            additionalIncomes={filteredData.incomes}
                            periodLabel={format(dateRange?.from || new Date(), "d MMMM yyyy", { locale: idLocale })}
                        />
                        
                        <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border-slate-100 dark:border-slate-800">
                            <CardHeader className="p-0 mb-8">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Tren 4 Minggu Terakhir</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Perbandingan mingguan arus kas</p>
                            </CardHeader>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={Array.from({ length: 4 }).map((_, i) => {
                                        const end = subWeeks(new Date(), i);
                                        const start = subWeeks(new Date(), i + 1);
                                        return {
                                            name: `M-${4-i}`,
                                            Pemasukan: allIncomes.filter(inc => new Date(inc.date) > start && new Date(inc.date) <= end).reduce((s, inc) => s + inc.amount, 0),
                                            Pengeluaran: allExpenses.filter(exp => new Date(exp.date) > start && new Date(exp.date) <= end).reduce((s, exp) => s + exp.amount, 0)
                                        };
                                    }).reverse()}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={(v) => formatCurrency(v).replace('Rp', '')} width={60} tick={{ fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                        <Bar dataKey="Pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Line type="monotone" dataKey="Pengeluaran" stroke="#F43F5E" strokeWidth={3} dot={{ r: 4, fill: "#F43F5E" }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="utang" className="space-y-8 mt-0">
                        <DebtAnalysis debts={allDebts.map(debt => {
                            const paid = allExpenses.filter(e => e.debtId === debt.id).reduce((s, e) => s + e.amount, 0);
                            return { ...debt, remainingBalance: debt.totalAmount - paid };
                        }).filter(d => d.remainingBalance > 0)} />
                        
                        <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border-slate-100 dark:border-slate-800">
                            <CardHeader className="p-0 mb-6">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Daftar Utang Aktif</h3>
                            </CardHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100">
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Pinjaman</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Sisa Pokok</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allDebts.filter(d => {
                                        const paid = allExpenses.filter(e => e.debtId === d.id).reduce((s, e) => s + e.amount, 0);
                                        return d.totalAmount - paid > 0;
                                    }).map(debt => {
                                        const paid = allExpenses.filter(e => e.debtId === debt.id).reduce((s, e) => s + e.amount, 0);
                                        const remaining = debt.totalAmount - paid;
                                        return (
                                            <TableRow key={debt.id} className="border-slate-50">
                                                <TableCell className="font-bold text-sm text-slate-700 dark:text-slate-200">{debt.name}</TableCell>
                                                <TableCell className="text-right font-black text-rose-500 tabular-nums">{formatCurrency(remaining)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
