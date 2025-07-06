
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import type { Wallet, Expense, Income } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { transferFunds } from '@/app/wallets/actions'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

const formSchema = z.object({
  fromWalletId: z.string().min(1, "Dompet asal harus dipilih."),
  toWalletId: z.string().min(1, "Dompet tujuan harus dipilih."),
  amount: z.coerce.number().positive("Jumlah transfer harus lebih dari nol."),
  notes: z.string().optional(),
}).refine(data => data.fromWalletId !== data.toWalletId, {
    message: "Dompet asal dan tujuan tidak boleh sama.",
    path: ["toWalletId"],
});

type FormValues = z.infer<typeof formSchema>

interface TransferFundsFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  wallets: Wallet[]
  expenses: Expense[]
  incomes: Income[]
}

export function TransferFundsForm({ isOpen, onOpenChange, wallets, expenses, incomes }: TransferFundsFormProps) {
  const { idToken } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromWalletId: "",
      toWalletId: "",
      amount: 0,
      notes: "",
    },
  });

  const fromWalletId = useWatch({ control: form.control, name: 'fromWalletId' });

  const fromWalletBalance = React.useMemo(() => {
    if (!fromWalletId) return null;
    const wallet = wallets.find(w => w.id === fromWalletId);
    if (!wallet) return null;
    const totalIncome = incomes.filter(i => i.walletId === fromWalletId).reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = expenses.filter(e => e.walletId === fromWalletId).reduce((sum, e) => sum + e.amount, 0);
    return wallet.initialBalance + totalIncome - totalExpense;
  }, [fromWalletId, wallets, incomes, expenses]);


  const handleSubmit = async (data: FormValues) => {
    if (!idToken) return;
    setIsSubmitting(true);
    
    const result = await transferFunds(idToken, { ...data, date: new Date() });

    if (result.success) {
        toast({ title: 'Sukses', description: result.message });
        onOpenChange(false);
        form.reset();
    } else {
        toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  }

  const availableToWallets = wallets.filter(w => w.id !== fromWalletId);
  const canTransfer = wallets.length >= 2;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>Transfer Antar Dompet</DialogTitle>
          <DialogDescription>
            Pindahkan dana dari satu dompet ke dompet lain. Transaksi ini akan tercatat di riwayat.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-2">
                     {!canTransfer && (
                        <Alert variant="destructive">
                            <AlertTitle>Dompet Tidak Cukup</AlertTitle>
                            <AlertDescription>
                                Anda memerlukan setidaknya dua dompet untuk dapat melakukan transfer.
                                <Button asChild variant="link" className="p-0 h-auto ml-1">
                                    <Link href="/wallets">Kelola Dompet</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Jumlah Transfer</FormLabel>
                            <FormControl>
                                <Input 
                                type="text" 
                                placeholder="Rp 100.000" 
                                value={field.value > 0 ? formatCurrency(field.value) : ""}
                                onChange={(e) => {
                                    const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                    field.onChange(numericValue);
                                }}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="fromWalletId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Dari Dompet</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!canTransfer}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih dompet asal" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="toWalletId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ke Dompet</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!fromWalletId || !canTransfer}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih dompet tujuan" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {availableToWallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     {fromWalletBalance !== null && (
                      <div className="text-xs text-muted-foreground text-right -mt-1 pr-1">
                          Saldo dompet asal: {formatCurrency(fromWalletBalance)}
                      </div>
                    )}
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Catatan (Opsional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Detail tambahan untuk transfer ini" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
            <DialogFooter className="mt-auto border-t bg-background p-6">
              <Button type="submit" disabled={isSubmitting || !canTransfer}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lakukan Transfer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
