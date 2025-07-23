

"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, UserPlus, Trash2, Users, Share2, Percent, ReceiptText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';


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
type DiscountType = 'percent' | 'amount';


// --- Komponen Utama ---
export default function SplitBillClientPage() {
    const router = useRouter();

    // --- State Management ---
    const [people, setPeople] = React.useState<Person[]>([]);
    const [newPersonName, setNewPersonName] = React.useState('');
    
    const [items, setItems] = React.useState<BillItem[]>([]);
    const [newItem, setNewItem] = React.useState({ name: '', quantity: 1, price: 0 });

    const [tax, setTax] = React.useState(11); // default 11%
    const [service, setService] = React.useState(5); // default 5%
    const [discount, setDiscount] = React.useState(0);
    const [discountType, setDiscountType] = React.useState<DiscountType>('percent');

    // --- Handlers ---
    const addPerson = () => {
        if (newPersonName.trim()) {
            setPeople(prev => [...prev, { id: `p-${Date.now()}`, name: newPersonName.trim() }]);
            setNewPersonName('');
        }
    };
    const removePerson = (id: string) => {
        setPeople(prev => prev.filter(p => p.id !== id));
        // Also remove them from any items they were sharing
        setItems(prevItems => prevItems.map(item => {
            const newSharedBy = new Set(item.sharedBy);
            newSharedBy.delete(id);
            return { ...item, sharedBy: newSharedBy };
        }));
    };

    const addItem = () => {
        if (newItem.name.trim() && newItem.price > 0 && newItem.quantity > 0) {
            setItems(prev => [...prev, {
                id: `i-${Date.now()}`,
                ...newItem,
                sharedBy: new Set(people.map(p => p.id)) // Default to all people
            }]);
            setNewItem({ name: '', quantity: 1, price: 0 });
        }
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

    // --- Kalkulasi ---
    const summary = React.useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        
        const discountAmount = discountType === 'percent' 
            ? subtotal * (discount / 100) 
            : Math.min(subtotal, discount); // Cannot discount more than subtotal

        const subtotalAfterDiscount = subtotal - discountAmount;
        const taxAmount = subtotalAfterDiscount * (tax / 100);
        const serviceAmount = subtotalAfterDiscount * (service / 100);
        const finalTotal = subtotalAfterDiscount + taxAmount + serviceAmount;

        let personTotals: Record<string, number> = {};
        people.forEach(p => personTotals[p.id] = 0);

        items.forEach(item => {
            if (item.sharedBy.size > 0) {
                const itemTotal = item.quantity * item.price;
                const costPerPerson = itemTotal / item.sharedBy.size;
                item.sharedBy.forEach(personId => {
                    personTotals[personId] += costPerPerson;
                });
            }
        });

        const perPersonBreakdown = people.map(person => {
            const personSubtotal = personTotals[person.id];
            const personSubtotalRatio = subtotal > 0 ? personSubtotal / subtotal : 0;
            
            const personDiscount = discountAmount * personSubtotalRatio;
            const personTax = taxAmount * personSubtotalRatio;
            const personService = serviceAmount * personSubtotalRatio;

            const finalAmount = personSubtotal - personDiscount + personTax + personService;

            return {
                ...person,
                finalAmount
            };
        });
        
        return { subtotal, discountAmount, taxAmount, serviceAmount, finalTotal, perPersonBreakdown };

    }, [items, people, tax, service, discount, discountType]);

    const generateWhatsAppMessage = () => {
        let message = `*Rincian Tagihan*\n\n`;
        summary.perPersonBreakdown.forEach(person => {
            message += `*${person.name}*: *${formatCurrency(person.finalAmount)}*\n`;
        });
        message += `\n*Total Keseluruhan: ${formatCurrency(summary.finalTotal)}*`;
        message += `\n\nTerima kasih! Dihitung dengan Jaga Duit.`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
                <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><h1 className="font-headline text-xl font-bold text-foreground">Bagi Tagihan</h1></div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>1. Peserta Patungan</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input placeholder="Nama Orang" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()} />
                                <Button onClick={addPerson}><UserPlus className="h-4 w-4 mr-2"/>Tambah</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {people.map(p => (
                                    <Badge key={p.id} variant="secondary" className="pl-2 pr-1 text-base">
                                        {p.name}
                                        <button onClick={() => removePerson(p.id)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 text-destructive"><Trash2 className="h-3 w-3"/></button>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>2. Daftar Item</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                           {items.map(item => (
                               <div key={item.id} className="p-3 border rounded-lg space-y-3">
                                   <div className="flex justify-between items-start">
                                       <div>
                                           <p className="font-semibold">{item.name}</p>
                                           <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}</p>
                                       </div>
                                       <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
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
                           <div className="flex flex-col md:flex-row gap-2">
                               <Input placeholder="Nama item" value={newItem.name} onChange={e => setNewItem(p => ({...p, name: e.target.value}))} />
                               <div className="flex gap-2">
                                <Input className="w-20" type="number" placeholder="Jml" value={newItem.quantity} onChange={e => setNewItem(p => ({...p, quantity: parseInt(e.target.value) || 1}))} />
                                <Input type="text" inputMode='numeric' placeholder="Harga" value={newItem.price > 0 ? formatCurrency(newItem.price) : ""} onChange={e => setNewItem(p => ({...p, price: Number(e.target.value.replace(/[^0-9]/g, ''))}))}/>
                               </div>
                           </div>
                           <Button onClick={addItem} className="w-full">Tambah Item</Button>
                        </CardContent>
                    </Card>

                </div>
                
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                     <Card>
                        <CardHeader><CardTitle>3. Biaya Tambahan & Diskon</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Label className="flex-grow">Diskon</Label>
                                <Input className="w-24" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
                                 <ToggleGroup type="single" variant="outline" value={discountType} onValueChange={(v: DiscountType) => v && setDiscountType(v)}>
                                    <ToggleGroupItem value="percent" aria-label="Diskon persen">%</ToggleGroupItem>
                                    <ToggleGroupItem value="amount" aria-label="Diskon nominal">Rp</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="flex-grow">Pajak</Label>
                                <Input className="w-20" type="number" value={tax} onChange={e => setTax(parseFloat(e.target.value) || 0)} />
                                <Percent className="h-4 w-4 text-muted-foreground"/>
                            </div>
                             <div className="flex items-center gap-2">
                                <Label className="flex-grow">Servis</Label>
                                <Input className="w-20" type="number" value={service} onChange={e => setService(parseFloat(e.target.value) || 0)} />
                                <Percent className="h-4 w-4 text-muted-foreground"/>
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ReceiptText />Rincian Akhir</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Diskon</span><span className="text-green-600">- {formatCurrency(summary.discountAmount)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Pajak ({tax}%)</span><span>+ {formatCurrency(summary.taxAmount)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Servis ({service}%)</span><span>+ {formatCurrency(summary.serviceAmount)}</span></div>
                           <Separator />
                            <div className="flex justify-between items-center font-bold text-lg">
                               <span>TOTAL</span>
                               <span>{formatCurrency(summary.finalTotal)}</span>
                           </div>
                           <Separator className="my-4"/>
                           <div className="space-y-2">
                                {summary.perPersonBreakdown.map(s => (
                                   <div key={s.id} className="flex justify-between items-center p-3 rounded-md bg-secondary">
                                       <span className="font-semibold">{s.name}</span>
                                       <span className="font-bold text-primary">{formatCurrency(s.finalAmount)}</span>
                                   </div>
                               ))}
                           </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                            <Button className="w-full bg-green-500 hover:bg-green-600" onClick={generateWhatsAppMessage} disabled={summary.perPersonBreakdown.length === 0}>
                                <Share2 className="h-4 w-4 mr-2"/>Bagikan ke WhatsApp
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}
