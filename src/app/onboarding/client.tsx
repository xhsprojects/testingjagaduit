
"use client";

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, Wallet, HandCoins, Loader2, ArrowRight, Check } from 'lucide-react';
import { iconNames, IconName, iconMap } from '@/lib/icons';
import { presetCategories, presetWallets } from '@/lib/data';
import type { Category, Wallet as WalletType } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { saveOnboardingData } from './actions';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type OnboardingStage = 'wallets' | 'categories';

// --- Schemas ---
const walletSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama dompet harus diisi."),
  icon: z.string().min(1, "Pilih ikon."),
  initialBalance: z.coerce.number().min(0, "Saldo tidak boleh negatif.").default(0),
});

const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama kategori tidak boleh kosong."),
  icon: z.string().min(1, "Pilih ikon."),
  isEssential: z.boolean().optional(),
  isDebtCategory: z.boolean().optional(),
});

const onboardingFormSchema = z.object({
  wallets: z.array(walletSchema).min(1, "Harus ada minimal satu dompet."),
  categories: z.array(categorySchema).min(1, "Harus ada minimal satu kategori."),
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

interface OnboardingClientPageProps {
  onSetupComplete: () => void;
}

export default function OnboardingClientPage({ onSetupComplete }: OnboardingClientPageProps) {
    const { user, idToken } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [stage, setStage] = React.useState<OnboardingStage>('wallets');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<OnboardingFormValues>({
        resolver: zodResolver(onboardingFormSchema),
        defaultValues: {
            wallets: presetWallets.map((w, i) => ({ ...w, id: `preset-wallet-${i}`, initialBalance: 0 })),
            categories: presetCategories.map((c, i) => ({ ...c, id: `preset-cat-${i}` })),
        },
    });

    const { fields: walletFields, append: appendWallet, remove: removeWallet } = useFieldArray({
        control: form.control, name: "wallets"
    });
    const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
        control: form.control, name: "categories"
    });

    const handleNextStep = () => {
        form.trigger("wallets").then(isValid => {
            if (isValid) setStage('categories');
        });
    };

    const onSubmit = async (data: OnboardingFormValues) => {
        if (!idToken) {
            toast({ title: 'Sesi tidak valid', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        const result = await saveOnboardingData(idToken, data.wallets, data.categories as Category[]);
        if (result.success) {
            toast({ title: "Pengaturan Selesai!", description: "Selamat datang di Jaga Duit! Anda akan diarahkan ke panduan singkat." });
            router.push('/tutorial');
        } else {
            toast({ title: 'Gagal Menyimpan', description: result.message, variant: 'destructive' });
            setIsSubmitting(false);
        }
    };

    return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4 pb-24 md:pb-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
            <HandCoins className="h-10 w-10 md:h-12 md:w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-xl md:text-2xl font-headline">Selamat Datang, {user?.displayName || 'Pengguna Baru'}!</CardTitle>
            <CardDescription className="text-sm md:text-base">Mari siapkan Jaga Duit untuk pertama kali. Anda bisa mengubah ini nanti di Pengaturan.</CardDescription>
            <div className="flex items-center justify-center gap-2 md:gap-4 pt-4">
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${stage === 'wallets' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border'}`}>1</div>
                    <span className={`font-semibold text-sm md:text-base ${stage === 'wallets' ? 'text-primary' : 'text-muted-foreground'}`}>Atur Dompet</span>
                </div>
                <div className="h-0.5 w-8 md:w-16 bg-border"></div>
                 <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${stage === 'categories' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border'}`}>2</div>
                    <span className={`font-semibold text-sm md:text-base ${stage === 'categories' ? 'text-primary' : 'text-muted-foreground'}`}>Atur Kategori</span>
                </div>
            </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {stage === 'wallets' && (
                <div className="animate-in fade-in duration-300">
                    <CardContent className="space-y-4">
                        <h3 className="font-semibold text-base md:text-lg">Langkah 1: Atur Dompet Anda</h3>
                        <p className="text-sm text-muted-foreground">Dompet adalah sumber dana Anda (misal: kas, rekening bank). Masukkan saldo awal jika ada.</p>
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                             {walletFields.map((field, index) => {
                                return (
                                <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                                    <Controller
                                      control={form.control}
                                      name={`wallets.${index}.icon`}
                                      render={({ field: ctlField }) => {
                                        const Icon = iconMap[ctlField.value as IconName] || Wallet;
                                        return (
                                          <Select onValueChange={ctlField.onChange} value={ctlField.value}>
                                              <FormControl>
                                                  <SelectTrigger className="w-16 h-16">
                                                      <SelectValue>
                                                          <Icon className="h-6 w-6 mx-auto" />
                                                      </SelectValue>
                                                  </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                  {iconNames.map(i => (
                                                      <SelectItem key={i} value={i}>
                                                          <div className="flex items-center gap-2">
                                                              {React.createElement(iconMap[i], { className: "h-4 w-4" })}
                                                              <span>{i}</span>
                                                          </div>
                                                      </SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                        )
                                      }}
                                    />
                                    <div className="flex-grow space-y-1">
                                        <FormField control={form.control} name={`wallets.${index}.name`} render={({ field: f }) => (<FormItem><FormControl><Input placeholder="Nama Dompet" {...f} /></FormControl><FormMessage/></FormItem>)}/>
                                        <Controller
                                            control={form.control}
                                            name={`wallets.${index}.initialBalance`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Saldo Awal (Rp)"
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={field.value > 0 ? formatCurrency(field.value) : ""}
                                                            onChange={e => {
                                                                const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                                field.onChange(numericValue);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" type="button" onClick={() => removeWallet(index)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            )})}
                        </div>
                        <Button type="button" variant="outline" onClick={() => appendWallet({ id: `w-new-${Date.now()}`, name: '', icon: 'Wallet', initialBalance: 0 })}><PlusCircle className="mr-2 h-4 w-4"/>Tambah Dompet</Button>
                    </CardContent>
                    <CardFooter>
                         <Button type="button" className="w-full text-base py-5" onClick={handleNextStep}>Lanjut <ArrowRight className="ml-2 h-4 w-4"/></Button>
                    </CardFooter>
                </div>
            )}
            {stage === 'categories' && (
                 <div className="animate-in fade-in duration-300">
                    <CardContent className="space-y-4">
                        <h3 className="font-semibold text-base md:text-lg">Langkah 2: Konfirmasi Kategori</h3>
                        <p className="text-sm text-muted-foreground">Kami telah menyiapkan beberapa kategori umum. Anda bisa mengubah ikon, nama, atau menghapus yang tidak perlu.</p>
                         <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                            {categoryFields.map((field, index) => {
                                return(
                                <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                                     <Controller control={form.control} name={`categories.${index}.icon`} render={({ field: ctlField }) => {
                                        const Icon = iconMap[ctlField.value as IconName] || Wallet;
                                        return (
                                            <Select onValueChange={ctlField.onChange} value={ctlField.value}><FormControl><SelectTrigger className="w-20 h-10"><SelectValue><Icon className="h-5 w-5 mx-auto" /></SelectValue></SelectTrigger></FormControl>
                                            <SelectContent>{iconNames.map(i => <SelectItem key={i} value={i}><div className="flex items-center gap-2">{React.createElement(iconMap[i], {className: "h-4 w-4"})}<span>{i}</span></div></SelectItem>)}</SelectContent>
                                            </Select>
                                        )
                                    }} />
                                    <FormField control={form.control} name={`categories.${index}.name`} render={({ field: f }) => (<FormItem className="flex-grow"><FormControl><Input placeholder="Nama Kategori" {...f} disabled={field.isEssential} /></FormControl><FormMessage/></FormItem>)}/>
                                    <Button variant="ghost" size="icon" type="button" onClick={() => removeCategory(index)} disabled={field.isEssential} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            )})}
                        </div>
                        <Button type="button" variant="outline" onClick={() => appendCategory({ id: `c-new-${Date.now()}`, name: '', icon: 'PiggyBank' })}><PlusCircle className="mr-2 h-4 w-4"/>Tambah Kategori</Button>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-4">
                        <Button type="button" variant="outline" className="text-base py-5" onClick={() => setStage('wallets')}>Kembali</Button>
                        <Button type="submit" className="text-base py-5" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : <><Check className="mr-2 h-4 w-4"/>Simpan & Selesai</>}</Button>
                    </CardFooter>
                </div>
            )}
          </form>
        </Form>
      </Card>
    </div>
  );
}
