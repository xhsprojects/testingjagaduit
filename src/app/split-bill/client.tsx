
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, UserPlus, FilePlus, Percent, Copy, Trash2, Users, ReceiptText, Share2, Info, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- Tipe Data ---
interface Person {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  price: number;
  participants: Set<string>; // Set of person IDs
}

interface Bill {
  title: string;
  people: Person[];
  items: Item[];
  tax: number; // Percentage
  service: number; // Percentage
}

interface BillSummary {
  personId: string;
  personName: string;
  total: number;
  items: { name: string; price: number }[];
}


// --- Komponen Utama ---
export default function SplitBillClientPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // --- State Management ---
    const [bill, setBill] = React.useState<Bill>({
        title: '',
        people: [],
        items: [],
        tax: 11,
        service: 5
    });
    const [newPersonName, setNewPersonName] = React.useState('');
    const [newItem, setNewItem] = React.useState({ name: '', price: '' });

    // --- Handlers ---
    const addPerson = () => {
        if (newPersonName.trim()) {
            setBill(prev => ({ ...prev, people: [...prev.people, { id: `p-${Date.now()}`, name: newPersonName.trim() }] }));
            setNewPersonName('');
        }
    };

    const removePerson = (id: string) => {
        setBill(prev => ({
            ...prev,
            people: prev.people.filter(p => p.id !== id),
            items: prev.items.map(item => {
                const newParticipants = new Set(item.participants);
                newParticipants.delete(id);
                return { ...item, participants: newParticipants };
            })
        }));
    };

    const addItem = () => {
        if (newItem.name.trim() && parseFloat(newItem.price) > 0) {
            setBill(prev => ({
                ...prev,
                items: [...prev.items, { id: `i-${Date.now()}`, name: newItem.name.trim(), price: parseFloat(newItem.price), participants: new Set() }]
            }));
            setNewItem({ name: '', price: '' });
        }
    };

    const removeItem = (id: string) => {
        setBill(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
    };


    const toggleParticipant = (itemId: string, personId: string) => {
        setBill(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.id === itemId) {
                    const newParticipants = new Set(item.participants);
                    if (newParticipants.has(personId)) {
                        newParticipants.delete(personId);
                    } else {
                        newParticipants.add(personId);
                    }
                    return { ...item, participants: newParticipants };
                }
                return item;
            })
        }));
    };
    
    // --- Kalkulasi ---
    const summary = React.useMemo((): BillSummary[] => {
        const subtotalPerPerson: Map<string, number> = new Map(bill.people.map(p => [p.id, 0]));
        const itemsPerPerson: Map<string, {name: string, price: number}[]> = new Map(bill.people.map(p => [p.id, []]));

        bill.items.forEach(item => {
            if (item.participants.size > 0) {
                const pricePerParticipant = item.price / item.participants.size;
                item.participants.forEach(personId => {
                    subtotalPerPerson.set(personId, (subtotalPerPerson.get(personId) || 0) + pricePerParticipant);
                    itemsPerPerson.get(personId)?.push({ name: item.name, price: pricePerParticipant });
                });
            }
        });

        const totalSubtotal = Array.from(subtotalPerPerson.values()).reduce((sum, val) => sum + val, 0);
        
        if (totalSubtotal === 0) {
             return bill.people.map(person => ({
                personId: person.id,
                personName: person.name,
                total: 0,
                items: []
            }));
        }

        return bill.people.map(person => {
            const personSubtotal = subtotalPerPerson.get(person.id) || 0;
            const proportion = personSubtotal / totalSubtotal;
            const taxAmount = (totalSubtotal * (bill.tax / 100)) * proportion;
            const serviceAmount = (totalSubtotal * (bill.service / 100)) * proportion;
            const total = personSubtotal + taxAmount + serviceAmount;

            return {
                personId: person.id,
                personName: person.name,
                total,
                items: itemsPerPerson.get(person.id) || []
            };
        });
    }, [bill]);

    const generateWhatsAppMessage = () => {
        let message = `*${bill.title || 'Rincian Tagihan'}*\n\n`;
        const totalBill = summary.reduce((sum, s) => sum + s.total, 0);

        summary.forEach(person => {
            message += `*${person.personName}*: *${formatCurrency(person.total)}*\n`;
        });
        
        message += `\n*Total Keseluruhan: ${formatCurrency(totalBill)}*`;
        message += `\n\nTerima kasih! Dihitung dengan Jaga Duit.`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    const copySummaryToClipboard = () => {
        let text = `${bill.title || 'Rincian Tagihan'}\n\n`;
        const totalBill = summary.reduce((sum, s) => sum + s.total, 0);

        summary.forEach(person => {
            text += `${person.personName}: ${formatCurrency(person.total)}\n`;
        });
        
        text += `\nTotal Keseluruhan: ${formatCurrency(totalBill)}`;
        
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: 'Tersalin!', description: 'Rincian tagihan telah disalin ke clipboard.' });
        }, (err) => {
            toast({ title: 'Gagal Menyalin', description: 'Gagal menyalin teks.', variant: 'destructive' });
        });
    };

    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Bagi Tagihan (Split Bill)
                    </h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Kolom Input */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>1. Info & Peserta</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <Input placeholder="Nama Tagihan (cth: Makan Malam Ultah)" value={bill.title} onChange={e => setBill(b => ({...b, title: e.target.value}))} />
                            <div className="flex gap-2">
                                <Input placeholder="Nama Orang" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()} />
                                <Button onClick={addPerson}><UserPlus className="h-4 w-4 mr-2"/>Tambah</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {bill.people.map(p => (
                                    <Badge key={p.id} variant="secondary" className="pl-2 pr-1 text-base">
                                        {p.name}
                                        <button onClick={() => removePerson(p.id)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 text-destructive"><X className="h-3 w-3"/></button>
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>2. Daftar Item</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex gap-2">
                                <Input placeholder="Nama Item" value={newItem.name} onChange={e => setNewItem(i => ({...i, name: e.target.value}))}/>
                                <Input type="number" placeholder="Harga" value={newItem.price} onChange={e => setNewItem(i => ({...i, price: e.target.value}))} onKeyDown={e => e.key === 'Enter' && addItem()} />
                                <Button onClick={addItem}><FilePlus className="h-4 w-4 mr-2"/>Tambah</Button>
                            </div>
                            <div className="space-y-2">
                                {bill.items.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md">
                                        <span className="flex-grow font-medium">{item.name}</span>
                                        <span className="text-muted-foreground">{formatCurrency(item.price)}</span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4"/></Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>3. Pembagian Item</CardTitle><CardDescription>Centang siapa saja yang ikut patungan untuk setiap item.</CardDescription></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-2">Item</th>
                                            {bill.people.map(p => <th key={p.id} className="p-2 font-semibold">{p.name}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bill.items.map(item => (
                                            <tr key={item.id} className="border-b">
                                                <td className="p-2 font-medium">{item.name}</td>
                                                {bill.people.map(p => (
                                                    <td key={p.id} className="text-center p-2">
                                                        <Checkbox checked={item.participants.has(p.id)} onCheckedChange={() => toggleParticipant(item.id, p.id)} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Kolom Hasil */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
                    <Card>
                        <CardHeader><CardTitle>4. Biaya Tambahan</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <label className="flex-grow">Pajak</label>
                                <Input className="w-20" type="number" value={bill.tax} onChange={e => setBill(b => ({...b, tax: parseFloat(e.target.value) || 0}))} />
                                <Percent className="h-4 w-4"/>
                            </div>
                             <div className="flex items-center gap-2">
                                <label className="flex-grow">Servis</label>
                                <Input className="w-20" type="number" value={bill.service} onChange={e => setBill(b => ({...b, service: parseFloat(e.target.value) || 0}))} />
                                <Percent className="h-4 w-4"/>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>5. Hasil Akhir</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                           {summary.map(s => (
                               <div key={s.personId} className="flex justify-between items-center p-3 rounded-md bg-secondary">
                                   <span className="font-semibold">{s.personName}</span>
                                   <span className="font-bold text-primary">{formatCurrency(s.total)}</span>
                               </div>
                           ))}
                           <Separator />
                            <div className="flex justify-between items-center p-2 font-bold text-lg">
                               <span>TOTAL</span>
                               <span>{formatCurrency(summary.reduce((sum, s) => sum + s.total, 0))}</span>
                           </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                            <Button className="w-full bg-green-500 hover:bg-green-600" onClick={generateWhatsAppMessage}><Share2 className="h-4 w-4 mr-2"/>Bagikan ke WhatsApp</Button>
                            <Button className="w-full" variant="outline" onClick={copySummaryToClipboard}><Copy className="h-4 w-4 mr-2"/>Salin Rincian</Button>
                        </CardFooter>
                    </Card>
                </div>
            </main>
        </div>
    );
}

