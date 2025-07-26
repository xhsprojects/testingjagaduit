
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { iconMap } from '@/lib/icons';
import { presetCategories, presetWallets } from '@/lib/data';
import type { Category, Wallet } from '@/lib/types';
import { Check, Edit, Loader2, Sparkles, Trash2, Wallet as WalletIcon } from 'lucide-react';
import { Input } from './ui/input';
import { useAuth } from '@/context/AuthContext';

interface AllocationPageProps {
  onSave: (data: { categories: Category[], wallets: Wallet[] }) => void;
  onSkip: () => void;
}

export default function AllocationPage({ onSave, onSkip }: AllocationPageProps) {
  const { user } = useAuth();
  const [categories, setCategories] = React.useState<Category[]>(
    presetCategories.map((cat, index) => ({
        ...cat,
        id: `preset-cat-${index}`,
    }))
  );
  const [wallets, setWallets] = React.useState<Omit<Wallet, 'id' | 'initialBalance'>[]>(presetWallets);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Create full wallet objects with IDs and zero balance
    const finalWallets: Wallet[] = wallets.map(w => ({
        ...w,
        id: `wallet-preset-${w.name.toLowerCase().replace(/\s/g, '-')}`,
        initialBalance: 0
    }));
    await onSave({ categories, wallets: finalWallets });
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl animate-in fade-in duration-500">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-9 w-9 text-primary" />
            </div>
            <CardTitle className="text-2xl font-headline">Selamat Datang, {user?.displayName?.split(' ')[0] || 'Pengguna'}!</CardTitle>
            <CardDescription>Mari siapkan Jaga Duit untuk pertama kali. Anda bisa mengubah ini nanti di Pengaturan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><WalletIcon className="h-5 w-5 text-primary"/> Langkah 1: Atur Dompet Anda</h3>
                <p className="text-sm text-muted-foreground">Ini adalah sumber dana Anda, seperti rekening bank atau dompet tunai. Saldo awal bisa diatur nanti.</p>
                <div className="space-y-2">
                    {wallets.map((wallet, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                           <span className="p-2 bg-secondary rounded-md">
                             {React.createElement(iconMap[wallet.icon], { className: 'h-5 w-5' })}
                           </span>
                           <Input className="flex-grow" value={wallet.name} readOnly />
                           <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setWallets(w => w.filter((_, i) => i !== index))}>
                               <Trash2 className="h-4 w-4"/>
                           </Button>
                        </div>
                    ))}
                    <Button variant="outline" className="w-full" onClick={() => setWallets(w => [...w, {name: 'Dompet Baru', icon: 'Wallet'}])}>Tambah Dompet</Button>
                </div>
            </div>
            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2"><Edit className="h-5 w-5 text-primary"/> Langkah 2: Konfirmasi Kategori</h3>
                <p className="text-sm text-muted-foreground">Kami telah menyiapkan beberapa kategori umum untuk Anda. Anda bisa menghapus yang tidak perlu.</p>
                 <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {categories.map((cat, index) => (
                         <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                           <span className="p-2 bg-secondary rounded-md">
                             {React.createElement(iconMap[cat.icon], { className: 'h-5 w-5' })}
                           </span>
                           <Input className="flex-grow" value={cat.name} readOnly />
                           <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setCategories(c => c.filter((_, i) => i !== index))} disabled={cat.isEssential}>
                               <Trash2 className="h-4 w-4"/>
                           </Button>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={onSkip}>Atur Nanti Saja</Button>
            <Button className="w-full sm:w-auto flex-grow" disabled={isSaving} onClick={handleSave}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}
              Simpan & Lanjutkan
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
