
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { Debt } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

const formSchema = z.object({
  name: z.string().min(1, "Nama utang harus diisi."),
  totalAmount: z.coerce.number({ required_error: "Total utang harus diisi." }).positive("Total utang harus angka positif."),
  interestRate: z.coerce.number({ required_error: "Suku bunga harus diisi." }).min(0, "Suku bunga tidak boleh negatif."),
  minimumPayment: z.coerce.number({ required_error: "Pembayaran minimum harus diisi." }).positive("Pembayaran minimum harus angka positif."),
})

type FormValues = z.infer<typeof formSchema>

interface AddDebtFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Debt) => void
  debtToEdit?: Debt | null;
}

export function AddDebtForm({ isOpen, onOpenChange, onSubmit, debtToEdit }: AddDebtFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      totalAmount: 0,
      interestRate: 0,
      minimumPayment: 0,
    },
  })

  React.useEffect(() => {
    if (debtToEdit && isOpen) {
      form.reset(debtToEdit);
    } else if (!debtToEdit && isOpen) {
      form.reset({
        name: "",
        totalAmount: 0,
        interestRate: 0,
        minimumPayment: 0,
      });
    }
  }, [debtToEdit, isOpen, form]);


  const handleSubmit = (data: FormValues) => {
    const debtData: Debt = {
      ...data,
      id: debtToEdit?.id || `debt-${Date.now()}`,
    };
    onSubmit(debtData);
  }

  const isEditing = !!debtToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{isEditing ? 'Ubah Utang' : 'Tambah Utang Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail utang Anda di bawah ini.' : 'Masukkan detail utang baru Anda.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-2">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nama Utang</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: Cicilan Motor" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Total Utang</FormLabel>
                        <FormControl>
                            <Input 
                            type="text"
                            inputMode="decimal"
                            placeholder="Contoh: Rp 15.000.000" 
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
                    name="minimumPayment"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Pembayaran Minimum per Bulan</FormLabel>
                        <FormControl>
                            <Input 
                            type="text"
                            inputMode="decimal"
                            placeholder="Contoh: Rp 800.000" 
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
                    name="interestRate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Suku Bunga (% per tahun)</FormLabel>
                        <FormControl>
                            <Input 
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            placeholder="Contoh: 5.5" 
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>
            <DialogFooter className="border-t bg-background p-6">
              <Button type="submit">{isEditing ? 'Simpan Perubahan' : 'Simpan Utang'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
