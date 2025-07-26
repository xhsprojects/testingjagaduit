

"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { iconMap, IconName } from '@/lib/icons';
import { presetCategories, presetWallets } from '@/lib/data';
import type { Category, Wallet } from '@/lib/types';
import { Check, Loader2, Sparkles, Trash2, Wallet as WalletIcon, ChevronRight, Banknote, Landmark, Edit, CreditCard } from 'lucide-react';
import { Input } from './ui/input';
import { useAuth } from '@/context/AuthContext';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface AllocationPageProps {
  onSave: (data: { categories: Category[], wallets: Wallet[] }) => void;
}

type Step = 'wallets' | 'categories';

export default function AllocationPage({ onSave }: AllocationPageProps) {
  const { user } = useAuth();
  const [step, setStep] = React.useState<Step>('wallets');
  
  const [categories, setCategories] = React.useState<Category[]>(
    presetCategories.map((cat, index) => ({
      ...cat,
      id: `preset-cat-${index}`,
    }))
  );
  
  const [wallets, setWallets] = React.useState<Wallet[]>(
    presetWallets.map(w => ({
      ...w,
      id: `wallet-preset-${w.name.toLowerCase().replace(/\s/g, '-')}`,
      initialBalance: 0
    }))
  );

  const [isSaving, setIsSaving] = React.useState(false);

  const handleWalletChange = (id: string, field: keyof Wallet, value: string | number | IconName) => {
    setWallets(currentWallets => currentWallets.map(w => w.id === id ? { ...w, [field]: value } : w));
  };
  
  const handleCategoryChange = (id: string, field: keyof Category, value: string | IconName) => {
    setCategories(currentCategories => currentCategories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  
  const handleRemoveWallet = (id: string) => {
      setWallets(current => current.filter(w => w.id !== id));
  };

  const handleAddWallet = () => {
      const newId = `wallet-new-${Date.now()}`;
      setWallets(current => [...current, { name: 'Dompet Baru', icon: 'Wallet', id: newId, initialBalance: 0 }]);
  };

  const handleRemoveCategory = (id: string) => {
      setCategories(current => current.filter(c => c.id !== id));
  };
  
  const handleAddCategory = () => {
      const newId = `cat-new-${Date.now()}`;
      setCategories(current => [...current, { name: 'Kategori Baru', icon: 'ShoppingBasket', id: newId }]);
  };


  const handleSave = async () => {
    setIsSaving(true);
    await onSave({ categories, wallets });
    setIsSaving(false);
  };
  
  const StepIndicator = () => (
    <div className="flex justify-center items-center gap-2 mb-4">
        <div className={cn("flex items-center gap-2 text-sm", step === 'wallets' ? 'font-bold text-primary' : 'text-muted-foreground')}>
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border-2", step === 'wallets' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-secondary-foreground')}>
                1
            </div>
            <span>Atur Dompet</span>
        </div>
        <div className="h-0.5 w-8 bg-border"></div>
         <div className={cn("flex items-center gap-2 text-sm", step === 'categories' ? 'font-bold text-primary' : 'text-muted-foreground')}>
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border-2", step === 'categories' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-secondary-foreground')}>
                2
            </div>
            <span>Atur Kategori</span>
        </div>
    </div>
  )

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
        
        <StepIndicator/>

        <CardContent className="space-y-8">
            {step === 'wallets' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><WalletIcon className="h-5 w-5 text-primary"/> Langkah 1: Atur Dompet Anda</h3>
                    <p className="text-sm text-muted-foreground">Ini adalah sumber dana Anda (rekening bank, dompet tunai). Atur ikon, nama, dan saldo awal masing-masing.</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {wallets.map((wallet) => {
                             const Icon = iconMap[wallet.icon] || WalletIcon;
                             return (
                            <div key={wallet.id} className="flex items-center gap-3 p-2 border rounded-md bg-background">
                                <Select onValueChange={(value: IconName) => handleWalletChange(wallet.id, 'icon', value)} defaultValue={wallet.icon}>
                                    <SelectTrigger className="w-[80px]">
                                        <SelectValue>
                                            <Icon className="h-5 w-5" />
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Wallet"><div className="flex items-center gap-2"><WalletIcon className="h-4 w-4" /><span>Dompet</span></div></SelectItem>
                                        <SelectItem value="Banknote"><div className="flex items-center gap-2"><Banknote className="h-4 w-4" /><span>Tunai</span></div></SelectItem>
                                        <SelectItem value="Landmark"><div className="flex items-center gap-2"><Landmark className="h-4 w-4" /><span>Bank</span></div></SelectItem>
                                        <SelectItem value="CreditCard"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span>Kartu</span></div></SelectItem>
                                    </SelectContent>
                                </Select>
                               <div className="flex-grow space-y-1">
                                   <Input placeholder="Nama Dompet" value={wallet.name} onChange={(e) => handleWalletChange(wallet.id, 'name', e.target.value)} />
                                   <Input 
                                     placeholder="Saldo Awal"
                                     value={wallet.initialBalance > 0 ? formatCurrency(wallet.initialBalance) : ''}
                                     onChange={(e) => handleWalletChange(wallet.id, 'initialBalance', Number(e.target.value.replace(/[^0-9]/g, '')))}
                                   />
                               </div>
                               <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 flex-shrink-0" onClick={() => handleRemoveWallet(wallet.id)}>
                                   <Trash2 className="h-4 w-4"/>
                               </Button>
                            </div>
                        )})}
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleAddWallet}>Tambah Dompet</Button>
                </div>
            )}
            {step === 'categories' && (
                 <div className="space-y-4 animate-in fade-in duration-300">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Edit className="h-5 w-5 text-primary"/> Langkah 2: Konfirmasi Kategori</h3>
                    <p className="text-sm text-muted-foreground">Kami telah menyiapkan beberapa kategori umum. Anda bisa mengubah ikon, nama, atau menghapus yang tidak perlu.</p>
                     <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {categories.map((cat) => (
                             <div key={cat.id} className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                <Select onValueChange={(value: IconName) => handleCategoryChange(cat.id, 'icon', value)} defaultValue={cat.icon}>
                                    <SelectTrigger className="w-[80px]">
                                        <SelectValue>
                                            {React.createElement(iconMap[cat.icon] || WalletIcon, { className: 'h-5 w-5' })}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(iconMap).map(iconName => (
                                            <SelectItem key={iconName} value={iconName}>
                                                <div className="flex items-center gap-2">
                                                    {React.createElement(iconMap[iconName as IconName], { className: 'h-4 w-4' })}
                                                    <span>{iconName}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                               <Input className="flex-grow" value={cat.name} onChange={(e) => handleCategoryChange(cat.id, 'name', e.target.value)} disabled={cat.isEssential} />
                               <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveCategory(cat.id)} disabled={cat.isEssential}>
                                   <Trash2 className="h-4 w-4"/>
                               </Button>
                               {cat.isEssential && <Badge variant="secondary">Wajib</Badge>}
                            </div>
                        ))}
                    </div>
                     <Button variant="outline" className="w-full" onClick={handleAddCategory}>Tambah Kategori</Button>
                </div>
            )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row-reverse gap-2">
            {step === 'wallets' && (
                 <Button className="w-full sm:w-auto" onClick={() => setStep('categories')}>
                     Lanjutkan <ChevronRight className="ml-2 h-4 w-4"/>
                 </Button>
            )}
             {step === 'categories' && (
                <>
                <Button className="w-full sm:w-auto flex-grow" disabled={isSaving} onClick={handleSave}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}
                  Simpan & Selesai
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep('wallets')}>Kembali</Button>
                </>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
