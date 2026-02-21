"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, UserPlus, Trash2, Users, Share2, ReceiptText, ScanLine, Edit, Loader2, Info, X, Copy, Plus, Users2 } from 'lucide-react';
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

interface Person {
  id: string;
  name: string;
}
interface BillItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    sharedBy: Set<string>;
}
type ChargeType = 'percent' | 'amount';
type SplitBillStage = 'select_method' | 'calculate';
type SplitMode = 'equal' | 'custom';

export default function SplitBillClientPage() {
    const router = useRouter();
    const { isPremium } = useAuth();
    const { toast } = useToast();

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
    };

    const handleAddItem = () => {
        if (newItem.name.trim() && newItem.price > 0) {
            setItems(prev => [...prev, {
                id: `i-${Date.now()}`,
                name: newItem.name,
                quantity: newItem.quantity || 1,
                price: newItem.price,
                sharedBy: new Set(people.map(p => p.id))
            }]);
            setNewItem({ name: '', quantity: 1, price: 0 });
        }
    };
    
    const removeItem = (id: string) => setItems(prev => prev.filter(item => item.id !== id));

    const toggleItemShare = (itemId: string, personId: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === itemId) {
                const newSharedBy = new Set(item.sharedBy);
                if (newSharedBy.has(personId)) newSharedBy.delete(personId);
                else newSharedBy.add(personId);
                return { ...item, sharedBy: newSharedBy };
            }
            return item;
        }));
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsScanning(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async (e) => {
        const result = await scanReceipt({ receiptImage: e.target?.result as string });
        if ('error' in result) {
          toast({ title: "Gagal", description: result.error, variant: "destructive" });
        } else {
          setItems((result.items || []).map((item, index) => ({
              id: `i-s-${Date.now()}-${index}`,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              sharedBy: new Set(people.map(p => p.id))
          })));
          if(result.notes) setBillName(result.notes);
          setStage('calculate');
        }
        setIsScanning(false);
      };
    };

    const summary = React.useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const discAmt = discountType === 'percent' ? subtotal * (discount / 100) : Math.min(subtotal, discount);
        const afterDisc = subtotal - discAmt;
        const taxAmt = taxType === 'percent' ? afterDisc * (tax / 100) : tax;
        const servAmt = serviceType === 'percent' ? afterDisc * (service / 100) : service;
        const finalTotal = afterDisc + taxAmt + servAmt;

        let personTotals: Record<string, number> = {};
        people.forEach(p => personTotals[p.id] = 0);
        
        if (splitMode === 'equal') {
            items.forEach(item => {
                if (item.sharedBy.size > 0) {
                    const costPer = (item.quantity * item.price) / item.sharedBy.size;
                    item.sharedBy.forEach(pid => personTotals[pid] += costPer);
                }
            });
        } else {
            people.forEach(p => personTotals[p.id] = customAmounts[p.id] || 0);
        }

        const breakdown = people.map(p => {
            const pSub = personTotals[p.id];
            if (splitMode === 'equal') {
                const ratio = subtotal > 0 ? pSub / subtotal : 0;
                return { ...p, finalAmount: pSub - (discAmt * ratio) + (taxAmt * ratio) + (servAmt * ratio) };
            }
            return { ...p, finalAmount: pSub };
        });

        return { subtotal, discAmt, taxAmt, servAmt, finalTotal, breakdown };
    }, [items, people, tax, service, discount, discountType, taxType, serviceType, splitMode, customAmounts]);

    const handleCopy = () => {
        let msg = `*Rincian Tagihan: ${billName || 'Patungan'}*\n\n`;
        msg += `Total: ${formatCurrency(summary.finalTotal)}\n\n`;
        summary.breakdown.forEach(p => msg += `▪️ ${p.name}: ${formatCurrency(p.finalAmount)}\n`);
        msg += `\n_Dihitung dengan Jaga Duit_`;
        navigator.clipboard.writeText(msg).then(() => toast({ title: "Tersalin!" }));
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => stage === 'calculate' ? setStage('select_method') : router.back()} className="rounded-full -ml-2 text-slate-400">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Bagi Tagihan</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Hitung Patungan Cepat</p>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                    <Users2 className="h-5 w-5" />
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
                {stage === 'select_method' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto py-10">
                        <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-none shadow-sm hover:shadow-xl transition-all cursor-pointer group text-center" onClick={() => isPremium ? fileInputRef.current?.click() : toast({title: "Premium", description: "Fitur ini khusus pengguna premium.", variant: "destructive"})}>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6 group-hover:scale-110 transition-transform">
                                {isScanning ? <Loader2 className="h-10 w-10 animate-spin" /> : <ScanLine className="h-10 w-10" />}
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Pindai Struk</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter leading-relaxed">Ekstrak otomatis dengan AI</p>
                            {!isPremium && <Badge variant="destructive" className="mt-4 font-black uppercase text-[8px] tracking-widest">Premium Only</Badge>}
                        </Card>

                        <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-none shadow-sm hover:shadow-xl transition-all cursor-pointer group text-center" onClick={() => setStage('calculate')}>
                            <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-6 group-hover:text-primary transition-colors">
                                <Edit className="h-10 w-10" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Isi Manual</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter leading-relaxed">Input rincian satu-persatu</p>
                        </Card>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* People */}
                            <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border-slate-100 dark:border-slate-800">
                                <CardHeader className="p-0 mb-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PESERTA PATUNGAN</h3>
                                </CardHeader>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input className="rounded-2xl h-12 bg-slate-50 dark:bg-slate-800 border-none" placeholder="Ketik nama..." value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()} />
                                        <Button className="rounded-2xl h-12 px-6 bg-primary font-black uppercase text-[10px] tracking-widest" onClick={addPerson}><Plus className="h-4 w-4 mr-2"/>Tambah</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {people.map(p => (
                                            <Badge key={p.id} variant="secondary" className="pl-3 pr-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none font-bold text-xs">
                                                {p.name}
                                                <button onClick={() => removePerson(p.id)} className="ml-2 rounded-lg p-1 hover:bg-rose-100 text-rose-500"><X className="h-3 w-3"/></button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            {/* Items */}
                            <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border-slate-100 dark:border-slate-800">
                                <CardHeader className="p-0 mb-6"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">DAFTAR PESANAN</h3></CardHeader>
                                <div className="space-y-4">
                                    {items.map(item => (
                                        <div key={item.id} className="p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{item.name}</p>
                                                    <p className="text-[10px] font-bold text-primary uppercase mt-1">{item.quantity}x • {formatCurrency(item.price)}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-rose-500 rounded-xl" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4"/></Button>
                                            </div>
                                            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">DIBAGI UNTUK:</p>
                                                <div className="flex flex-wrap gap-3">
                                                    {people.map(person => (
                                                        <div key={person.id} className="flex items-center space-x-2">
                                                            <Checkbox id={`c-${item.id}-${person.id}`} checked={item.sharedBy.has(person.id)} onCheckedChange={() => toggleItemShare(item.id, person.id)} className="rounded-md" />
                                                            <label htmlFor={`c-${item.id}-${person.id}`} className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{person.name}</label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                                        <Input className="bg-transparent border-none font-bold placeholder:text-slate-300" placeholder="Nama Item" value={newItem.name} onChange={e => setNewItem(p => ({...p, name: e.target.value}))} />
                                        <div className="flex gap-3">
                                            <Input className="w-20 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-black text-center" placeholder="Qty" value={newItem.quantity} onChange={e => setNewItem(p => ({...p, quantity: Number(e.target.value.replace(/\D/g, ''))}))} />
                                            <Input className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-black" placeholder="Harga" value={newItem.price || ''} onChange={e => setNewItem(p => ({...p, price: Number(e.target.value.replace(/\D/g, ''))}))} />
                                        </div>
                                        <Button className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest" onClick={handleAddItem}>Tambah ke Daftar</Button>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <Card className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-900/20 border-none overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-6 opacity-10"><ReceiptText className="h-20 w-20"/></div>
                                <div className="relative z-10 space-y-6">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Total Tagihan</p>
                                        <p className="text-4xl font-black tracking-tighter text-primary">{formatCurrency(summary.finalTotal)}</p>
                                    </div>
                                    <div className="space-y-3 border-t border-white/10 pt-6">
                                        {summary.breakdown.map(p => (
                                            <div key={p.id} className="flex justify-between items-center group">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.name}</span>
                                                <span className="text-sm font-black tabular-nums">{formatCurrency(p.finalAmount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Button className="w-full h-14 rounded-3xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/30 mt-4" onClick={handleCopy}>
                                        <Copy className="h-4 w-4 mr-2"/>Salin Rincian
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}