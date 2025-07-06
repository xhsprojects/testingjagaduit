
"use client"

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet as WalletIcon, FileText, Pencil, Trash2 } from 'lucide-react';
import type { Wallet } from '@/lib/types';
import { iconMap } from '@/lib/icons';
import { formatCurrency } from '@/lib/utils';

interface WalletCardProps {
    wallet: Wallet;
    balance: number;
    onHistory: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function WalletCard({ wallet, balance, onHistory, onEdit, onDelete }: WalletCardProps) {
    const Icon = iconMap[wallet.icon] || WalletIcon;

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex-grow">
                <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle className="text-lg font-bold font-headline">{wallet.name}</CardTitle>
                        <CardDescription className="text-xs">Saldo Awal: {formatCurrency(wallet.initialBalance)}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold text-center">{formatCurrency(balance)}</p>
            </CardContent>
            <CardFooter className="grid grid-cols-3 gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={onHistory}>
                    <FileText className="mr-2 h-4 w-4"/> Riwayat
                </Button>
                <Button variant="outline" size="sm" onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4"/> Ubah
                </Button>
                <Button variant="destructive" size="sm" onClick={onDelete}>
                    <Trash2 className="mr-2 h-4 w-4"/> Hapus
                </Button>
            </CardFooter>
        </Card>
    );
}

