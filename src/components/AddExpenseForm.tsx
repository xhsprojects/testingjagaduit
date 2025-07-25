

"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon, Camera, Loader2, Gem, PlusCircle, Info, Mic, Trash2, GitCommitHorizontal, CircleHelp } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { cn, formatCurrency, parseSpokenAmount } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import type { Category, Expense, SavingGoal, Debt, Wallet, Income, SplitItem } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { scanReceipt } from '@/ai/flows/scan-receipt-flow'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Checkbox } from './ui/checkbox'
import { parseTransactionByVoice } from '@/ai/flows/parse-transaction-by-voice-flow'
import { ToastAction } from './ui/toast'
import { Switch } from './ui/switch'

const splitItemSchema = z.object({
  id: z.string(),
  categoryId: z.string().min(1, "Kategori harus dipilih."),
  amount: z.coerce.number().positive("Jumlah split harus positif."),
  notes: z.string().optional(),
});

const baseFormSchema = z.object({
  baseAmount: z.coerce.number({ required_error: "Jumlah harus diisi." }).positive("Jumlah harus angka positif."),
  adminFee: z.coerce.number().min(0).optional(),
  date: z.date(),
  notes: z.string().optional(),
  savingGoalId: z.string().optional(),
  debtId: z.string().optional(),
  walletId: z.string().min(1, "Silakan pilih sumber dana/dompet."),
  isSplit: z.boolean().optional(),
  splits: z.array(splitItemSchema).optional(),
  categoryId: z.string().optional(),
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
  const router = useRouter();
  const [isScanning, setIsScanning] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showFeeInput, setShowFeeInput] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  const savingsCategoryId = React.useMemo(() => categories.find(c => c.name === "Tabungan & Investasi")?.id, [categories]);
  const debtPaymentCategory = React.useMemo(() => categories.find(c => c.isDebtCategory), [categories]);
  const essentialCategoryIds = React.useMemo(() => new Set(categories.filter(c => c.isEssential).map(c => c.id)), [categories]);

  const formSchema = React.useMemo(() => {
    return baseFormSchema.superRefine((data, ctx) => {
        if (data.isSplit) {
            const totalTransactionAmount = data.baseAmount + (data.adminFee || 0);
            if (!data.splits || data.splits.length < 2) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Anda harus memiliki setidaknya dua rincian untuk split.",
                    path: ["splits"],
                });
            } else {
                const totalSplitAmount = data.splits.reduce((sum, s) => sum + s.amount, 0);
                if (Math.abs(totalSplitAmount - totalTransactionAmount) > 0.01) {
                     ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Total rincian (${formatCurrency(totalSplitAmount)}) tidak cocok dengan Total Transaksi (${formatCurrency(totalTransactionAmount)}).`,
                        path: ["splits"],
                    });
                }
            }
        } else {
            if (!data.categoryId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Silakan pilih kategori.",
                    path: ["categoryId"],
                });
            } else if (data.categoryId === debtPaymentCategory?.id && !data.debtId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Silakan pilih utang yang ingin dibayar.",
                    path: ["debtId"],
                });
            } else if (data.categoryId === savingsCategoryId && !data.savingGoalId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Silakan pilih tujuan tabungan untuk alokasi dana ini.",
                    path: ["savingGoalId"],
                });
            }
        }
    });
  }, [debtPaymentCategory, savingsCategoryId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseAmount: 0, adminFee: 0, date: new Date(), notes: "", savingGoalId: "", debtId: "", walletId: "", isSplit: false, splits: []
    },
  })
  
  const setupSpeechRecognition = React.useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("Speech recognition not supported in this browser.");
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onerror = (event: any) => {
      let errorMessage = "Terjadi kesalahan saat pengenalan suara.";
      if (event.error === 'no-speech') errorMessage = "Tidak ada suara terdeteksi. Silakan coba lagi.";
      else if (event.error === 'audio-capture') errorMessage = "Mikrofon tidak ditemukan atau tidak berfungsi.";
      else if (event.error === 'not-allowed') errorMessage = "Izin akses mikrofon ditolak.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      console.error("Speech recognition error:", event.error);
    };
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      toast({ title: "Teks Dikenali", description: `Anda mengucapkan: "${transcript}".` });

      if (isPremium) {
        const categoriesJSON = JSON.stringify(categories.map(({ id, name }) => ({ id, name })));
        const walletsJSON = JSON.stringify(wallets.map(({ id, name }) => ({ id, name })));
        const result = await parseTransactionByVoice({ query: transcript, categoriesJSON, walletsJSON });

        if ('error' in result) {
          toast({ title: "Gagal Memproses", description: result.error, variant: 'destructive' });
        } else if (result.isIncome) {
          toast({ title: "Pemasukan Terdeteksi", description: "Silakan gunakan form tambah pemasukan.", variant: "destructive" });
        } else {
          if (result.amount) form.setValue('baseAmount', result.amount, { shouldValidate: true, shouldTouch: true });
          if (result.notes) form.setValue('notes', result.notes, { shouldValidate: true, shouldTouch: true });
          if (result.suggestedCategoryId) form.setValue('categoryId', result.suggestedCategoryId, { shouldValidate: true, shouldTouch: true });
          if (result.suggestedWalletId) form.setValue('walletId', result.suggestedWalletId, { shouldValidate: true, shouldTouch: true });
          toast({ title: "Sukses! (Premium)", description: "Form telah diisi otomatis." });
        }
      } else {
        const { amount, description } = parseSpokenAmount(transcript);
        if (amount > 0) form.setValue('baseAmount', amount, { shouldValidate: true, shouldTouch: true });
        form.setValue('notes', description, { shouldValidate: true, shouldTouch: true });
        toast({
          title: "Tips: Upgrade untuk AI Cerdas!",
          description: "AI bisa otomatis menebak kategori & dompet.",
          action: (<ToastAction altText="Upgrade" onClick={() => router.push('/premium')}>Upgrade</ToastAction>),
        });
      }
    };

    return recognition;
  }, [isPremium, categories, wallets, form, toast, router]);

  React.useEffect(() => {
    recognitionRef.current = setupSpeechRecognition();
  }, [setupSpeechRecognition]);
  
  const handleVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    } else if (isListening) {
      recognitionRef.current.stop();
    } else {
       toast({
        title: "Fitur Tidak Tersedia",
        description: "Pengenalan suara tidak didukung di browser ini.",
        variant: "destructive",
      });
    }
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "splits",
  });
  
  const watchCategoryId = form.watch("categoryId");
  const watchIsSplit = form.watch("isSplit");
  const watchedSplits = form.watch("splits");
  const showSavingGoals = !watchIsSplit && watchCategoryId === savingsCategoryId;
  const showDebts = !watchIsSplit && watchCategoryId === debtPaymentCategory?.id;
  
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
          date: new Date(expenseToEdit.date),
          notes: expenseToEdit.notes,
          walletId: expenseToEdit.walletId,
          isSplit: expenseToEdit.isSplit || false,
          splits: expenseToEdit.splits || [],
          categoryId: expenseToEdit.categoryId,
          savingGoalId: expenseToEdit.savingGoalId,
          debtId: expenseToEdit.debtId,
        });
      } else {
        setShowFeeInput(false);
        form.reset({
          date: new Date(), baseAmount: 0, adminFee: 0, categoryId: "", notes: "", savingGoalId: "", debtId: "", walletId: "", isSplit: false, splits: []
        });
      }
    }
  }, [expenseToEdit, isOpen, form]);

  const handleSubmit = (data: FormValues) => {
    const totalAmount = data.baseAmount + (data.adminFee || 0);

    const expenseData: Omit<Expense, 'id'> & { id?: string } = {
        amount: totalAmount,
        baseAmount: data.baseAmount,
        adminFee: data.adminFee || 0,
        date: data.date,
        notes: data.notes || "",
        walletId: data.walletId,
        isSplit: data.isSplit || false,
        ...(expenseToEdit && { id: expenseToEdit.id })
    };

    if (data.isSplit && data.splits) {
        expenseData.splits = data.splits.map(s => ({
            ...s,
            id: s.id.startsWith('split-new-') ? `split-${Date.now()}-${Math.random()}` : s.id,
        }));
    } else {
        expenseData.categoryId = data.categoryId;
        if (data.categoryId === savingsCategoryId) {
            expenseData.savingGoalId = data.savingGoalId;
        }
        if (data.categoryId === debtPaymentCategory?.id) {
            expenseData.debtId = data.debtId;
        }
    }

    const finalExpenseData = {
        ...expenseData,
        id: expenseToEdit?.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    onSubmit(finalExpenseData as Expense);
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

  const isEditing = !!expenseToEdit;
  
  const formTitle = isDebtPaymentMode ? 'Catat Pembayaran Utang' : isEditing ? 'Ubah Transaksi' : 'Tambah Transaksi Baru';
  const formDescription = isDebtPaymentMode ? 'Lengkapi detail pembayaran utang di bawah ini.' : isEditing ? 'Ubah detail transaksi Anda di bawah ini.' : 'Pindai struk, gunakan suara, atau isi manual. Klik simpan jika sudah selesai.';
  const buttonText = isDebtPaymentMode ? 'Catat Pembayaran Utang' : isEditing ? 'Simpan Perubahan' : 'Simpan Transaksi';
  const hasNoWallets = wallets.length === 0;
  const totalTransactionAmount = (watchedBaseAmount || 0) + (showFeeInput ? (watchedAdminFee || 0) : 0);
  const totalSplitAmount = (watchedSplits || []).reduce((sum, s) => sum + s.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{formTitle}</DialogTitle>
          <DialogDescription>{formDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6">
                <div className="space-y-4 py-2">
                    <div className="relative">
                        <Button type="button" variant="outline" className="w-full h-14 text-base" onClick={() => fileInputRef.current?.click()} disabled={isScanning || !isPremium}>
                            {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}
                            Pindai atau Unggah Struk
                        </Button>
                        {!isPremium && (
                            <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                                <Gem className="h-3 w-3 mr-1"/> Premium
                            </Badge>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex-grow border-t"></div>
                        <span className="text-xs text-muted-foreground">ATAU</span>
                        <div className="flex-grow border-t"></div>
                    </div>
                    <div className="flex justify-between items-center">
                        <FormLabel>Isi Manual Jumlah</FormLabel>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10 relative" onClick={handleVoiceInput} disabled={!recognitionRef.current}>
                                        {isListening ? (<Loader2 className="h-4 w-4 animate-spin" />) : (<Mic className="h-4 w-4" />)}
                                        {isPremium && <Gem className="absolute h-2 w-2 -top-0.5 -right-0.5 text-yellow-500" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-semibold">Isi dengan Suara</p>
                                    {isPremium ? (
                                        <p className="text-xs">Anda menggunakan mode AI cerdas.</p>
                                    ) : (
                                        <p className="text-xs">Upgrade untuk tebak kategori & dompet otomatis.</p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <FormField
                      control={form.control}
                      name="baseAmount"
                      render={({ field }) => (
                        <FormItem>
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
                                <label htmlFor="includeFee" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Sertakan Biaya Admin</label>
                                <p className="text-xs text-muted-foreground">Contoh: biaya transfer antar bank, biaya layanan.</p>
                            </div>
                        </div>
                        {showFeeInput && (
                            <FormField control={form.control} name="adminFee" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Jumlah Biaya Admin</FormLabel>
                                    <FormControl>
                                        <Input type="text" inputMode="numeric" placeholder="Contoh: Rp 2.500" value={field.value && field.value > 0 ? formatCurrency(field.value) : ""}
                                            onChange={(e) => {
                                                const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                                field.onChange(numericValue);
                                            }}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        )}
                         <div className="flex justify-between items-center bg-secondary p-2 rounded-md">
                            <span className="text-sm font-semibold">Total Transaksi</span>
                            <span className="text-sm font-bold">{formatCurrency(totalTransactionAmount)}</span>
                        </div>
                    </div>
                    <FormField control={form.control} name="walletId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bayar dari Dompet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled={hasNoWallets}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Pilih sumber dana" /></SelectTrigger></FormControl>
                          <SelectContent position="popper">{wallets.map((wallet) => (<SelectItem key={wallet.id} value={wallet.id}>{wallet.name}</SelectItem>))}</SelectContent>
                        </Select>
                        {selectedWalletBalance !== null && (
                            <p className="text-xs text-muted-foreground text-right -mt-1 pr-1">
                                Saldo Saat Ini: {formatCurrency(selectedWalletBalance)}
                            </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Tanggal & Waktu</FormLabel>
                          <div className="flex items-center gap-2">
                              <Popover>
                                  <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("flex-1 w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start" ><Calendar mode="single" selected={field.value} onSelect={(day) => {if (!day) return; const currentTime = field.value || new Date(); const newDate = new Date(day); newDate.setHours(currentTime.getHours()); newDate.setMinutes(currentTime.getMinutes()); field.onChange(newDate);}} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus/></PopoverContent>
                              </Popover>
                              <FormControl><Input type="time" className="w-[110px]" value={field.value ? format(field.value, "HH:mm") : ""} onChange={(e) => {const currentTime = field.value || new Date(); const [hours, minutes] = e.target.value.split(":"); const newDate = new Date(currentTime); newDate.setHours(Number(hours) || 0); newDate.setMinutes(Number(minutes) || 0); field.onChange(newDate);}}/></FormControl>
                          </div>
                          <FormMessage />
                      </FormItem>
                    )}/>
                     <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catatan (Opsional)</FormLabel>
                        <FormControl><Textarea placeholder="Contoh: Makan siang dengan klien" {...field} value={field.value || ''}/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>

                    <div className="border-t pt-4 space-y-2">
                        <FormField control={form.control} name="isSplit" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-secondary/50">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2"><GitCommitHorizontal/>Split Transaksi</FormLabel>
                                    <FormDescription>Bagi satu transaksi ke beberapa kategori.</FormDescription>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isPremium}/>
                                    {!isPremium && <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs"><Gem className="h-3 w-3 mr-1"/> Premium</Badge>}
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}/>
                    </div>

                    {watchIsSplit ? (
                      <div className="space-y-3">
                          {fields.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-[1fr,auto] gap-2 items-end p-2 border rounded-md">
                               <div className="space-y-2">
                                  <FormField control={form.control} name={`splits.${index}.categoryId`} render={({ field }) => (
                                    <FormItem><FormLabel className="sr-only">Kategori</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl><SelectContent>{categories.filter(c => !essentialCategoryIds.has(c.id)).map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                  )}/>
                                  <FormField control={form.control} name={`splits.${index}.amount`} render={({ field }) => (
                                    <FormItem><FormLabel className="sr-only">Jumlah</FormLabel><FormControl><Input type="text" inputMode="numeric" placeholder="Jumlah" value={field.value > 0 ? formatCurrency(field.value) : ""} onChange={(e) => { const val = Number(e.target.value.replace(/[^0-9]/g, '')); field.onChange(val); }}/></FormControl><FormMessage/></FormItem>
                                  )}/>
                               </div>
                               <div><Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button></div>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({ id: `split-new-${Date.now()}`, categoryId: '', amount: 0, notes: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Tambah Rincian</Button>
                          <div className={cn("flex justify-between items-center bg-muted p-2 rounded-md text-sm", totalSplitAmount !== totalTransactionAmount && 'bg-destructive/20 text-destructive-foreground')}>
                              <span className="font-semibold flex items-center gap-1">{totalSplitAmount !== totalTransactionAmount && <CircleHelp className="h-4 w-4"/>}Total Rincian</span>
                              <span className="font-bold">{formatCurrency(totalSplitAmount)}</span>
                          </div>
                          <FormMessage>{form.formState.errors.splits?.message || form.formState.errors.splits?.root?.message}</FormMessage>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FormField control={form.control} name="categoryId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kategori</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isDebtPaymentMode && !!expenseToEdit?.debtId}><FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl><SelectContent position="popper">{categories.map((category) => (<SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>))}</SelectContent></Select>
                            <FormMessage />
                          </FormItem>
                        )}/>
                        <div className="flex justify-end -mt-2">
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                                <Link href="/budget">
                                    <PlusCircle className="mr-1 h-3 w-3" />
                                    Tambah Kategori Baru
                                </Link>
                            </Button>
                        </div>
                        {showSavingGoals && (<FormField control={form.control} name="savingGoalId" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Alokasikan ke Tujuan (Wajib)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih tujuan tabungan" /></SelectTrigger></FormControl><SelectContent position="popper">{savingGoals.map((goal) => (<SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>))}</SelectContent></Select>
                              <FormMessage />
                          </FormItem>
                        )}/>)}
                        {showDebts && (<FormField control={form.control} name="debtId" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Alokasikan ke Utang</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ''} disabled={isDebtPaymentMode && !!expenseToEdit?.debtId}><FormControl><SelectTrigger><SelectValue placeholder="Pilih utang yang dibayar" /></SelectTrigger></FormControl><SelectContent position="popper">{debts.map((debt) => (<SelectItem key={debt.id} value={debt.id}>{debt.name}</SelectItem>))}</SelectContent></Select>
                              <FormMessage />
                          </FormItem>
                        )}/>)}
                      </div>
                    )}
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
