
"use client"

import * as React from 'react';
import type { Wallet, Expense, Income } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import { Wallet as WalletIcon, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';

interface WalletsSummaryCardProps {
    wallets: Wallet[];
    expenses: Expense[];
    incomes: Income[];
}

export default function WalletsSummaryCard({ wallets, expenses, incomes }: WalletsSummaryCardProps) {

    const calculateWalletBalance = React.useCallback((wallet: Wallet) => {
        const totalIncome = incomes
            .filter(i => i.walletId === wallet.id)
            .reduce((sum, i) => sum + i.amount, 0);
        const totalExpense = expenses
            .filter(e => e.walletId === wallet.id)
            .reduce((sum, e) => sum + e.amount, 0);
        return wallet.initialBalance + totalIncome - totalExpense;
    }, [incomes, expenses]);

    const walletsWithBalance = React.useMemo(() => {
        return wallets.map(wallet => ({
            ...wallet,
            currentBalance: calculateWalletBalance(wallet),
        })).sort((a,b) => b.currentBalance - a.currentBalance);
    }, [wallets, calculateWalletBalance]);
    
    if (wallets.length === 0) return null;

    return (
        <Card className="rounded-2xl p-6 shadow-sm border-border/50 bg-card">
            <h3 className="text-lg font-bold mb-1 text-foreground">Ringkasan Dompet</h3>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight mb-6">Saldo terkini di sumber dana Anda.</p>
            
            <div className="space-y-5">
                {walletsWithBalance.map(wallet => {
                    const Icon = iconMap[wallet.icon] || WalletIcon;
                    return (
                        <div key={wallet.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-sm">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-sm text-foreground/80 leading-none">{wallet.name}</span>
                            </div>
                            <span className="font-extrabold text-sm text-foreground">{formatCurrency(wallet.currentBalance)}</span>
                        </div>
                    );
                })}
            </div>

            <Button asChild variant="outline" className="w-full mt-8 py-6 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground border-border/50 hover:bg-accent transition-colors flex items-center justify-center gap-2">
                <Link href="/wallets">
                    Kelola Semua Dompet
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </Button>
        </Card>
    );
}
