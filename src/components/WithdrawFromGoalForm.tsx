
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import Link from 'next/link'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import type { SavingGoal, Wallet, Expense, Income } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

const formSchema = z.object({
  amount: z.coerce.number({ required_error: "Jumlah harus diisi." }).positive("Jumlah harus angka positif."),
  savingGoalId: z.string().min(1, "Silakan pilih dari tujuan mana dana ditarik."),
  walletId: z.string().min(1, "Silakan pilih dompet tujuan."),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface WithdrawFromGoalFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  goals: SavingGoal[]
  wallets: Wallet[]
  expenses: Expense[]
  incomes: Income[]
  onSubmit: (data: FormValues) => void
}

export function WithdrawFromGoalForm({ isOpen, onOpenChange, goals, wallets, expenses, incomes, onSubmit }: WithdrawFromGoalFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      savingGoalId: "",
      walletId: "",
      notes: ""
    },
  })
  
  const watchedWalletId = useWatch({ control: form.control, name: 'walletId' });

  const selectedWalletBalance = React.useMemo(() => {
    if (!watchedWalletId || !wallets || !expenses || !incomes) return null;
    
    const wallet = wallets.find(w => w.id === watchedWalletId);
    if (!wallet) return null;

    const totalIncome = (incomes).filter(i => i.walletId === watchedWalletId).reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = (expenses).filter(e => e.walletId === watchedWalletId).reduce((sum, e) => sum + e.amount, 0);
    return wallet.initialBalance + totalIncome - totalExpense;
  }, [watchedWalletId, wallets, incomes, expenses]);

  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);


  const handleSubmit = (data: FormValues) => {
    onSubmit(data);
  }

  const hasNoWallets = wallets.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>Tarik Dana dari Tabungan</DialogTitle>
          <DialogDescription>
            Catat penarikan dana dari tujuan tabungan Anda. Dana ini akan ditambahkan ke saldo dompet yang Anda pilih.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-2">
                    {hasNoWallets && (
                        <Alert variant="destructive">
                            <AlertTitle>Tidak Ada Dompet</AlertTitle>
                            <AlertDescription>
                                Anda harus membuat dompet terlebih dahulu sebelum bisa menarik dana.
                                <Button asChild variant="link" className="p-0 h-auto ml-1">
                                    <Link href="/wallets">Buat Dompet</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                    <FormField
                    control={form.control}
                    name="savingGoalId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tarik Dari Tujuan</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih tujuan tabungan" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                            {goals.map((goal) => (
                                <SelectItem key={goal.id} value={goal.id}>
                                {goal.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="walletId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Masukkan Dana Ke Dompet</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={hasNoWallets}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih dompet tujuan" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                            {wallets.map((wallet) => (
                                <SelectItem key={wallet.id} value={wallet.id}>
                                {wallet.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     {selectedWalletBalance !== null && (
                      <div className="text-xs text-muted-foreground text-right -mt-1 pr-1">
                          Saldo Saat Ini: {formatCurrency(selectedWalletBalance)}
                      </div>
                    )}
                    <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Jumlah Penarikan</FormLabel>
                        <FormControl>
                            <Input 
                            type="text"
                            inputMode="numeric"
                            placeholder="Contoh: Rp 500.000" 
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
                    <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Catatan (Opsional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Contoh: Untuk biaya perbaikan motor" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>
            <DialogFooter className="mt-auto border-t bg-background p-6">
              <Button type="submit" disabled={hasNoWallets}>Simpan Penarikan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
