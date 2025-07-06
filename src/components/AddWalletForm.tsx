
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { Loader2, PiggyBank } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { Wallet } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { iconMap, iconNames, IconName } from '@/lib/icons'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useAuth } from '@/context/AuthContext'
import { saveWallet } from '@/app/wallets/actions'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  name: z.string().min(1, "Nama dompet harus diisi."),
  initialBalance: z.coerce.number({ required_error: "Saldo awal harus diisi." }).min(0, "Saldo tidak boleh negatif."),
  icon: z.enum(iconNames, { required_error: "Ikon harus dipilih." }),
})

type FormValues = z.infer<typeof formSchema>

interface AddWalletFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  walletToEdit?: Wallet | null;
}

export function AddWalletForm({ isOpen, onOpenChange, walletToEdit }: AddWalletFormProps) {
  const { idToken } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      initialBalance: 0,
      icon: "Wallet",
    },
  })

  React.useEffect(() => {
    if (walletToEdit && isOpen) {
      form.reset(walletToEdit);
    } else if (!walletToEdit && isOpen) {
      form.reset({
        name: "",
        initialBalance: 0,
        icon: "Wallet",
      });
    }
  }, [walletToEdit, isOpen, form]);


  const handleSubmit = async (data: FormValues) => {
    if (!idToken) return;

    setIsSubmitting(true);
    const walletData: Wallet = {
      ...data,
      id: walletToEdit?.id || `wallet-${Date.now()}`,
    };
    
    const result = await saveWallet(idToken, walletData);

    if (result.success) {
        toast({ title: 'Sukses', description: result.message });
        onOpenChange(false);
    } else {
        toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  }

  const isEditing = !!walletToEdit;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{isEditing ? 'Ubah Dompet' : 'Tambah Dompet Baru'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail dompet Anda di bawah ini.' : 'Masukkan detail sumber dana baru Anda.'}
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
                        <FormLabel>Nama Dompet</FormLabel>
                        <FormControl>
                            <Input placeholder="Contoh: Dompet Tunai, BCA" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="initialBalance"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Saldo Awal</FormLabel>
                        <FormControl>
                            <Input 
                            type="text" 
                            inputMode="numeric"
                            placeholder="Contoh: Rp 1.000.000" 
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
                    <Controller
                        control={form.control}
                        name="icon"
                        render={({ field }) => {
                            const Icon = iconMap[field.value as IconName] || PiggyBank;
                            return (
                                <FormItem>
                                    <FormLabel>Ikon</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 shrink-0" />
                                                    <SelectValue placeholder="Pilih ikon..." />
                                                </div>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent position="popper">
                                            {iconNames.map(iconName => {
                                                const IconComponent = iconMap[iconName];
                                                return (
                                                    <SelectItem key={iconName} value={iconName}>
                                                        <div className="flex items-center gap-2">
                                                            <IconComponent className="h-4 w-4" />
                                                            <span>{iconName}</span>
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )
                        }}
                    />
                </div>
            </div>
            <DialogFooter className="mt-auto border-t bg-background p-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Simpan Perubahan' : 'Simpan Dompet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
