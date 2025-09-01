
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
        // Correctly calculate balance from ALL transactions, not just current period.
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
    
    if (wallets.length === 0) {
        return null; // Don't render the card if there are no wallets
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="font-headline">Ringkasan Dompet</CardTitle>
                <CardDescription>Saldo terkini di setiap sumber dana Anda.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                {walletsWithBalance.map(wallet => {
                    const Icon = iconMap[wallet.icon] || WalletIcon;
                    return (
                        <div key={wallet.id} className="flex items-center gap-4">
                            <Icon className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                            <div className="flex-grow">
                                <p className="font-semibold">{wallet.name}</p>
                            </div>
                            <p className="font-bold text-right">{formatCurrency(wallet.currentBalance)}</p>
                        </div>
                    );
                })}
            </CardContent>
            <CardFooter>
                 <Button asChild variant="outline" className="w-full">
                    <Link href="/wallets">
                        Kelola Semua Dompet <ChevronRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
