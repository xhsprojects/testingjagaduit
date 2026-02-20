"use client"

import * as React from 'react';
import { Card } from "@/components/ui/card"
import { RefreshCw, TrendingUp, TrendingDown, PiggyBank, Eye, EyeOff, Calculator, Wallet } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import Link from 'next/link';

interface StatsCardsProps {
    totalIncome: number;
    totalExpenses: number;
    remainingBudget: number;
    totalSavings: number;
    totalWalletBalance: number;
    periodLabel: string;
    onReset: () => void;
}

export default function StatsCards({ totalIncome, totalExpenses, remainingBudget, totalSavings, totalWalletBalance, periodLabel, onReset }: StatsCardsProps) {
    const [isHidden, setIsHidden] = React.useState(false);

    React.useEffect(() => {
        const savedState = localStorage.getItem('jaga-duit-balance-hidden');
        if (savedState !== null) {
            setIsHidden(JSON.parse(savedState));
        }
    }, []);

    const toggleVisibility = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newHiddenState = !isHidden;
        setIsHidden(newHiddenState);
        localStorage.setItem('jaga-duit-balance-hidden', JSON.stringify(newHiddenState));
    };
    
    const displayValue = (value: number) => {
        return isHidden ? '••••••' : formatCurrency(value || 0);
    }
    
    return (
        <Card className="bg-card rounded-2xl p-6 shadow-sm border border-border dark:border-slate-800 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-tight">Periode Anggaran</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{periodLabel}</p>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onReset}
                    className="h-8 text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 rounded-lg"
                >
                    <RefreshCw className="mr-1.5 h-3 w-3" />
                    Periode Baru
                </Button>
            </div>

            <Link href="/wallets" className="text-center py-4 block hover:opacity-80 transition-opacity">
                <div className="flex justify-center items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-tight">Total Saldo Dompet</p>
                    <button 
                        onClick={toggleVisibility}
                        className="text-slate-500 hover:text-primary transition-colors focus:outline-none"
                    >
                        {isHidden ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                </div>
                <h2 className="text-4xl font-extrabold text-primary tracking-tight drop-shadow-sm">
                    {displayValue(totalWalletBalance)}
                </h2>
            </Link>

            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 dark:border-slate-700/50 pt-6">
                <Link href="/budget" className="text-center group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-all">
                    <div className="w-10 h-10 mx-auto bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Sisa Anggaran</p>
                    <p className={cn(
                        "text-sm font-bold mt-0.5",
                        remainingBudget >= 0 ? "text-slate-800 dark:text-slate-200" : "text-red-500"
                    )}>
                        {displayValue(remainingBudget)}
                    </p>
                </Link>

                <Link href="/history" className="text-center group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-all">
                    <div className="w-10 h-10 mx-auto bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Pemasukan</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{displayValue(totalIncome)}</p>
                </Link>

                <Link href="/history" className="text-center group mt-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-all">
                    <div className="w-10 h-10 mx-auto bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Calculator className="h-5 w-5 text-orange-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Pengeluaran</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{displayValue(totalExpenses)}</p>
                </Link>

                <Link href="/savings" className="text-center group mt-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-all">
                    <div className="w-10 h-10 mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <PiggyBank className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-tight">Tabungan</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{displayValue(totalSavings)}</p>
                </Link>
            </div>
        </Card>
    )
}
