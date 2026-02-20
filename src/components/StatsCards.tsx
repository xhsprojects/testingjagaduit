"use client"

import * as React from 'react';
import { Card } from "@/components/ui/card"
import { RefreshCw, TrendingUp, TrendingDown, PiggyBank, Eye, EyeOff, Calculator } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

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

    const toggleVisibility = () => {
        const newHiddenState = !isHidden;
        setIsHidden(newHiddenState);
        localStorage.setItem('jaga-duit-balance-hidden', JSON.stringify(newHiddenState));
    };
    
    const displayValue = (value: number) => {
        return isHidden ? '••••••' : formatCurrency(value);
    }
    
    return (
        <Card className="bg-card dark:bg-card-dark rounded-2xl p-6 shadow-sm dark:shadow-card-dark border border-border dark:border-slate-800 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Periode Anggaran</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{periodLabel}</p>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onReset}
                    className="h-8 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg"
                >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Periode Baru
                </Button>
            </div>

            <div className="text-center py-4">
                <div className="flex justify-center items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Saldo Dompet</p>
                    <button 
                        onClick={toggleVisibility}
                        className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors focus:outline-none"
                    >
                        {isHidden ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                </div>
                <h2 className="text-4xl font-extrabold text-primary tracking-tight drop-shadow-sm">
                    {displayValue(totalWalletBalance)}
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 dark:border-slate-700/50 pt-6">
                <div className="text-center group">
                    <div className="w-10 h-10 mx-auto bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-tight">Sisa Anggaran</p>
                    <p className={cn(
                        "text-sm font-bold mt-0.5",
                        remainingBudget >= 0 ? "text-slate-800 dark:text-slate-200" : "text-red-500"
                    )}>
                        {displayValue(remainingBudget)}
                    </p>
                </div>

                <div className="text-center group">
                    <div className="w-10 h-10 mx-auto bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-tight">Pemasukan</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{displayValue(totalIncome)}</p>
                </div>

                <div className="text-center group mt-2">
                    <div className="w-10 h-10 mx-auto bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Calculator className="h-5 w-5 text-orange-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-tight">Pengeluaran</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{displayValue(totalExpenses)}</p>
                </div>

                <div className="text-center group mt-2">
                    <div className="w-10 h-10 mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <PiggyBank className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-tight">Tabungan</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{displayValue(totalSavings)}</p>
                </div>
            </div>
        </Card>
    )
}
