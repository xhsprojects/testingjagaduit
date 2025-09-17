

"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, UserPlus, Trash2, Users, Share2, Percent, ReceiptText, ScanLine, Edit, FileUp, Loader2, Info, X, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { scanReceipt } from '@/ai/flows/scan-receipt-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// --- Tipe Data ---
interface Person {
  id: string;
  name: string;
}
interface BillItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    sharedBy: Set<string>; // Set of person IDs
}
type ChargeType = 'percent' | 'amount';
type SplitBillStage = 'select_method' | 'calculate';
type SplitMode = 'equal' | 'custom';

// --- Komponen Utama ---
export default function SplitBillClientPage() {
    const router = useRouter();
    const { isPremium } = useAuth();
    const { toast } = useToast();

    // --- State Management ---
    const [stage, setStage] = React.useState<SplitBillStage>('select_method');
    const [billName, setBillName] = React.useState('');
    const [people, setPeople] = React.useState<Person[]>([]);
    const [newPersonName, setNewPersonName] = React.useState('');
    
    const [items, setItems] = React.useState<BillItem[]>([]);
    const [newItem, setNewItem] = React.useState({ name: '', quantity: 1, price: 0 });
    
    const [itemToEdit, setItemToEdit] = React.useState<BillItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);


    const [tax, setTax] = React.useState(0);
    const [service, setService] = React.useState(0);
    const [discount, setDiscount] = React.useState(0);
    
    const [taxType, setTaxType] = React.useState<ChargeType>('percent');
    const [serviceType, setServiceType] = React.useState<ChargeType>('percent');
    const [discountType, setDiscountType] = React.useState<ChargeType>('amount');

    const [splitMode, setSplitMode] = React.useState<SplitMode>('equal');
    const [customAmounts, setCustomAmounts] = React.useState<Record<string, number>>({});
    const [includeItemsInShare, setIncludeItemsInShare] = React.useState(false);

    const [isScanning, setIsScanning] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // --- Handlers ---
    const addPerson = () => {
        if (newPersonName.trim()) {
            const newPerson = { id: `p-${Date.now()}`, name: newPersonName.trim() };
            setPeople(prev => [...prev, newPerson]);
            setCustomAmounts(prev => ({...prev, [newPerson.id]: 0}));
            setNewPersonName('');
        }
    };
    const removePerson = (id: string) => {
        setPeople(prev => prev.filter(p => p.id !== id));
        setItems(prevItems => prevItems.map(item => {
            const newSharedBy = new Set(item.sharedBy);
            newSharedBy.delete(id);
            return { ...item, sharedBy: newSharedBy };
        }));
        setCustomAmounts(prev => {
            const newAmounts = {...prev};
            delete newAmounts[id];
            return newAmounts;
        });
    };

    const handleAddItem = () => {
        if (newItem.name.trim() && newItem.price > 0 && newItem.quantity > 0) {
            setItems(prev => [...prev, {
                id: `i-${Date.now()}`,
                ...newItem,
                sharedBy: new Set(people.map(p => p.id))
            }]);
            setNewItem({ name: '', quantity: 1, price: 0 });
        }
    };
    
    const handleOpenEditModal = (item: BillItem) => {
        setItemToEdit(item);
        setIsEditModalOpen(true);
    };
    
    const handleUpdateItem = (updatedItem: Omit<BillItem, 'id' | 'sharedBy'>) => {
        if (!itemToEdit) return;

        setItems(prev => prev.map(item => 
            item.id === itemToEdit.id 
            ? { ...item, ...updatedItem } 
            : item
        ));
        
        setItemToEdit(null);
        setIsEditModalOpen(false);
    };

    const removeItem = (id: string) => setItems(prev => prev.filter(item => item.id !== id));

    const toggleItemShare = (itemId: string, personId: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === itemId) {
                const newSharedBy = new Set(item.sharedBy);
                if (newSharedBy.has(personId)) {
                    newSharedBy.delete(personId);
                } else {
                    newSharedBy.add(personId);
                }
                return { ...item, sharedBy: newSharedBy };
            }
            return item;
        }));
    };
    
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
          if ('error' in result) {
            toast({ title: "Gagal Memindai", description: result.error, variant: "destructive" });
          } else {
            const scannedItems: BillItem[] = (result.items || []).map((item, index) => ({
                id: `i-scanned-${Date.now()}-${index}`,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                sharedBy: new Set(people.map(p => p.id))
            }));
            
            if(scannedItems.length > 0) {
              setItems(scannedItems);
              toast({
                duration: 8000,
                title: "Pindai Berhasil!",
                description: `${scannedItems.length} item berhasil diekstrak. Mohon periksa kembali nama dan harga sebelum melanjutkan.`,
              });
            } else {
               toast({
                title: "Tidak Ada Item Ditemukan",
                description: "AI tidak dapat menemukan rincian item. Struk mungkin hanya berisi total akhir. Silakan isi manual.",
                variant: "destructive"
              });
            }

            if(result.notes) setBillName(result.notes);

            const applyChargeHeuristic = (value: number | undefined, setValue: (v: number) => void, setType: (t: ChargeType) => void) => {
                if (typeof value === 'number' && value > 0) {
                    // if value has more than 2 digits, it's likely an amount.
                    if (String(value).length > 2) {
                        setType('amount');
                    } else {
                        setType('percent');
                    }
                    setValue(value);
                }
            };

            applyChargeHeuristic(result.tax, setTax, setTaxType);
            applyChargeHeuristic(result.serviceCharge, setService, setServiceType);
            applyChargeHeuristic(result.discountAmount, setDiscount, setDiscountType);
            
            setStage('calculate');
          }
          setIsScanning(false);
        };
      } catch (error) {
        console.error("Scan error:", error);
        toast({ title: "Error", description: "Terjadi kesalahan saat memproses gambar.", variant: "destructive" });
        setIsScanning(false);
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    
    const handleCustomAmountChange = (personId: string, value: number) => {
        setCustomAmounts(prev => ({...prev, [personId]: value}));
    };

    // --- Kalkulasi ---
    const summary = React.useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        
        const discountAmount = discountType === 'percent' ? subtotal * (discount / 100) : Math.min(subtotal, discount);
        const subtotalAfterDiscount = subtotal - discountAmount;
        
        const taxAmount = taxType === 'percent' ? subtotalAfterDiscount * (tax / 100) : tax;
        const serviceAmount = serviceType === 'percent' ? subtotalAfterDiscount * (service / 100) : service;

        const finalTotal = subtotalAfterDiscount + taxAmount + serviceAmount;

        let personTotals: Record<string, number> = {};
        people.forEach(p => personTotals[p.id] = 0);
        
        if (splitMode === 'equal') {
            items.forEach(item => {
                if (item.sharedBy.size > 0) {
                    const itemTotal = item.quantity * item.price;
                    const costPerPerson = itemTotal / item.sharedBy.size;
                    item.sharedBy.forEach(personId => {
                        personTotals[personId] += costPerPerson;
                    });
                }
            });
        } else { // Custom split
            people.forEach(person => {
                personTotals[person.id] = customAmounts[person.id] || 0;
            });
        }

        const perPersonBreakdown = people.map(person => {
            const personSubtotal = personTotals[person.id];
            
            if (splitMode === 'equal') {
                const personSubtotalRatio = subtotal > 0 ? personSubtotal / subtotal : 0;
                const personDiscount = discountAmount * personSubtotalRatio;
                const personTax = taxAmount * personSubtotalRatio;
                const personService = serviceAmount * personSubtotalRatio;
                return { ...person, finalAmount: personSubtotal - personDiscount + personTax + personService };
            } else {
                return { ...person, finalAmount: personSubtotal };
            }
        });

        const customTotal = Object.values(customAmounts).reduce((sum, amount) => sum + amount, 0);
        
        return { subtotal, discountAmount, taxAmount, serviceAmount, finalTotal, perPersonBreakdown, customTotal };

    }, [items, people, tax, service, discount, discountType, taxType, serviceType, splitMode, customAmounts]);

     const generateShareMessage = (forWhatsApp = false) => {
        const bulletPoint = forWhatsApp ? '-' : '▪️';
        const thanksIcon = forWhatsApp ? '😊' : '🙏';

        let message = `*Rincian Tagihan: ${billName || 'Patungan'}*\n`;

        if (includeItemsInShare && items.length > 0) {
            message += '\n*Daftar Item:*\n';
            items.forEach(item => {
                message += `${bulletPoint} ${item.name} (${item.quantity}x) = ${formatCurrency(item.quantity * item.price)}\n`;
            });
        }
        
        message += `\n*Pembagian Tagihan:*\n`;
        summary.perPersonBreakdown.forEach(person => {
            message += `${bulletPoint} *${person.name}*: *${formatCurrency(person.finalAmount)}*\n`;
        });
        message += `\n*TOTAL TAGIHAN: ${formatCurrency(summary.finalTotal)}*`;
        message += `\n\nTerima kasih! ${thanksIcon}\n_Dihitung dengan Jaga Duit_`;
        return message;
    };
    
    const generateWhatsAppMessage = () => {
        const message = generateShareMessage(true);
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };
    
    const handleCopyMessage = () => {
        const message = generateShareMessage(false);
        navigator.clipboard.writeText(message)
            .then(() => toast({ title: "Tersalin!", description: "Rincian tagihan telah disalin ke clipboard." }))
            .catch(() => toast({ title: "Gagal Menyalin", variant: "destructive" }));
    };
    
    const renderContent = () => {
        switch (stage) {
            case 'select_method':
                return (
                    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
                        <Card className="text-center p-6 hover:border-primary transition-colors cursor-pointer" onClick={() => isPremium ? fileInputRef.current?.click() : toast({title: "Fitur Premium", description: "Pindai struk hanya tersedia untuk pengguna premium.", variant: "destructive"})}>
                           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            <CardHeader>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                                    {isScanning ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <ScanLine className="h-8 w-8 text-primary" />}
                                </div>
                                <CardTitle className="font-headline text-xl">Pindai Struk (Otomatis)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Ambil foto atau unggah gambar struk. AI akan mengekstrak rincian item untuk Anda.</p>
                                {!isPremium && <Badge variant="destructive" className="mt-4">Fitur Premium</Badge>}
                            </CardContent>
                        </Card>
                         <Card className="text-center p-6 hover:border-primary transition-colors cursor-pointer" onClick={() => setStage('calculate')}>
                            <CardHeader>
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                                    <Edit className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle className="font-headline text-xl">Isi Manual</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Masukkan setiap item, harga, dan biaya tambahan secara manual untuk perhitungan yang presisi.</p>
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'calculate':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-500">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>1. Detail Tagihan</CardTitle></CardHeader>
                                <CardContent>
                                     <Input placeholder="Nama Tagihan (Contoh: Makan Malam Tim)" value={billName} onChange={e => setBillName(e.target.value)} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>2. Peserta Patungan</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input placeholder="Nama Orang" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()} />
                                        <Button onClick={addPerson}><UserPlus className="h-4 w-4 mr-2"/>Tambah</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {people.map(p => (
                                            <Badge key={p.id} variant="secondary" className="pl-2 pr-1 text-base">
                                                {p.name}
                                                <button onClick={() => removePerson(p.id)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 text-destructive"><X className="h-3 w-3"/></button>
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>3. Daftar Item</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                {items.length > 0 && (
                                     <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Periksa Kembali Hasil Pindai</AlertTitle>
                                        <AlertDescription>
                                            Pastikan nama item, jumlah, dan harga sudah sesuai dengan struk fisik Anda sebelum melanjutkan.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                {items.map(item => (
                                    <div key={item.id} className="p-3 border rounded-lg space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}</p>
                                            </div>
                                            <div className='flex items-center'>
                                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditModal(item)}><Edit className="h-4 w-4" /></Button>
                                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                            <div>
                                                <Label className="text-xs font-semibold text-muted-foreground">Dibagi untuk:</Label>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {people.map(person => (
                                                        <div key={person.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`cb-${item.id}-${person.id}`}
                                                                checked={item.sharedBy.has(person.id)}
                                                                onCheckedChange={() => toggleItemShare(item.id, person.id)}
                                                            />
                                                            <label htmlFor={`cb-${item.id}-${person.id}`} className="text-sm font-medium leading-none">
                                                                {person.name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                    </div>
                                ))}
                                <div className="p-3 border rounded-lg space-y-2 border-dashed">
                                    <div className="flex flex-col md:flex-row gap-2">
                                        <Input placeholder="Nama item" value={newItem.name} onChange={e => setNewItem(p => ({...p, name: e.target.value}))} />
                                        <div className="flex gap-2">
                                            <Input className="w-20" type="text" placeholder="Jml" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: Number(e.target.value.replace(/[^0-9]/g, '')) || '' }))}/>
                                            <Input type="text" inputMode='numeric' placeholder="Harga" value={newItem.price > 0 ? formatCurrency(newItem.price) : ""} onChange={e => setNewItem(p => ({...p, price: Number(e.target.value.replace(/[^0-9]/g, ''))}))}/>
                                        </div>
                                    </div>
                                    <Button onClick={handleAddItem} className="w-full">Tambah Item</Button>
                                </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                            <Card>
                                <CardHeader><CardTitle>4. Biaya Tambahan & Diskon</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Label className="flex-grow">Diskon</Label>
                                        <Input className="w-24" type="text" value={discount || ''} onChange={e => setDiscount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} />
                                        <ToggleGroup type="single" variant="outline" value={discountType} onValueChange={(v: ChargeType) => v && setDiscountType(v)}>
                                            <ToggleGroupItem value="percent" aria-label="Diskon persen">%</ToggleGroupItem>
                                            <ToggleGroupItem value="amount" aria-label="Diskon nominal">Rp</ToggleGroupItem>
                                        </ToggleGroup>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label className="flex-grow">Pajak</Label>
                                        <Input className="w-24" type="text" value={tax || ''} onChange={e => setTax(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} />
                                        <ToggleGroup type="single" variant="outline" value={taxType} onValueChange={(v: ChargeType) => v && setTaxType(v)}>
                                            <ToggleGroupItem value="percent" aria-label="Pajak persen">%</ToggleGroupItem>
                                            <ToggleGroupItem value="amount" aria-label="Pajak nominal">Rp</ToggleGroupItem>
                                        </ToggleGroup>
                                    </div>
                                     <div className="flex items-center gap-2">
                                        <Label className="flex-grow">Servis</Label>
                                        <Input className="w-24" type="text" value={service || ''} onChange={e => setService(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} />
                                        <ToggleGroup type="single" variant="outline" value={serviceType} onValueChange={(v: ChargeType) => v && setServiceType(v)}>
                                            <ToggleGroupItem value="percent" aria-label="Servis persen">%</ToggleGroupItem>
                                            <ToggleGroupItem value="amount" aria-label="Servis nominal">Rp</ToggleGroupItem>
                                        </ToggleGroup>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><ReceiptText />5. Rincian Akhir</CardTitle>
                                    <div className="pt-2">
                                        <ToggleGroup type="single" size="sm" className="w-full" value={splitMode} onValueChange={(v: SplitMode) => v && setSplitMode(v)}>
                                            <ToggleGroupItem value="equal" className="flex-1">Sama Rata</ToggleGroupItem>
                                            <ToggleGroupItem value="custom" className="flex-1">Custom</ToggleGroupItem>
                                        </ToggleGroup>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Diskon</span><span className="text-green-600">- {formatCurrency(summary.discountAmount)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Pajak ({taxType === 'percent' ? tax + "%" : "Rp"})</span><span>+ {formatCurrency(summary.taxAmount)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Servis ({serviceType === 'percent' ? service + "%" : "Rp"})</span><span>+ {formatCurrency(summary.serviceAmount)}</span></div>
                                <Separator />
                                <div className="flex justify-between items-center font-bold text-lg">
                                    <span>TOTAL</span>
                                    <span>{formatCurrency(summary.finalTotal)}</span>
                                </div>
                                <Separator className="my-4"/>
                                <div className="space-y-2">
                                    {people.map(person => (
                                        <div key={person.id} className="grid grid-cols-2 gap-2 items-center">
                                            <Label htmlFor={`custom-${person.id}`}>{person.name}</Label>
                                            {splitMode === 'equal' ? (
                                                <p className="font-bold text-primary text-right">{formatCurrency(summary.perPersonBreakdown.find(p=>p.id === person.id)?.finalAmount || 0)}</p>
                                            ) : (
                                                <Input 
                                                    id={`custom-${person.id}`}
                                                    type="text"
                                                    inputMode='numeric'
                                                    className="text-right"
                                                    value={customAmounts[person.id] > 0 ? formatCurrency(customAmounts[person.id]) : ""}
                                                    onChange={e => handleCustomAmountChange(person.id, Number(e.target.value.replace(/[^0-9]/g, '')))}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {splitMode === 'custom' && (
                                     <div className={cn("flex justify-between p-2 rounded-md mt-2", summary.customTotal !== summary.finalTotal ? 'bg-destructive/20' : 'bg-green-500/20')}>
                                        <span className="font-semibold text-xs">Sisa Belum Terbagi</span>
                                        <span className="font-bold text-xs">{formatCurrency(summary.finalTotal - summary.customTotal)}</span>
                                    </div>
                                )}
                                </CardContent>
                                <CardFooter className="flex-col gap-3">
                                     <div className="flex items-center space-x-2 self-start">
                                        <Checkbox 
                                            id="include-items" 
                                            checked={includeItemsInShare}
                                            onCheckedChange={(checked) => setIncludeItemsInShare(!!checked)}
                                        />
                                        <label htmlFor="include-items" className="text-sm font-medium leading-none">
                                            Sertakan Daftar Item
                                        </label>
                                    </div>
                                     <Button className="w-full bg-green-500 hover:bg-green-600" onClick={generateWhatsAppMessage} disabled={summary.perPersonBreakdown.length === 0}>
                                        <Share2 className="h-4 w-4 mr-2"/>Bagikan ke WhatsApp
                                    </Button>
                                    <Button className="w-full" variant="outline" onClick={handleCopyMessage} disabled={summary.perPersonBreakdown.length === 0}>
                                        <Copy className="h-4 w-4 mr-2"/>Salin Rincian
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => stage === 'calculate' ? setStage('select_method') : router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">Bagi Tagihan</h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                {renderContent()}
            </main>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ubah Item</DialogTitle>
                        <DialogDescription>
                            Perbarui detail item di bawah ini.
                        </DialogDescription>
                    </DialogHeader>
                    {itemToEdit && (
                         <EditItemForm
                            item={itemToEdit}
                            onSave={handleUpdateItem}
                            onCancel={() => setIsEditModalOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}


// --- Komponen Edit Item Form ---
interface EditItemFormProps {
    item: BillItem;
    onSave: (updatedItem: Omit<BillItem, 'id' | 'sharedBy'>) => void;
    onCancel: () => void;
}

function EditItemForm({ item, onSave, onCancel }: EditItemFormProps) {
    const [name, setName] = React.useState(item.name);
    const [quantity, setQuantity] = React.useState<number | string>(item.quantity);
    const [price, setPrice] = React.useState(item.price);

    const handleSave = () => {
        if (name.trim() && Number(price) > 0 && Number(quantity) > 0) {
            onSave({ name: name.trim(), quantity: Number(quantity), price: Number(price) });
        }
    };

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="edit-item-name">Nama Item</Label>
                <Input id="edit-item-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-item-quantity">Jumlah</Label>
                    <Input id="edit-item-quantity" type="text" value={quantity} onChange={(e) => setQuantity(e.target.value ? Number(e.target.value.replace(/[^0-9]/g, '')) : '')} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-item-price">Harga Satuan</Label>
                    <Input id="edit-item-price" type="text" inputMode="numeric" value={price > 0 ? formatCurrency(price) : ""} onChange={(e) => setPrice(Number(e.target.value.replace(/[^0-9]/g, '')))} />
                </div>
            </div>
             <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Batal</Button>
                <Button onClick={handleSave}>Simpan Perubahan</Button>
            </DialogFooter>
        </div>
    );
}


