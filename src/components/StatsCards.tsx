

"use client"

import * as React from 'react';
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeftRight, Edit, PiggyBank, RefreshCw, Wallet, TrendingUp, Loader2, TrendingDown, Eye, EyeOff } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

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

    const toggleVisibility = () => setIsHidden(prev => !prev);
    
    const displayValue = (value: number) => {
        return isHidden ? '******' : formatCurrency(value);
    }
    
    return (
        <Card className="w-full overflow-hidden shadow-sm border-none bg-transparent">
            <div className="bg-secondary/40 p-3 sm:p-4 rounded-t-lg flex justify-between items-center">
                <div>
                    <p className="text-xs text-muted-foreground">Periode Anggaran</p>
                    <p className="font-semibold text-sm sm:text-base">{periodLabel}</p>
                </div>
                 <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleVisibility}>
                        {isHidden ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                        <span className="sr-only">{isHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onReset}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Periode Baru
                    </Button>
                 </div>
            </div>
            <CardContent className="p-4 sm:p-6 text-center bg-card rounded-b-lg">
                <div className="flex justify-center items-center gap-2">
                    <p className="text-sm text-muted-foreground">Total Saldo Dompet</p>
                     <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/wallets">
                            <Wallet className="h-4 w-4" />
                            <span className="sr-only">Kelola Dompet</span>
                        </Link>
                    </Button>
                </div>
                <p className="text-3xl sm:text-4xl font-bold font-headline tracking-tight mt-1 text-primary">
                    {displayValue(totalWalletBalance)}
                </p>

                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Link href="/budget" className="p-2 text-center rounded-lg hover:bg-accent transition-colors">
                        <ArrowLeftRight className="h-5 sm:h-6 mx-auto text-red-500 mb-1" />
                        <p className="text-xs text-muted-foreground">Sisa Anggaran</p>
                        <p className={cn(
                            "font-semibold text-xs sm:text-sm",
                             remainingBudget >= 0 ? 'text-foreground' : 'text-destructive'
                        )}>
                            {displayValue(remainingBudget)}
                        </p>
                    </Link>
                    <Link href="/history/current" className="p-2 text-center rounded-lg hover:bg-accent transition-colors">
                        <TrendingUp className="h-5 sm:h-6 mx-auto text-green-500 mb-1" />
                        <p className="text-xs text-muted-foreground">Pemasukan Tambahan</p>
                        <p className="font-semibold text-xs sm:text-sm">{displayValue(totalIncome)}</p>
                    </Link>
                    <Link href="/history/current" className="p-2 text-center rounded-lg hover:bg-accent transition-colors">
                        <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-red-500 mb-1" />
                        <p className="text-xs text-muted-foreground">Pengeluaran</p>
                        <p className="font-semibold text-xs sm:text-sm">{displayValue(totalExpenses)}</p>
                    </Link>
                     <Link href="/savings" className="p-2 text-center rounded-lg hover:bg-accent transition-colors">
                        <PiggyBank className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-blue-500 mb-1" />
                        <p className="text-xs text-muted-foreground">Tabungan</p>
                        <p className="font-semibold text-xs sm:text-sm">{displayValue(totalSavings)}</p>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
