
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeftRight, Edit, PiggyBank, RefreshCw, Wallet, TrendingUp } from "lucide-react"
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
    return (
        <Card className="w-full overflow-hidden shadow-sm border-none bg-transparent">
            <div className="bg-secondary/40 p-3 sm:p-4 rounded-t-lg flex justify-between items-center">
                <div>
                    <p className="text-xs text-muted-foreground">Periode Anggaran</p>
                    <p className="font-semibold text-sm sm:text-base">{periodLabel}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onReset}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Mulai Periode Baru
                </Button>
            </div>
            <CardContent className="p-4 sm:p-6 text-center bg-card rounded-b-lg">
                <div className="flex justify-center items-center gap-2">
                    <p className="text-sm text-muted-foreground">Sisa Anggaran</p>
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/budget">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Kelola Anggaran</span>
                        </Link>
                    </Button>
                </div>
                <p className={cn(
                    "text-3xl sm:text-4xl font-bold font-headline tracking-tight mt-1",
                    remainingBudget >= 0 ? 'text-foreground' : 'text-destructive'
                )}>
                    {formatCurrency(remainingBudget)}
                </p>

                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Link href="/history/current" className="p-2 text-center rounded-lg hover:bg-accent transition-colors">
                        <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-green-500 mb-1" />
                        <p className="text-xs text-muted-foreground">Pemasukan Tambahan</p>
                        <p className="font-semibold text-xs sm:text-sm">{formatCurrency(totalIncome)}</p>
                    </Link>
                    <Link href="/history/current" className="p-2 text-center rounded-lg hover:bg-accent transition-colors">
                        <ArrowLeftRight className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-red-500 mb-1" />
                        <p className="text-xs text-muted-foreground">Pengeluaran</p>
                        <p className="font-semibold text-xs sm:text-sm">{formatCurrency(totalExpenses)}</p>
                    </Link>
                     <Link href="/savings" className="p-2 text-center rounded-lg hover:bg-accent transition-colors">
                        <PiggyBank className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-blue-500 mb-1" />
                        <p className="text-xs text-muted-foreground">Tabungan</p>
                        <p className="font-semibold text-xs sm:text-sm">{formatCurrency(totalSavings)}</p>
                    </Link>
                    <Link href="/wallets" className="p-2 text-center rounded-lg hover:bg-accent transition-colors">
                        <Wallet className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-purple-500 mb-1" />
                        <p className="text-xs text-muted-foreground">Total Saldo</p>
                        <p className="font-semibold text-xs sm:text-sm">{formatCurrency(totalWalletBalance)}</p>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
