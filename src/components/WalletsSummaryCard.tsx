"use client"

import * as React from 'react';
import type { Wallet, Expense, Income } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { iconMap } from '@/lib/icons';
import { Wallet as WalletIcon, ChevronRight, Landmark, CreditCard, Banknote, Landmark as BankIcon } from 'lucide-react';
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
        <Card className="bg-card dark:bg-card-dark rounded-2xl p-6 shadow-sm dark:shadow-card-dark border border-border dark:border-slate-800">
            <h3 className="text-lg font-bold mb-1 dark:text-white">Ringkasan Dompet</h3>
            <p className="text-xs text-slate-500 mb-4 dark:text-slate-400">Saldo terkini di setiap sumber dana Anda.</p>
            
            <div className="space-y-4">
                {walletsWithBalance.map(wallet => {
                    const Icon = iconMap[wallet.icon] || WalletIcon;
                    return (
                        <div key={wallet.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className="font-medium text-sm text-slate-700 dark:text-slate-200 leading-none">{wallet.name}</span>
                            </div>
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{formatCurrency(wallet.currentBalance)}</span>
                        </div>
                    );
                })}
            </div>

            <Button asChild variant="outline" className="w-full mt-6 py-3 rounded-xl border border-border dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <Link href="/wallets">
                    Kelola Semua Dompet
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </Button>
        </Card>
    );
}
