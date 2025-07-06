
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { RecurringTransaction, Category, Wallet } from '@/lib/types'
import { formatCurrency, cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { Checkbox } from './ui/checkbox'

const formSchema = z.object({
  name: z.string().min(1, "Nama transaksi harus diisi."),
  type: z.enum(['income', 'expense'], { required_error: "Tipe transaksi harus dipilih." }),
  baseAmount: z.coerce.number({ required_error: "Jumlah harus diisi." }).positive("Jumlah harus angka positif."),
  adminFee: z.coerce.number().min(0).optional(),
  categoryId: z.string().optional(),
  walletId: z.string().min(1, "Dompet harus dipilih."),
  dayOfMonth: z.coerce.number().min(1, "Tanggal harus antara 1-31").max(31, "Tanggal harus antara 1-31"),
  notes: z.string().optional(),
}).refine(data => {
    if (data.type === 'expense') {
        return !!data.categoryId;
    }
    return true;
}, {
    message: "Kategori harus dipilih untuk pengeluaran.",
    path: ["categoryId"],
});

type FormValues = z.infer<typeof formSchema>

interface AddRecurringTransactionFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: RecurringTransaction) => void
  transactionToEdit?: RecurringTransaction | null;
  categories: Category[];
  wallets: Wallet[];
}

export function AddRecurringTransactionForm({ isOpen, onOpenChange, onSubmit, transactionToEdit, categories, wallets }: AddRecurringTransactionFormProps) {
  const [showFeeInput, setShowFeeInput] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "expense",
      baseAmount: 0,
      adminFee: 0,
      categoryId: "",
      walletId: "",
      dayOfMonth: 1,
      notes: ""
    },
  })

  const transactionType = form.watch("type");
  const watchedBaseAmount = form.watch("baseAmount");
  const watchedAdminFee = form.watch("adminFee");
  const totalTransactionAmount = transactionType === 'expense'
      ? (watchedBaseAmount || 0) + (showFeeInput ? (watchedAdminFee || 0) : 0)
      : (watchedBaseAmount || 0) - (showFeeInput ? (watchedAdminFee || 0) : 0);

  React.useEffect(() => {
    if (transactionToEdit && isOpen) {
      setShowFeeInput(!!transactionToEdit.adminFee && transactionToEdit.adminFee > 0);
      form.reset({
        ...transactionToEdit,
        baseAmount: transactionToEdit.baseAmount ?? transactionToEdit.amount,
        adminFee: transactionToEdit.adminFee || 0,
        categoryId: transactionToEdit.categoryId || "",
        notes: transactionToEdit.notes || ""
      });
    } else if (!transactionToEdit && isOpen) {
      setShowFeeInput(false);
      form.reset({
        name: "",
        type: "expense",
        baseAmount: 0,
        adminFee: 0,
        categoryId: "",
        walletId: "",
        dayOfMonth: 1,
        notes: ""
      });
    }
  }, [transactionToEdit, isOpen, form]);

  const handleSubmit = (data: FormValues) => {
    const finalAmount = data.type === 'expense'
        ? data.baseAmount + (data.adminFee || 0)
        : data.baseAmount - (data.adminFee || 0);

    const transactionData: RecurringTransaction = {
      id: transactionToEdit?.id || `rec-${Date.now()}`,
      name: data.name,
      type: data.type,
      amount: finalAmount,
      baseAmount: data.baseAmount,
      adminFee: data.adminFee,
      categoryId: data.categoryId,
      walletId: data.walletId,
      dayOfMonth: data.dayOfMonth,
      notes: data.notes,
      lastAdded: transactionToEdit?.lastAdded || null,
    };
    onSubmit(transactionData);
  }

  const isEditing = !!transactionToEdit;
  const expenseCategories = categories.filter(c => !c.isEssential);
  const hasNoWallets = wallets.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{isEditing ? 'Ubah Transaksi Berulang' : 'Tambah Transaksi Berulang'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail transaksi berulang Anda.' : 'Atur transaksi yang akan ditambahkan otomatis setiap bulan.'}
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
                                Anda harus membuat dompet terlebih dahulu sebelum bisa menambahkan transaksi.
                                <Button asChild variant="link" className="p-0 h-auto ml-1">
                                    <Link href="/wallets">Buat Dompet</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nama Transaksi</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: Tagihan Internet" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Tipe Transaksi</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="expense" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                Pengeluaran
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="income" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                Pemasukan
                                </FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <FormField
                        control={form.control}
                        name="baseAmount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Jumlah Pokok</FormLabel>
                            <FormControl>
                                <Input 
                                type="text" 
                                placeholder="Rp 350.000" 
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

                      <div className="space-y-2">
                          <div className="items-top flex space-x-2">
                              <Checkbox id="includeFeeRecurring" checked={showFeeInput} onCheckedChange={(checked) => setShowFeeInput(!!checked)} />
                              <div className="grid gap-1.5 leading-none">
                                  <label htmlFor="includeFeeRecurring" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  Sertakan Biaya Admin/Potongan
                                  </label>
                              </div>
                          </div>
                          {showFeeInput && (
                              <FormField
                              control={form.control}
                              name="adminFee"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel className="sr-only">Biaya Admin</FormLabel>
                                  <FormControl>
                                      <Input 
                                      type="text" 
                                      placeholder="Contoh: Rp 2.500" 
                                      value={field.value && field.value > 0 ? formatCurrency(field.value) : ""}
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
                          )}
                          <div className="flex justify-between items-center bg-secondary p-2 rounded-md">
                              <span className="text-sm font-semibold">Total Transaksi</span>
                              <span className={cn("text-sm font-bold", transactionType === 'income' ? 'text-green-600' : 'text-foreground')}>{formatCurrency(totalTransactionAmount)}</span>
                          </div>
                      </div>

                    <FormField
                      control={form.control}
                      name="walletId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dompet</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} defaultValue={field.value} disabled={hasNoWallets}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih dompet sumber/tujuan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                    {transactionType === 'expense' && (
                        <>
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Kategori</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih kategori pengeluaran" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {expenseCategories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                            </SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <div className="flex justify-end -mt-2">
                                <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                                    <Link href="/budget">
                                        <PlusCircle className="mr-1 h-3 w-3" />
                                        Tambah Kategori Baru
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                        <FormField
                            control={form.control}
                            name="dayOfMonth"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Jalankan Setiap Tanggal</FormLabel>
                                <FormControl>
                                    <Input 
                                    type="number"
                                    min="1"
                                    max="31"
                                    placeholder="Contoh: 25"
                                    {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Catatan (Opsional)</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Detail tambahan" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>
            <DialogFooter className="border-t bg-background p-6">
              <Button type="submit" disabled={hasNoWallets}>{isEditing ? 'Simpan Perubahan' : 'Simpan Transaksi'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
