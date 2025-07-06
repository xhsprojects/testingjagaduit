
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"

import { cn, formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from '@/components/ui/textarea'
import type { Reminder } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { saveReminder } from '@/app/reminders/actions'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  name: z.string().min(1, "Nama pengingat harus diisi."),
  amount: z.coerce.number().positive("Jumlah harus angka positif."),
  dueDate: z.date({ required_error: "Tanggal jatuh tempo harus diisi." }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>

interface AddReminderFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reminderToEdit?: Reminder | null;
}

export function AddReminderForm({ isOpen, onOpenChange, reminderToEdit }: AddReminderFormProps) {
  const { user, idToken } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: 0,
      dueDate: new Date(),
      notes: "",
    },
  })

  React.useEffect(() => {
    if (isOpen) {
      if (reminderToEdit) {
        form.reset({
          ...reminderToEdit,
          dueDate: new Date(reminderToEdit.dueDate),
        });
      } else {
        form.reset({
          name: "",
          amount: 0,
          dueDate: new Date(),
          notes: "",
        });
      }
    }
  }, [isOpen, reminderToEdit, form]);

  const handleSubmit = async (data: FormValues) => {
    if (!user || !idToken) {
      toast({ title: 'Error', description: 'Sesi Anda tidak valid. Silakan muat ulang halaman.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    try {
        const localDate = data.dueDate;
        // Normalize the date to UTC midnight to avoid timezone issues.
        // This ensures that the date is stored consistently regardless of the user's or server's timezone.
        const utcDate = new Date(Date.UTC(
            localDate.getFullYear(),
            localDate.getMonth(),
            localDate.getDate(),
            0, 0, 0, 0
        ));

        const result = await saveReminder(idToken, {
            ...data,
            dueDate: utcDate, // Send the normalized UTC date
            id: reminderToEdit?.id,
            isPaid: reminderToEdit?.isPaid || false
        });

        if (result.success) {
            toast({ title: 'Sukses', description: result.message });
            onOpenChange(false);
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const isEditing = !!reminderToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{isEditing ? 'Ubah Pengingat' : 'Tambah Pengingat Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail pengingat pembayaran.' : 'Atur pengingat untuk tagihan atau pembayaran mendatang.'}
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
                        <FormLabel>Nama Pembayaran</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: Tagihan Listrik" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Jumlah</FormLabel>
                            <FormControl>
                            <Input 
                                type="text" 
                                inputMode="numeric"
                                placeholder="Rp 250.000" 
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
                        name="dueDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Jatuh Tempo</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? format(field.value, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
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
                            <Textarea 
                            placeholder="Detail tambahan seperti nomor pelanggan." 
                            {...field}
                            value={field.value || ''}
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
                {isEditing ? 'Simpan Perubahan' : 'Simpan Pengingat'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
