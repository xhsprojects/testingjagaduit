
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { SavingGoal } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, "Nama tujuan harus diisi."),
  targetAmount: z.coerce.number({ required_error: "Target jumlah harus diisi." }).positive("Target jumlah harus angka positif."),
})

type FormValues = z.infer<typeof formSchema>

interface AddSavingGoalFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SavingGoal) => void
  goalToEdit?: SavingGoal | null;
  isSubmitting: boolean;
}

export function AddSavingGoalForm({ isOpen, onOpenChange, onSubmit, goalToEdit, isSubmitting }: AddSavingGoalFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      targetAmount: 0,
    },
  })

  React.useEffect(() => {
    if (goalToEdit && isOpen) {
      form.reset({
        name: goalToEdit.name,
        targetAmount: goalToEdit.targetAmount,
      });
    } else {
      form.reset({
        name: "",
        targetAmount: 0,
      });
    }
  }, [goalToEdit, isOpen, form]);


  const handleSubmit = (data: FormValues) => {
    const goalData: SavingGoal = {
      ...data,
      id: goalToEdit?.id || `goal-${Date.now()}`,
    };
    onSubmit(goalData);
  }

  const isEditing = !!goalToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{isEditing ? 'Ubah Tujuan' : 'Tambah Tujuan Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail tujuan menabung Anda.' : 'Masukkan detail tujuan menabung baru Anda.'}
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
                        <FormLabel>Nama Tujuan</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: Dana Darurat" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Target Jumlah</FormLabel>
                        <FormControl>
                            <Input 
                            type="text" 
                            placeholder="Contoh: Rp 10.000.000" 
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
                </div>
            </div>
            <DialogFooter className="mt-auto border-t bg-background p-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Simpan Perubahan' : 'Simpan Tujuan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
