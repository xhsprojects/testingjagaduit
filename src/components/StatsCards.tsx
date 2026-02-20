
"use client"

import * as React from 'react';
import { Card, CardContent } from "@/components/ui/card"
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
        <Card className="bg-card border-border/50 shadow-sm overflow-hidden rounded-2xl transition-all">
            <div className="p-4 sm:p-6 pb-4">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Periode Anggaran</p>
                        <p className="text-sm font-semibold text-foreground/80">{periodLabel}</p>
                    </div>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={onReset}
                        className="h-8 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border-none rounded-lg transition-colors"
                    >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Periode Baru
                    </Button>
                </div>

                <div className="text-center py-2">
                    <div className="flex justify-center items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-muted-foreground">Total Saldo Dompet</p>
                        <button 
                            onClick={toggleVisibility}
                            className="text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                        >
                            {isHidden ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                        </button>
                    </div>
                    <h2 className="text-4xl font-extrabold text-primary tracking-tight drop-shadow-sm">
                        {displayValue(totalWalletBalance)}
                    </h2>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 border-t border-border/50 pt-6">
                    <div className="text-center group">
                        <div className="w-10 h-10 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <TrendingDown className="h-5 w-5 text-destructive" />
                        </div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Sisa Anggaran</p>
                        <p className={cn(
                            "text-sm font-bold mt-0.5",
                            remainingBudget >= 0 ? "text-foreground" : "text-destructive"
                        )}>
                            {displayValue(remainingBudget)}
                        </p>
                    </div>

                    <div className="text-center group">
                        <div className="w-10 h-10 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Pemasukan</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{displayValue(totalIncome)}</p>
                    </div>

                    <div className="text-center group">
                        <div className="w-10 h-10 mx-auto bg-orange-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Calculator className="h-5 w-5 text-orange-500" />
                        </div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Pengeluaran</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{displayValue(totalExpenses)}</p>
                    </div>

                    <div className="text-center group">
                        <div className="w-10 h-10 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <PiggyBank className="h-5 w-5 text-blue-500" />
                        </div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Tabungan</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{displayValue(totalSavings)}</p>
                    </div>
                </div>
            </div>
        </Card>
    )
}
