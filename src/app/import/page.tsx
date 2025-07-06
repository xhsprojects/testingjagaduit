
"use client"

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, Gem, Upload, Loader2, ListTree, CheckCircle, FileUp, Save, Columns, Pencil, Trash2, XCircle, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { parseTransactions, type ParsedTransaction } from '@/ai/flows/import-transactions-flow';
import { saveImportedTransactions } from './actions';
import type { Category, Wallet } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

type Stage = '1-upload' | '2-map' | '3-review' | '4-complete';
type ReviewTransaction = ParsedTransaction & { walletId: string };

export default function ImportPage() {
    const { user, idToken, loading: authLoading, isPremium } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [stage, setStage] = React.useState<Stage>('1-upload');
    const [file, setFile] = React.useState<File | null>(null);
    const [fileHeaders, setFileHeaders] = React.useState<string[]>([]);
    const [filePreview, setFilePreview] = React.useState<string[][]>([]);
    
    const [dateCol, setDateCol] = React.useState<string>('');
    const [descCol, setDescCol] = React.useState<string>('');
    const [amountCol, setAmountCol] = React.useState<string>('');
    
    const [isLoading, setIsLoading] = React.useState(false);
    const [userCategories, setUserCategories] = React.useState<Category[]>([]);
    const [wallets, setWallets] = React.useState<Wallet[]>([]);
    const [parsedTransactions, setParsedTransactions] = React.useState<ReviewTransaction[]>([]);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
        if (user) {
            const fetchData = async () => {
                const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
                const budgetSnap = await getDoc(budgetDocRef);
                if (budgetSnap.exists()) {
                    setUserCategories(budgetSnap.data().categories || []);
                }
                const walletsRef = collection(db, 'users', user.uid, 'wallets');
                const walletsSnap = await getDocs(walletsRef);
                setWallets(walletsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Wallet));
            };
            fetchData();
        }
    }, [user, authLoading, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv') {
                toast({ title: "Format File Salah", description: "Harap unggah file dengan format .csv", variant: "destructive" });
                return;
            }
            setFile(selectedFile);
            Papa.parse(selectedFile, {
                header: true,
                preview: 5,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.meta.fields) {
                        const validHeaders = results.meta.fields.filter(h => h && h.trim());
                        setFileHeaders(validHeaders);
                        
                        const previewData = (results.data as any[]).map(row => validHeaders.map(field => row[field] || ''));
                        setFilePreview(previewData);
                        setStage('2-map');
                    }
                }
            });
        }
    };
    
    const handleProcessFile = async () => {
        if (!file) return;
        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvContent = event.target?.result as string;
            const categoriesJSON = JSON.stringify(userCategories.map(({id, name}) => ({id, name})));
            const result = await parseTransactions({
                csvContent,
                columnMapping: { date: dateCol, description: descCol, amount: amountCol },
                userCategoriesJSON: categoriesJSON,
            });

            if ('error' in result) {
                toast({ title: "Gagal Memproses", description: result.error, variant: 'destructive' });
            } else {
                setParsedTransactions(result.transactions.map(tx => ({...tx, walletId: ''})));
                setStage('3-review');
            }
            setIsLoading(false);
        };
        reader.readAsText(file);
    };

    const handleSave = async () => {
        if (!idToken || parsedTransactions.length === 0) return;
        
        const allValid = parsedTransactions.every(tx => {
            const isWalletSelected = !!tx.walletId;
            const isCategorySelected = tx.isIncome || !!tx.suggestedCategoryId;
            return isWalletSelected && isCategorySelected;
        });

        if (!allValid) {
            toast({ title: "Data Tidak Lengkap", description: "Pastikan semua transaksi memiliki dompet dan kategori (untuk pengeluaran).", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        const result = await saveImportedTransactions(idToken, parsedTransactions);
        if (result.success) {
            toast({ title: "Sukses!", description: result.message });
            setStage('4-complete');
        } else {
            toast({ title: "Gagal Menyimpan", description: result.message, variant: 'destructive' });
        }
        setIsLoading(false);
    }
    
    const allTransactionsValid = React.useMemo(() => {
        if (parsedTransactions.length === 0) return false;
        return parsedTransactions.every(tx => {
            const isWalletSelected = !!tx.walletId;
            const isCategorySelected = tx.isIncome || !!tx.suggestedCategoryId;
            return isWalletSelected && isCategorySelected;
        });
    }, [parsedTransactions]);

    const resetProcess = () => {
        setFile(null);
        setFileHeaders([]);
        setFilePreview([]);
        setDateCol('');
        setDescCol('');
        setAmountCol('');
        setParsedTransactions([]);
        setStage('1-upload');
    };

    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isPremium) {
        return (
             <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Kembali</span>
                    </Button>
                     <div className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary" />
                        <h1 className="font-headline text-xl font-bold text-foreground">Impor Transaksi</h1>
                     </div>
                </header>
                 <main className="flex-1 flex items-center justify-center p-4 pb-20">
                    <Card className="w-full max-w-lg text-left">
                         <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-2xl">Otomatiskan Pencatatan dengan Impor Cerdas</CardTitle>
                                    <CardDescription>
                                        Ucapkan selamat tinggal pada entri data manual yang melelahkan.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Fitur premium ini memungkinkan Anda mengunggah file mutasi rekening dari e-banking (dalam format CSV) dan membiarkan AI kami yang bekerja untuk mengkategorikan transaksi Anda secara otomatis.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Impor Massal</h4>
                                        <p className="text-sm text-muted-foreground">Catat ratusan transaksi dari file mutasi rekening Anda hanya dalam beberapa klik.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Kategorisasi Cerdas AI</h4>
                                        <p className="text-sm text-muted-foreground">AI akan menganalisis deskripsi transaksi dan menyarankan kategori yang paling relevan untuk setiap pengeluaran.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Hemat Waktu & Akurat</h4>
                                        <p className="text-sm text-muted-foreground">Kurangi waktu yang dihabiskan untuk entri data dan pastikan catatan keuangan Anda selalu akurat dan terperinci.</p>
                                    </div>
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href="/premium">
                                    <Gem className="mr-2 h-4 w-4" />
                                    Lihat Paket Premium & Buka Fitur Ini
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                 </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
                 <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">Impor Transaksi</h1>
                 </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                {stage === '1-upload' && (
                    <Card className="max-w-xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5"/> Langkah 1: Unggah File</CardTitle>
                            <CardDescription>Pilih file mutasi rekening berformat CSV yang telah Anda unduh dari e-banking.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary/80">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <FileUp className="w-10 h-10 mb-3 text-primary" />
                                        <p className="mb-2 text-sm text-foreground"><span className="font-semibold">Klik untuk mengunggah</span> atau seret file ke sini</p>
                                        <p className="text-xs text-muted-foreground">Hanya file .CSV</p>
                                    </div>
                                    <input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange}/>
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {stage === '2-map' && (
                    <Card className="max-w-4xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ListTree className="h-5 w-5"/> Langkah 2: Petakan Kolom</CardTitle>
                            <CardDescription>Beri tahu kami kolom mana yang berisi tanggal, deskripsi, dan jumlah transaksi.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><label className="font-medium text-sm">Kolom Tanggal</label><Select onValueChange={setDateCol}><SelectTrigger><SelectValue placeholder="Pilih..."/></SelectTrigger><SelectContent>{fileHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                    <div><label className="font-medium text-sm">Kolom Deskripsi</label><Select onValueChange={setDescCol}><SelectTrigger><SelectValue placeholder="Pilih..."/></SelectTrigger><SelectContent>{fileHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                    <div><label className="font-medium text-sm">Kolom Jumlah</label><Select onValueChange={setAmountCol}><SelectTrigger><SelectValue placeholder="Pilih..."/></SelectTrigger><SelectContent>{fileHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                                </div>
                                <p className="text-xs text-muted-foreground">AI akan otomatis mendeteksi pemasukan (angka positif) dan pengeluaran (angka negatif) dari kolom jumlah yang Anda pilih.</p>
                            </div>
                             <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2"><Columns className="h-4 w-4"/> Pratinjau File</h3>
                                <div className="max-h-60 overflow-auto border rounded-lg">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-secondary">
                                        <TableRow>{fileHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filePreview.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j} className="truncate max-w-xs">{cell}</TableCell>)}</TableRow>)}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={resetProcess}>Batal</Button>
                            <Button onClick={handleProcessFile} disabled={isLoading || !dateCol || !descCol || !amountCol}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Proses dengan AI
                            </Button>
                        </CardFooter>
                    </Card>
                )}
                 {stage === '3-review' && (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5"/> Langkah 3: Tinjau & Simpan</CardTitle>
                            <CardDescription>AI telah memproses transaksi Anda. Periksa kembali, pilih dompet dan ubah kategori jika perlu, lalu simpan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="max-h-[50vh] overflow-auto border rounded-lg">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-secondary">
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Deskripsi</TableHead>
                                            <TableHead>Jumlah</TableHead>
                                            <TableHead>Kategori</TableHead>
                                            <TableHead>Dompet</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedTransactions.map((tx, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{format(new Date(tx.date), "d MMM yyyy", {locale: idLocale})}</TableCell>
                                                <TableCell className="truncate max-w-xs">{tx.description}</TableCell>
                                                <TableCell className={tx.isIncome ? 'text-green-600' : 'text-destructive'}>{formatCurrency(tx.amount)}</TableCell>
                                                <TableCell>
                                                    <Select
                                                        defaultValue={tx.suggestedCategoryId}
                                                        onValueChange={(newCatId) => {
                                                            const newTxs = [...parsedTransactions];
                                                            newTxs[index].suggestedCategoryId = newCatId;
                                                            setParsedTransactions(newTxs);
                                                        }}
                                                        disabled={tx.isIncome}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih Kategori"/></SelectTrigger>
                                                        <SelectContent>
                                                            {userCategories.filter(c=>!c.isEssential).map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={tx.walletId}
                                                        onValueChange={(newWalletId) => {
                                                            const newTxs = [...parsedTransactions];
                                                            newTxs[index].walletId = newWalletId;
                                                            setParsedTransactions(newTxs);
                                                        }}
                                                    >
                                                        <SelectTrigger><SelectValue placeholder="Pilih Dompet"/></SelectTrigger>
                                                        <SelectContent>
                                                            {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setParsedTransactions(parsedTransactions.filter((_, i) => i !== index))}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </div>
                        </CardContent>
                         <CardFooter className="flex justify-between">
                            <Button variant="ghost" onClick={resetProcess}>Mulai dari Awal</Button>
                            <Button onClick={handleSave} disabled={isLoading || !allTransactionsValid}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Simpan {parsedTransactions.length} Transaksi
                            </Button>
                        </CardFooter>
                     </Card>
                )}
                 {stage === '4-complete' && (
                     <Card className="max-w-xl mx-auto text-center">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2"><Save className="h-7 w-7 text-green-500"/> Impor Selesai!</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <p>Semua transaksi Anda telah berhasil disimpan. Anda dapat melihatnya di halaman Riwayat atau Dasbor.</p>
                        </CardContent>
                         <CardFooter className="flex justify-center gap-4">
                            <Button onClick={resetProcess} variant="outline">Impor File Lain</Button>
                            <Button asChild><Link href="/">Kembali ke Dasbor</Link></Button>
                        </CardFooter>
                     </Card>
                )}
            </main>
        </div>
    );
}
