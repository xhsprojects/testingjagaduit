
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Asset } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

const assetTypes = ['Properti', 'Investasi', 'Kas & Setara Kas', 'Lainnya'] as const;

const formSchema = z.object({
  name: z.string().min(1, "Nama aset harus diisi."),
  value: z.coerce.number({ required_error: "Nilai aset harus diisi." }).positive("Nilai aset harus angka positif."),
  type: z.enum(assetTypes, { required_error: "Tipe aset harus dipilih." }),
})

type FormValues = z.infer<typeof formSchema>

interface AddAssetFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Asset) => void
  assetToEdit?: Asset | null;
}

export function AddAssetForm({ isOpen, onOpenChange, onSubmit, assetToEdit }: AddAssetFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      value: 0,
      type: "Properti",
    },
  })

  React.useEffect(() => {
    if (assetToEdit && isOpen) {
      form.reset(assetToEdit);
    } else if (!assetToEdit && isOpen) {
      form.reset({
        name: "",
        value: 0,
        type: "Properti",
      });
    }
  }, [assetToEdit, isOpen, form]);


  const handleSubmit = (data: FormValues) => {
    const assetData: Asset = {
      ...data,
      id: assetToEdit?.id || `asset-${Date.now()}`,
    };
    onSubmit(assetData);
  }

  const isEditing = !!assetToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{isEditing ? 'Ubah Aset' : 'Tambah Aset Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail aset Anda di bawah ini.' : 'Masukkan detail aset baru Anda untuk melacak kekayaan bersih.'}
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
                        <FormLabel>Nama Aset</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: Rumah, Saham BBCA" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nilai Aset Saat Ini</FormLabel>
                        <FormControl>
                            <Input 
                            type="text" 
                            placeholder="Contoh: Rp 500.000.000" 
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
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipe Aset</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih tipe aset" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {assetTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                    {type}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>
            <DialogFooter className="mt-auto border-t bg-background p-6">
              <Button type="submit">{isEditing ? 'Simpan Perubahan' : 'Simpan Aset'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
