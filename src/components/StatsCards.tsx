
"use client"

import * as React from 'react';
import { TrendingUp, TrendingDown, Eye, EyeOff, Plus } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import Link from 'next/link';

interface StatsCardsProps {
    totalIncome: number;
    totalExpenses: number;
    remainingBudget: number;
    totalSavings: number;
    totalWalletBalance: number;
    periodLabel: string;
    trendPercentage?: string;
    isTrendPositive?: boolean;
    onReset: () => void;
}

export default function StatsCards({ 
    totalIncome, 
    totalExpenses, 
    remainingBudget, 
    totalSavings, 
    totalWalletBalance, 
    periodLabel, 
    trendPercentage = "0.0",
    isTrendPositive = true,
    onReset 
}: StatsCardsProps) {
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
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-black border border-slate-100 dark:border-slate-800 shadow-soft p-6 sm:p-8 group transition-all duration-500">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl opacity-50 group-hover:bg-primary/10 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex flex-col items-start">
                        <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Total Saldo Terkonsolidasi</p>
                        <div className="px-3 py-1 rounded-xl bg-primary/10 text-primary text-[10px] font-extrabold border border-primary/10 uppercase tracking-widest">
                            {periodLabel}
                        </div>
                    </div>
                    <button 
                        onClick={(e) => { e.preventDefault(); onReset(); }}
                        className="flex flex-col items-center justify-center group/btn"
                    >
                        <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all shadow-sm group-hover/btn:shadow-md group-hover/btn:border-primary/30 group-hover/btn:scale-110">
                            <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-[8px] font-bold mt-1.5 text-slate-400 dark:text-slate-500 group-hover/btn:text-primary transition-colors uppercase tracking-tighter">Mulai Baru</span>
                    </button>
                </div>

                <div className="flex flex-col mb-10">
                    <div className="flex items-center space-x-4 mb-6">
                        <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">
                            {displayValue(totalWalletBalance)}
                        </span>
                        <button 
                            onClick={toggleVisibility}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-primary hover:bg-primary/5 transition-all duration-300 focus:outline-none"
                        >
                            {isHidden ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                        </button>
                    </div>
                    
                    <div className="relative w-full h-12 opacity-90">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 40">
                            <defs>
                                <linearGradient id="balanceGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                    <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                            <path 
                                className="text-primary transition-all duration-1000" 
                                d={isTrendPositive 
                                    ? "M0,35 C20,32 40,25 60,30 C80,35 100,20 120,25 C140,30 160,15 180,10 C190,8 200,5 200,5"
                                    : "M0,5 C20,8 40,15 60,10 C80,5 100,20 120,15 C140,10 160,25 180,30 C190,32 200,35 200,35"
                                }
                                fill="none" 
                                stroke="url(#balanceGradient)" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth="3" 
                            />
                            <circle cx="200" cy={isTrendPositive ? 5 : 35} r="4" className="fill-primary animate-pulse" />
                        </svg>
                        <p className={cn(
                            "text-[10px] font-extrabold mt-3 flex items-center uppercase tracking-[0.15em]",
                            isTrendPositive ? "text-primary" : "text-red-500"
                        )}>
                            {isTrendPositive ? <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> : <TrendingDown className="h-3.5 w-3.5 mr-1.5" />}
                            {isTrendPositive ? '+' : ''}{trendPercentage}% dalam 7 hari terakhir
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-8 pt-8 border-t border-slate-100 dark:border-slate-800/50">
                    <Link href="/budget" className="flex flex-col gap-1.5 group/stat">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest group-hover/stat:text-primary transition-colors">Sisa Anggaran</span>
                        </div>
                        <p className={cn("font-bold text-sm pl-4 tracking-tight transition-all", remainingBudget < 0 ? "text-red-500" : "text-slate-800 dark:text-slate-100")}>
                            {displayValue(remainingBudget)}
                        </p>
                    </Link>
                    
                    <Link href="/history" className="flex flex-col gap-1.5 group/stat">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest group-hover/stat:text-primary transition-colors">Pemasukan</span>
                        </div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 pl-4 tracking-tight">{displayValue(totalIncome)}</p>
                    </Link>

                    <Link href="/history" className="flex flex-col gap-1.5 group/stat">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.4)]"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest group-hover/stat:text-primary transition-colors">Pengeluaran</span>
                        </div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 pl-4 tracking-tight">{displayValue(totalExpenses)}</p>
                    </Link>

                    <Link href="/savings" className="flex flex-col gap-1.5 group/stat">
                        <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"></span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest group-hover/stat:text-primary transition-colors">Tabungan</span>
                        </div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 pl-4 tracking-tight">{displayValue(totalSavings)}</p>
                    </Link>
                </div>
            </div>
        </section>
    )
}
