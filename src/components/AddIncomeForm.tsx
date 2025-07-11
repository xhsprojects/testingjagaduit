

"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { id as idLocale } from "date-fns/locale"
import { Calendar as CalendarIcon, PlusCircle, Mic, Loader2, Gem } from "lucide-react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { cn, formatCurrency, parseSpokenAmount } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import type { Income, Wallet, Expense, Category } from '@/lib/types'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Checkbox } from './ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { parseTransactionByVoice } from '@/ai/flows/parse-transaction-by-voice-flow'
import { useAuth } from '@/context/AuthContext'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { ToastAction } from './ui/toast'

const formSchema = z.object({
  baseAmount: z.coerce.number({ required_error: "Jumlah harus diisi." }).positive("Jumlah harus angka positif."),
  adminFee: z.coerce.number().min(0).optional(),
  date: z.date({ required_error: "Tanggal harus diisi." }),
  notes: z.string().optional(),
  walletId: z.string().min(1, "Silakan pilih dompet tujuan."),
});

type FormValues = z.infer<typeof formSchema>

interface AddIncomeFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  wallets: Wallet[]
  categories?: Category[] // Add categories for the voice parser
  expenses?: Expense[]
  incomes?: Income[]
  onSubmit: (data: Income) => void
  incomeToEdit?: Income | null;
}

export function AddIncomeForm({ isOpen, onOpenChange, wallets, categories, expenses, incomes, onSubmit, incomeToEdit }: AddIncomeFormProps) {
  const { isPremium } = useAuth();
  const router = useRouter();
  const [showFeeInput, setShowFeeInput] = React.useState(false);
  const { toast } = useToast();
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null); // To hold the recognition instance

  React.useEffect(() => {
    // Check for API availability on component mount
    if (typeof window !== 'undefined') {
        const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            recognitionRef.current = new SpeechRecognitionAPI();
        }
    }
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseAmount: 0,
      adminFee: 0,
      date: new Date(),
      notes: "",
      walletId: "",
    },
  })

  const watchedWalletId = form.watch('walletId');
  const watchedBaseAmount = form.watch('baseAmount');
  const watchedAdminFee = form.watch('adminFee');

  const selectedWalletBalance = React.useMemo(() => {
    if (!watchedWalletId || !wallets || !expenses || !incomes) return null;
    
    const wallet = wallets.find(w => w.id === watchedWalletId);
    if (!wallet) return null;

    const totalIncome = (incomes || []).filter(i => i.walletId === watchedWalletId).reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = (expenses || []).filter(e => e.walletId === watchedWalletId).reduce((sum, e) => sum + e.amount, 0);
    return wallet.initialBalance + totalIncome - totalExpense;
  }, [watchedWalletId, wallets, incomes, expenses]);


  React.useEffect(() => {
    if (isOpen) {
      if (incomeToEdit) {
        setShowFeeInput(!!incomeToEdit.adminFee && incomeToEdit.adminFee > 0);
        form.reset({
          baseAmount: incomeToEdit.baseAmount ?? incomeToEdit.amount,
          adminFee: incomeToEdit.adminFee || 0,
          date: new Date(incomeToEdit.date),
          notes: incomeToEdit.notes,
          walletId: incomeToEdit.walletId,
        });
      } else {
        setShowFeeInput(false);
        form.reset({
          baseAmount: 0,
          adminFee: 0,
          date: new Date(),
          notes: "",
          walletId: "",
        });
      }
    }
  }, [isOpen, incomeToEdit, form]);

  const handleSubmit = (data: FormValues) => {
    const totalAmount = data.baseAmount - (data.adminFee || 0);
    const incomeData: Income = {
      id: incomeToEdit?.id || `inc-${Date.now()}`,
      amount: totalAmount,
      baseAmount: data.baseAmount,
      adminFee: data.adminFee,
      date: data.date,
      notes: data.notes,
      walletId: data.walletId,
    };
    onSubmit(incomeData);
  }
  
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
        toast({
            title: "Fitur Tidak Tersedia",
            description: "Pengenalan suara tidak didukung di browser Anda.",
            variant: "destructive",
        });
        return;
    }
    const recognition = recognitionRef.current;
    recognition.lang = 'id-ID';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        setIsListening(true);
    };

    recognition.onerror = (event: any) => {
        let errorMessage = `Terjadi kesalahan: ${event.error}`;
        if (event.error === 'audio-capture') {
            errorMessage = "Gagal merekam audio. Pastikan microphone Anda berfungsi dan diizinkan.";
        } else if (event.error === 'not-allowed') {
            errorMessage = "Akses ke microphone ditolak. Izinkan di pengaturan browser Anda.";
        } else if (event.error === 'no-speech') {
            errorMessage = "Tidak ada suara terdeteksi. Silakan coba lagi.";
        }
        console.error("Speech recognition error:", event.error, event.message);
        toast({
            title: "Error Pengenalan Suara",
            description: errorMessage,
            variant: "destructive",
        });
        setIsListening(false);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      toast({
          title: "Teks Dikenali",
          description: `Anda mengucapkan: "${transcript}".`,
      });
      
      if (isPremium) {
        // --- PREMIUM AI LOGIC ---
        const categoriesJSON = JSON.stringify((categories || []).map(({id, name}) => ({id, name})));
        const walletsJSON = JSON.stringify(wallets.map(({id, name}) => ({id, name})));
        
        const result = await parseTransactionByVoice({
            query: transcript,
            categoriesJSON,
            walletsJSON,
        });

        if ('error' in result) {
            toast({ title: "Gagal Memproses", description: result.error, variant: 'destructive' });
        } else if (!result.isIncome) {
            toast({ title: "Pengeluaran Terdeteksi", description: "Silakan gunakan form tambah pengeluaran.", variant: "destructive" });
        } else {
            if (result.amount) form.setValue('baseAmount', result.amount, { shouldValidate: true, shouldTouch: true });
            if (result.notes) form.setValue('notes', result.notes, { shouldValidate: true, shouldTouch: true });
            if (result.suggestedWalletId) form.setValue('walletId', result.suggestedWalletId, { shouldValidate: true, shouldTouch: true });
            toast({ title: "Sukses! (Premium)", description: "Form telah diisi otomatis." });
        }
      } else {
        // --- FREE BASIC LOGIC ---
        const { amount, description } = parseSpokenAmount(transcript);
        if (amount > 0) form.setValue('baseAmount', amount, { shouldValidate: true, shouldTouch: true });
        form.setValue('notes', description, { shouldValidate: true, shouldTouch: true });
        
        toast({ 
            title: "Tips: Upgrade untuk AI Cerdas!", 
            description: "AI bisa otomatis menebak dompet tujuan.",
            action: (<ToastAction altText="Upgrade" onClick={() => router.push('/premium')}>Upgrade</ToastAction>),
        });
      }
    };

    recognition.start();
  };


  const isEditing = !!incomeToEdit;
  const hasNoWallets = wallets.length === 0;
  const totalTransactionAmount = (watchedBaseAmount || 0) - (showFeeInput ? (watchedAdminFee || 0) : 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className='font-headline'>{isEditing ? 'Ubah Pemasukan' : 'Tambah Pemasukan'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Ubah detail pemasukan Anda.' : 'Catat pemasukan atau dana tambahan yang Anda terima. Ini akan ditambahkan ke total anggaran Anda.'}
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
                                Anda harus membuat dompet terlebih dahulu sebelum bisa mencatat transaksi.
                                <Button asChild variant="link" className="p-0 h-auto ml-1">
                                    <Link href="/wallets">Buat Dompet</Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="flex justify-between items-center">
                        <FormLabel>Jumlah Pemasukan</FormLabel>
                        {recognitionRef.current && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10 relative"
                                            onClick={handleVoiceInput}
                                            disabled={isListening}
                                        >
                                            {isListening ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Mic className="h-4 w-4" />
                                            )}
                                            {isPremium && <Gem className="absolute h-2 w-2 -top-0.5 -right-0.5 text-yellow-500" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-semibold">Isi dengan Suara</p>
                                        {isPremium ? (
                                            <p className="text-xs">Anda menggunakan mode AI cerdas.</p>
                                        ) : (
                                            <p className="text-xs">Upgrade ke Premium untuk tebak dompet otomatis.</p>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
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
                     <div className="space-y-2">
                        <div className="items-top flex space-x-2">
                            <Checkbox id="includeFeeIncome" checked={showFeeInput} onCheckedChange={(checked) => setShowFeeInput(!!checked)} />
                            <div className="grid gap-1.5 leading-none">
                                <label htmlFor="includeFeeIncome" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Sertakan Potongan/Biaya
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Contoh: biaya transfer dari platform pihak ketiga.
                                </p>
                            </div>
                        </div>
                        {showFeeInput && (
                            <FormField
                            control={form.control}
                            name="adminFee"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="sr-only">Jumlah Potongan</FormLabel>
                                <FormControl>
                                    <Input 
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Contoh: Rp 6.500" 
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
                            <span className="text-sm font-semibold">Total Pemasukan Diterima</span>
                            <span className="text-sm font-bold">{formatCurrency(totalTransactionAmount)}</span>
                        </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="walletId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Masukkan ke Dompet</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={hasNoWallets}>
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
                      <p className="text-xs text-muted-foreground text-right -mt-1 pr-1">
                          Saldo Saat Ini: {formatCurrency(selectedWalletBalance)}
                      </p>
                    )}
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tanggal &amp; Waktu Pemasukan</FormLabel>
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
                        <FormLabel>Sumber/Catatan (Opsional)</FormLabel>
                        <FormControl>
                            <Textarea 
                            placeholder="Contoh: Bonus kerja, hasil penjualan, dll." 
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
              <Button type="submit" disabled={hasNoWallets}>{isEditing ? 'Simpan Perubahan' : 'Simpan Pemasukan'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
