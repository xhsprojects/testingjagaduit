
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, UserPlus, Percent, Trash2, Users, ReceiptText, Share2, Camera, Wand2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { scanReceipt } from '@/ai/flows/scan-receipt-flow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- Tipe Data ---
interface Person {
  id: string;
  name: string;
  amount: number;
}

type SplitMode = 'equal' | 'unequal';
type Stage = 'selection' | 'calculation';


// --- Komponen Utama ---
export default function SplitBillClientPage() {
    const { isPremium } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // --- State Management ---
    const [stage, setStage] = React.useState<Stage>('selection');
    const [isScanning, setIsScanning] = React.useState(false);
    
    // Calculation state
    const [totalBill, setTotalBill] = React.useState(0);
    const [people, setPeople] = React.useState<Person[]>([]);
    const [newPersonName, setNewPersonName] = React.useState('');
    const [tax, setTax] = React.useState(11); // default 11%
    const [service, setService] = React.useState(5); // default 5%
    const [splitMode, setSplitMode] = React.useState<SplitMode>('equal');

    // --- Handlers ---
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const base64Image = e.target?.result as string;
                const result = await scanReceipt({ receiptImage: base64Image });

                if (result && 'error' in result) {
                    toast({ title: "Gagal Memindai", description: result.error, variant: 'destructive' });
                } else if (result.totalAmount) {
                    setTotalBill(result.totalAmount);
                    toast({ title: "Struk Terbaca!", description: `Total tagihan terdeteksi: ${formatCurrency(result.totalAmount)}. Silakan tambahkan peserta.` });
                    setStage('calculation');
                } else {
                    toast({ title: "Tidak Ditemukan", description: "AI tidak dapat menemukan total tagihan. Coba masukkan manual.", variant: 'destructive' });
                }
            };
        } catch (err) {
            toast({ title: 'Error', description: 'Gagal memproses gambar.', variant: 'destructive' });
        } finally {
            setIsScanning(false);
        }
    };
    
    const handleStartManual = () => {
        setTotalBill(0);
        setStage('calculation');
    }

    const addPerson = () => {
        if (newPersonName.trim()) {
            setPeople(prev => [...prev, { id: `p-${Date.now()}`, name: newPersonName.trim(), amount: 0 }]);
            setNewPersonName('');
        }
    };

    const removePerson = (id: string) => {
        setPeople(prev => prev.filter(p => p.id !== id));
    };

    const handlePersonAmountChange = (id: string, newAmount: number) => {
        setPeople(prev => prev.map(p => p.id === id ? { ...p, amount: newAmount } : p));
    };

    // --- Kalkulasi ---
    const summary = React.useMemo(() => {
        const subTotal = splitMode === 'equal' ? totalBill : people.reduce((sum, p) => sum + p.amount, 0);
        const taxAmount = subTotal * (tax / 100);
        const serviceAmount = subTotal * (service / 100);
        const finalTotal = subTotal + taxAmount + serviceAmount;

        if (subTotal === 0 || people.length === 0) {
            return { perPerson: [], finalTotal: 0, remainingToSplit: totalBill };
        }
        
        const perPerson = people.map(p => {
            let finalAmount = 0;
            if (splitMode === 'equal') {
                finalAmount = finalTotal / people.length;
            } else { // unequal
                const personContributionRatio = p.amount / subTotal;
                finalAmount = p.amount + (taxAmount * personContributionRatio) + (serviceAmount * personContributionRatio);
            }
            return { ...p, finalAmount };
        });

        return {
            perPerson,
            finalTotal,
            remainingToSplit: totalBill - subTotal,
        };
        
    }, [totalBill, tax, service, people, splitMode]);

    const generateWhatsAppMessage = () => {
        let message = `*Rincian Tagihan*\n\n`;
        summary.perPerson.forEach(person => {
            message += `*${person.name}*: *${formatCurrency(person.finalAmount)}*\n`;
        });
        message += `\n*Total Keseluruhan: ${formatCurrency(summary.finalTotal)}*`;
        message += `\n\nTerima kasih! Dihitung dengan Jaga Duit.`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    if (stage === 'selection') {
        return (
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                 <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" /><h1 className="font-headline text-xl font-bold text-foreground">Bagi Tagihan</h1>
                    </div>
                </header>
                <main className="flex-1 p-4 sm:p-6 md:p-8 flex items-center justify-center">
                    <div className="w-full max-w-md space-y-6">
                        <h2 className="text-2xl font-bold text-center font-headline animate-in fade-in-0 slide-in-from-bottom-5 duration-500">Pilih Metode Perhitungan</h2>
                        <Card className="hover:border-primary transition-colors animate-in fade-in-0 slide-in-from-bottom-5 duration-500 delay-100">
                            <CardHeader className="flex-row items-center gap-4">
                                <Camera className="h-8 w-8 text-primary"/>
                                <div>
                                    <CardTitle>Pindai Struk Otomatis</CardTitle>
                                    <CardDescription>Gunakan AI untuk membaca total tagihan dari struk.</CardDescription>
                                </div>
                            </CardHeader>
                            <CardFooter>
                                <Button className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isScanning || !isPremium}>
                                    {isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Wand2 className="h-4 w-4 mr-2" />}
                                    Pindai Struk
                                </Button>
                                 {!isPremium && <Badge variant="destructive" className="ml-2">Premium</Badge>}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </CardFooter>
                        </Card>
                         <Card className="hover:border-primary transition-colors animate-in fade-in-0 slide-in-from-bottom-5 duration-500 delay-200">
                            <CardHeader className="flex-row items-center gap-4">
                                <ReceiptText className="h-8 w-8 text-primary"/>
                                <div>
                                <CardTitle>Masukkan Manual</CardTitle>
                                <CardDescription>Masukkan total tagihan dan bagi secara rata atau custom.</CardDescription>
                                </div>
                            </CardHeader>
                            <CardFooter>
                                <Button className="w-full" variant="outline" onClick={handleStartManual}>
                                    Mulai Manual
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }
    
    // stage === 'calculation'
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => setStage('selection')}><ArrowLeft className="h-5 w-5" /></Button>
                <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h1 className="font-headline text-xl font-bold text-foreground">Hitung & Bagi Tagihan</h1></div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="animate-in fade-in-0 duration-500">
                        <CardHeader>
                            <CardTitle>1. Total Tagihan (sebelum pajak & servis)</CardTitle>
                        </CardHeader>
                         <CardContent>
                            <Input 
                                type="text"
                                inputMode="numeric"
                                placeholder="Masukkan total tagihan"
                                value={totalBill > 0 ? formatCurrency(totalBill) : ""}
                                onChange={e => setTotalBill(Number(e.target.value.replace(/[^0-9]/g, '')))}
                                className="text-2xl h-14 font-bold"
                            />
                        </CardContent>
                    </Card>
                    <Card className="animate-in fade-in-0 duration-500 delay-100">
                        <CardHeader><CardTitle>2. Peserta Patungan</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input placeholder="Nama Orang" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()} />
                                <Button onClick={addPerson}><UserPlus className="h-4 w-4 mr-2"/>Tambah</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {people.map(p => (
                                    <Badge key={p.id} variant="secondary" className="pl-2 pr-1 text-base animate-in zoom-in-95 duration-300">
                                        {p.name}
                                        <button onClick={() => removePerson(p.id)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 text-destructive"><X className="h-3 w-3"/></button>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="animate-in fade-in-0 duration-500 delay-200">
                        <CardHeader><CardTitle>3. Cara Pembagian</CardTitle></CardHeader>
                         <CardContent>
                           <Tabs value={splitMode} onValueChange={(v) => setSplitMode(v as SplitMode)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="equal">Bagi Rata</TabsTrigger>
                                    <TabsTrigger value="unequal">Bagi Custom</TabsTrigger>
                                </TabsList>
                                <TabsContent value="equal" className="pt-4">
                                     <p className="text-muted-foreground text-sm">Total tagihan akan dibagi rata ke semua peserta yang ditambahkan.</p>
                                </TabsContent>
                                <TabsContent value="unequal" className="pt-4 space-y-2">
                                     {people.map(p => (
                                         <div key={p.id} className="flex items-center gap-4">
                                             <label className="w-24 truncate font-medium">{p.name}</label>
                                             <Input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="Jumlah tagihan"
                                                value={p.amount > 0 ? formatCurrency(p.amount) : ""}
                                                onChange={e => handlePersonAmountChange(p.id, Number(e.target.value.replace(/[^0-9]/g, '')))}
                                             />
                                         </div>
                                     ))}
                                     {people.length > 0 && summary.remainingToSplit !== 0 && (
                                        <div className={cn("text-right text-sm font-semibold", summary.remainingToSplit > 0 ? 'text-amber-600' : 'text-destructive')}>
                                            {summary.remainingToSplit > 0 ? `Sisa yang belum dibagi: ${formatCurrency(summary.remainingToSplit)}` : `Kelebihan alokasi: ${formatCurrency(Math.abs(summary.remainingToSplit))}`}
                                        </div>
                                     )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <Card className="animate-in fade-in-0 duration-500 delay-300">
                        <CardHeader><CardTitle>Biaya Tambahan</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <label className="flex-grow">Pajak</label>
                                <Input className="w-20" type="number" value={tax} onChange={e => setTax(parseFloat(e.target.value) || 0)} />
                                <Percent className="h-4 w-4"/>
                            </div>
                             <div className="flex items-center gap-2">
                                <label className="flex-grow">Servis</label>
                                <Input className="w-20" type="number" value={service} onChange={e => setService(parseFloat(e.target.value) || 0)} />
                                <Percent className="h-4 w-4"/>
                            </div>
                        </CardContent>
                    </Card>

                     <Card className="animate-in fade-in-0 duration-500 delay-400">
                        <CardHeader><CardTitle>Hasil Akhir</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                           {summary.perPerson.map(s => (
                               <div key={s.id} className="flex justify-between items-center p-3 rounded-md bg-secondary animate-in fade-in-0 duration-300">
                                   <span className="font-semibold">{s.name}</span>
                                   <span className="font-bold text-primary">{formatCurrency(s.finalAmount)}</span>
                               </div>
                           ))}
                           <Separator />
                            <div className="flex justify-between items-center p-2 font-bold text-lg">
                               <span>TOTAL</span>
                               <span>{formatCurrency(summary.finalTotal)}</span>
                           </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                            <Button className="w-full bg-green-500 hover:bg-green-600" onClick={generateWhatsAppMessage} disabled={summary.perPerson.length === 0}>
                                <Share2 className="h-4 w-4 mr-2"/>Bagikan ke WhatsApp
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}
