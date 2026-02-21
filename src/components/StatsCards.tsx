
"use client"

import * as React from 'react';
import { RefreshCw, TrendingUp, Eye, EyeOff, Plus } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-black border border-slate-100 dark:border-slate-800 shadow-sm p-6 group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col">
                {/* Header Card */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col items-start">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-1">Total Saldo</p>
                        <div className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/10">
                            {periodLabel}
                        </div>
                    </div>
                    <button 
                        onClick={onReset}
                        className="flex flex-col items-center justify-center group/btn"
                    >
                        <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm group-hover/btn:shadow-md group-hover/btn:border-primary/30">
                            <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-[9px] font-bold mt-1 text-slate-400 dark:text-slate-500 group-hover/btn:text-primary transition-colors">Periode Baru</span>
                    </button>
                </div>

                {/* Main Balance */}
                <Link href="/wallets" className="flex flex-col mb-8 hover:opacity-90 transition-opacity">
                    <div className="flex items-center space-x-3 mb-4">
                        <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {displayValue(totalWalletBalance)}
                        </span>
                        <button 
                            onClick={toggleVisibility}
                            className="text-slate-300 dark:text-slate-600 hover:text-primary transition-colors focus:outline-none"
                        >
                            {isHidden ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                        </button>
                    </div>
                    
                    {/* Dummy Trend Graph */}
                    <div className="relative w-full h-12 opacity-80">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 40">
                            <defs>
                                <linearGradient id="balanceGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                    <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                            <path 
                                className="text-primary" 
                                d="M0,35 C20,32 40,25 60,30 C80,35 100,20 120,25 C140,30 160,15 180,10 C190,8 200,5 200,5" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth="3" 
                            />
                            <circle cx="200" cy="5" r="3" className="fill-primary" />
                        </svg>
                        <p className="text-[10px] text-primary font-bold mt-2 flex items-center uppercase tracking-wider">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +2.4% dalam 7 hari terakhir
                        </p>
                    </div>
                </Link>

                {/* Bottom Stats Grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <Link href="/budget" className="flex flex-col gap-1 hover:opacity-80">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Sisa Anggaran</span>
                        </div>
                        <p className={cn("font-bold text-sm pl-4", remainingBudget < 0 ? "text-red-500" : "text-slate-900 dark:text-slate-100")}>
                            {displayValue(remainingBudget)}
                        </p>
                    </Link>
                    
                    <Link href="/history" className="flex flex-col gap-1 hover:opacity-80">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Pemasukan</span>
                        </div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 pl-4">{displayValue(totalIncome)}</p>
                    </Link>

                    <Link href="/history" className="flex flex-col gap-1 hover:opacity-80">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Pengeluaran</span>
                        </div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 pl-4">{displayValue(totalExpenses)}</p>
                    </Link>

                    <Link href="/savings" className="flex flex-col gap-1 hover:opacity-80">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Tabungan</span>
                        </div>
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 pl-4">{displayValue(totalSavings)}</p>
                    </Link>
                </div>
            </div>
        </section>
    )
}
