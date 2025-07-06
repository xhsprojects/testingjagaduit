
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon, Camera, Loader2, Gem, PlusCircle, Info } from "lucide-react"
import Link from 'next/link'

import { cn, formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import type { Category, Expense, SavingGoal, Debt, Wallet, Income } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { scanReceipt } from '@/ai/flows/scan-receipt-flow'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Checkbox } from './ui/checkbox'

const baseFormSchema = z.object({
  baseAmount: z.coerce.number({ required_error: "Jumlah harus diisi." }).positive("Jumlah harus angka positif."),
  adminFee: z.coerce.number().min(0).optional(),
  categoryId: z.string().min(1, "Silakan pilih kategori."),
  date: z.date(),
  notes: z.string().optional(),
  savingGoalId: z.string().optional(),
  debtId: z.string().optional(),
  walletId: z.string().min(1, "Silakan pilih sumber dana/dompet."),
});

type FormValues = z.infer<typeof baseFormSchema>

interface AddExpenseFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  savingGoals: SavingGoal[]
  debts: Debt[]
  wallets: Wallet[]
  expenses?: Expense[]
  incomes?: Income[]
  onSubmit: (data: Expense) => void
  expenseToEdit?: Expense | null;
  isDebtPaymentMode?: boolean;
}

export function AddExpenseForm({ 
  isOpen, 
  onOpenChange, 
  categories, 
  savingGoals, 
  debts, 
  wallets,
  expenses,
  incomes,
  onSubmit, 
  expenseToEdit,
  isDebtPaymentMode = false
}: AddExpenseFormProps) {
  const { toast } = useToast();
  const { isPremium } = useAuth();
  const [isScanning, setIsScanning] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showFeeInput, setShowFeeInput] = React.useState(false);
  
  const savingsCategoryId = React.useMemo(() => categories.find(c => c.name === "Tabungan & Investasi")?.id, [categories]);
  const debtPaymentCategory = React.useMemo(() => categories.find(c => c.isDebtCategory), [categories]);

  const formSchema = React.useMemo(() => {
    return baseFormSchema.superRefine((data, ctx) => {
        if (data.categoryId === debtPaymentCategory?.id && !data.debtId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Silakan pilih utang yang ingin dibayar.",
                path: ["debtId"],
            });
        }
        if (data.categoryId === savingsCategoryId && !data.savingGoalId) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Silakan pilih tujuan tabungan untuk alokasi dana ini.",
                path: ["savingGoalId"],
            });
        }
    });
  }, [debtPaymentCategory, savingsCategoryId]);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseAmount: 0,
      adminFee: 0,
      categoryId: "",
      notes: "",
      savingGoalId: "",
      debtId: "",
      walletId: ""
    },
  })
  
  const watchCategoryId = form.watch("categoryId");
  const showSavingGoals = watchCategoryId === savingsCategoryId;
  const showDebts = watchCategoryId === debtPaymentCategory?.id;
  
  const watchedWalletId = form.watch('walletId');
  const watchedBaseAmount = form.watch('baseAmount');
  const watchedAdminFee = form.watch('adminFee');

  const selectedWalletBalance = React.useMemo(() => {
    if (!watchedWalletId || !wallets || !expenses || !incomes) return null;
    
    const wallet = wallets.find(w => w.id === watchedWalletId);
    if (!wallet) return null;

    const totalIncome = (incomes).filter(i => i.walletId === watchedWalletId).reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = (expenses).filter(e => e.walletId === watchedWalletId).reduce((sum, e) => sum + e.amount, 0);
    return wallet.initialBalance + totalIncome - totalExpense;
  }, [watchedWalletId, wallets, expenses, incomes]);

  React.useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setShowFeeInput(!!expenseToEdit.adminFee && expenseToEdit.adminFee > 0);
        form.reset({
          baseAmount: expenseToEdit.baseAmount ?? expenseToEdit.amount,
          adminFee: expenseToEdit.adminFee || 0,
          categoryId: expenseToEdit.categoryId,
          date: new Date(expenseToEdit.date),
          savingGoalId: expenseToEdit.savingGoalId,
          debtId: expenseToEdit.debtId,
          walletId: expenseToEdit.walletId,
          notes: expenseToEdit.notes,
        });
      } else {
        setShowFeeInput(false);
        form.reset({
          date: new Date(),
          baseAmount: 0,
          adminFee: 0,
          categoryId: "",
          notes: "",
          savingGoalId: "",
          debtId: "",
          walletId: ""
        });
      }
    }
  }, [expenseToEdit, isOpen, form]);


  const handleSubmit = (data: FormValues) => {
    const totalAmount = data.baseAmount + (data.adminFee || 0);
    const expenseData: Expense = {
      id: expenseToEdit?.id && !isDebtPaymentMode ? expenseToEdit.id : `exp-debt-${Date.now()}`,
      amount: totalAmount,
      baseAmount: data.baseAmount,
      adminFee: data.adminFee || 0,
      categoryId: data.categoryId,
      date: data.date,
      notes: data.notes || "",
      savingGoalId: data.savingGoalId || "",
      debtId: data.debtId || "",
      walletId: data.walletId,
    };
    onSubmit(expenseData);
  }

  const compressImage = (file: File, maxWidth = 1024, quality = 0.8): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let { width, height } = img;

                  if (width > height) {
                      if (width > maxWidth) {
                          height *= maxWidth / width;
                          width = maxWidth;
                      }
                  } else {
                      if (height > maxWidth) {
                          width *= maxWidth / height;
                          height = maxWidth;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;

                  const ctx = canvas.getContext('2d');
                  if (!ctx) {
                      return reject(new Error('Could not get canvas context'));
                  }
                  ctx.drawImage(img, 0, 0, width, height);
                  const dataUrl = canvas.toDataURL('image/jpeg', quality);
                  resolve(dataUrl);
              };
              img.onerror = (error) => reject(error);
          };
          reader.onerror = (error) => reject(error);
      });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsScanning(true);

      try {
          const compressedBase64 = await compressImage(file);
          const result = await scanReceipt({ receiptImage: compressedBase64 });

          if ('error' in result) {
              toast({
                  title: "Error Konfigurasi AI",
                  description: result.error,
                  variant: "destructive",
              });
          } else {
              let hasData = false;
              let extractedInfo = [];

              if (result.totalAmount && result.totalAmount > 0) {
                  form.setValue('baseAmount', result.totalAmount, { shouldValidate: true, shouldTouch: true });
                  hasData = true;
                  extractedInfo.push(`💰 ${formatCurrency(result.totalAmount)}`);
              }
              
              if (result.notes && result.notes.trim() !== '') {
                  form.setValue('notes', result.notes.trim(), { shouldValidate: true, shouldTouch: true });
                  hasData = true;
                  extractedInfo.push(`📝 Catatan ditambahkan`);
              }

              if (!hasData) {
                  toast({
                      title: "❌ Gagal Memindai",
                      description: "AI tidak dapat mengekstrak informasi apa pun dari struk. Coba foto dengan lebih jelas.",
                      variant: "destructive",
                  });
              } else {
                  toast({
                      title: "✅ Pindai Berhasil!",
                      description: `Informasi diekstrak: ${extractedInfo.join(' • ')}. Silakan periksa kembali dan lengkapi.`,
                  });
              }
          }

      } catch (error) {
          console.error("Receipt scan or compression failed:", error);
          toast({
              title: "Error",
              description: "Terjadi kesalahan saat memproses gambar. Silakan coba lagi.",
              variant: "destructive",
          });
      } finally {
          setIsScanning(false);
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
      }
  };

  const isEditing = !!expenseToEdit && !isDebtPaymentMode;
  
  const formTitle = isDebtPaymentMode ? 'Catat Pembayaran Utang' : isEditing ? 'Ubah Transaksi' : 'Tambah Transaksi Baru';
  const formDescription = isDebtPaymentMode
    ? 'Lengkapi detail pembayaran utang di bawah ini.'
    : isEditing
    ? 'Ubah detail transaksi Anda di bawah ini.'
    : 'Pindai struk atau masukkan detail transaksi secara manual. Klik simpan jika sudah selesai.';
  const buttonText = isDebtPaymentMode ? 'Catat Pembayaran Utang' : isEditing ? 'Simpan Perubahan' : 'Simpan Transaksi';

  const ScanButton = () => (
     <Button
        type="button"
        variant="outline"
        className="w-full relative"
        onClick={() => {
            if (isPremium) fileInputRef.current?.click();
        }}
        disabled={isScanning || !isPremium}
    >
        {isScanning ? (
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses Gambar...
            </>
        ) : (
            <>
                <Camera className="mr-2 h-4 w-4" />
                Pindai Struk / Pilih Gambar
            </>
        )}
        {!isPremium && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                <Gem className="h-3 w-3 mr-1"/> Premium
            </Badge>
        )}
    </Button>
  )
  
  const hasNoWallets = wallets.length === 0;
  const totalTransactionAmount = (watchedBaseAmount || 0) + (showFeeInput ? (watchedAdminFee || 0) : 0);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{formTitle}</DialogTitle>
          <DialogDescription>
            {formDescription}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-2">
                    {!isDebtPaymentMode && (
                        <>
                            <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                            />
                            {isPremium ? (
                                <ScanButton />
                            ) : (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger className="w-full">
                                            <Link href="/premium" className='w-full block' onClick={() => onOpenChange(false)}>
                                                <ScanButton />
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Upgrade ke Premium untuk menggunakan fitur ini.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                    Atau isi manual
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                     {hasNoWallets && (
                        <Alert variant="destructive">
                            <AlertTitle>Tidak Ada Dompet</AlertTitle>
                            <AlertDescription>
                                Anda harus membuat dompet terlebih dahulu sebelum bisa mencatat transaksi.
                                <Button asChild variant="link" className="p-0 h-auto ml-1">
                                    <Link href="/wallets">Buat Dompet</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    <FormField
                      control={form.control}
                      name="baseAmount"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Jumlah Pokok</FormLabel>
                          <FormControl>
                              <Input 
                              type="text" 
                              inputMode="numeric"
                              placeholder="Contoh: Rp 50.000" 
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
                            <Checkbox id="includeFee" checked={showFeeInput} onCheckedChange={(checked) => setShowFeeInput(!!checked)} />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="includeFee" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Sertakan Biaya Admin/Layanan
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Untuk biaya transfer, biaya platform, dll.
                                </p>
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
                                    inputMode="numeric"
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
                            <span className="text-sm font-bold">{formatCurrency(totalTransactionAmount)}</span>
                        </div>
                    </div>


                    <FormField
                      control={form.control}
                      name="walletId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bayar dari Dompet</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={hasNoWallets}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih sumber dana" />
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
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Kategori</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isDebtPaymentMode || expenseToEdit?.categoryId === savingsCategoryId}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih kategori" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                            {categories.map((category) => (
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
                    {showSavingGoals && (
                    <FormField
                        control={form.control}
                        name="savingGoalId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Alokasikan ke Tujuan (Wajib)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Pilih tujuan tabungan" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                                {savingGoals.map((goal) => (
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
                    )}
                    {showDebts && (
                    <FormField
                        control={form.control}
                        name="debtId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Alokasikan ke Utang</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ''} disabled={isDebtPaymentMode && !!expenseToEdit?.debtId}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Pilih utang yang dibayar" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper">
                                {debts.map((debt) => (
                                <SelectItem key={debt.id} value={debt.id}>
                                    {debt.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    )}
                     <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tanggal &amp; Waktu Transaksi</FormLabel>
                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "flex-1 w-full justify-start text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                            format(field.value, "PPP", { locale: idLocale })
                                            ) : (
                                            <span>Pilih tanggal</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start" >
                                        <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(day) => {
                                            if (!day) return;
                                            const currentTime = field.value || new Date();
                                            const newDate = new Date(day);
                                            newDate.setHours(currentTime.getHours());
                                            newDate.setMinutes(currentTime.getMinutes());
                                            field.onChange(newDate);
                                        }}
                                        disabled={(date) =>
                                            date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormControl>
                                    <Input
                                        type="time"
                                        className="w-[110px]"
                                        value={field.value ? format(field.value, "HH:mm") : ""}
                                        onChange={(e) => {
                                        const currentTime = field.value || new Date();
                                        const [hours, minutes] = e.target.value.split(":");
                                        const newDate = new Date(currentTime);
                                        newDate.setHours(Number(hours) || 0);
                                        newDate.setMinutes(Number(minutes) || 0);
                                        field.onChange(newDate);
                                        }}
                                    />
                                </FormControl>
                            </div>
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
                            <Textarea 
                            placeholder="Contoh: Makan siang dengan klien" 
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
              <Button type="submit" disabled={hasNoWallets}>{buttonText}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
