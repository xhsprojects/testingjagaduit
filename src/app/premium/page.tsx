// src/app/premium/page.tsx
"use client"

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle, Gem, Sparkles, ScanLine, Bot, TrendingUp, Heart, X, Scale, Calculator, Repeat, CalendarDays, Upload, BarChart3, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const freeFeatures = [
    "Anggaran & Kategori Fleksibel",
    "Gamifikasi (Level, XP, Lencana)",
    "Kustomisasi Tema Terbatas",
    "Laporan Visual & Ekspor Data",
    "Manajemen Dompet & Transfer Dana",
    "Pencatatan Transaksi Manual",
    "Riwayat & Arsip Anggaran",
    "Transaksi Berulang & Pengingat Bayar",
    "Tujuan Menabung & Manajemen Utang",
];

const premiumFeatures = [
    { icon: BarChart3, text: "Laporan Analisis Keuangan AI" },
    { icon: CalendarDays, text: "Kalender Finansial Interaktif" },
    { icon: Upload, text: "Impor Transaksi dari File (CSV)" },
    { icon: Scale, text: "Pelacakan Kekayaan Bersih" },
    { icon: Calculator, text: "Kalkulator & Proyeksi Keuangan" },
    { icon: ScanLine, text: "Pindai Struk Tanpa Batas" },
    { icon: TrendingUp, text: "Peramalan & Peringatan Anggaran AI" },
    { icon: Bot, text: "Asisten Keuangan Personal (Chatbot)" },
    { icon: Palette, text: "Kustomisasi Warna Tema Eksklusif" },
];

const plans = {
    monthly: { id: 'monthly', name: "Dukungan Bulanan", priceString: "Traktir 1 Kopi", period: "/ bulan", duration: "1 Bulan" },
    yearly: { id: 'yearly', name: "Dukungan Tahunan", priceString: "Traktir 10 Kopi", period: "/ tahun", popular: true, duration: "1 Tahun" },
    lifetime: { id: 'lifetime', name: "Dukungan Seumur Hidup", priceString: "Traktir 20 Kopi", period: "/ sekali", duration: "Seumur Hidup"},
}

export default function PremiumPage() {
    const { isPremium, loading, premiumExpiresAt } = useAuth();
    const router = useRouter();
    
    if (loading) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat...</div>
            </div>
        )
    }

    const isLifetime = premiumExpiresAt && premiumExpiresAt.getFullYear() > 9000;

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Paket & Dukungan
                    </h1>
                </div>
            </header>
            <main className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 pb-20">
                 <div className="w-full max-w-4xl text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-9 w-9 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold font-headline">Bantu Aplikasi Ini Terus Berkembang</h2>
                    <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">Dukungan Anda membantu menutupi biaya server dan memungkinkan pengembangan fitur-fitur baru. Sebagai ucapan terima kasih, Anda akan mendapatkan akses ke semua fitur premium.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full my-8 items-stretch">
                    {/* Free Plan */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-headline">Standard</CardTitle>
                            <CardDescription>
                                <span className="text-3xl font-bold text-foreground">Gratis</span>
                                <span className="text-muted-foreground">/ selamanya</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <ul className="space-y-2 text-sm">
                                <li className="font-semibold">Fitur yang termasuk:</li>
                                {freeFeatures.sort().map(feature => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                                <li className="flex items-center gap-2 text-muted-foreground">
                                    <X className="h-4 w-4 text-destructive" />
                                    <span>Semua Fitur Premium</span>
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" disabled={!isPremium} variant="outline">
                                {!isPremium ? "Anda di paket ini" : "Kembali ke Standard"}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Premium Plans */}
                    {Object.values(plans).map(plan => (
                        <Card key={plan.id} className={cn("flex flex-col", plan.popular && "border-primary border-2 shadow-lg")}>
                            <CardHeader className="relative">
                                {plan.popular && <div className="absolute top-0 right-4 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">Paling Populer</div>}
                                <CardTitle className="font-headline">{plan.name}</CardTitle>
                                <CardDescription>
                                    <span className="text-3xl font-bold text-foreground">{plan.priceString}</span>
                                    <span className="text-muted-foreground">{plan.period}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3">
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span>Semua fitur <b>Standard</b></span>
                                    </li>
                                    <li className="font-semibold mt-2">Plus Semua Fitur Premium:</li>
                                    {premiumFeatures.map(feature => (
                                        <li key={feature.text} className="flex items-center gap-2">
                                            <feature.icon className="h-4 w-4 text-primary" />
                                            <span>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-xs text-muted-foreground pt-2 border-t">Akses premium berlaku selama <b>{plan.duration}</b> setelah aktivasi.</p>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    asChild
                                    disabled={isPremium}
                                    className="w-full"
                                    variant={plan.popular ? "default" : "outline"}
                                >
                                    <Link href="https://trakteer.id/mshasbi" target="_blank" rel="noopener noreferrer">
                                        <Heart className="mr-2 h-4 w-4" />
                                        {isPremium ? "Terima Kasih!" : "Dukung via Trakteer"}
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {isPremium && (
                    <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-md bg-green-100 p-4 text-center text-green-800 dark:bg-green-900/50 dark:text-green-300 max-w-md w-full">
                        <div className='flex items-center gap-2'>
                            <CheckCircle className="h-5 w-5"/>
                            <p className="font-medium">Anda adalah Anggota Premium!</p>
                        </div>
                         {premiumExpiresAt && (
                            <p className='text-sm'>
                                {isLifetime 
                                    ? "Anda memiliki akses seumur hidup."
                                    : `Langganan Anda aktif hingga ${premiumExpiresAt.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}.`
                                }
                            </p>
                        )}
                    </div>
                )}

                 <div className="mt-8 text-center max-w-2xl w-full">
                     <Alert>
                        <AlertTitle className='font-bold'>Penting: Cara Aktivasi</AlertTitle>
                        <AlertDescription className="text-left space-y-2 mt-2">
                           <p>
                                Setelah memberikan dukungan di Trakteer, mohon <b>tulis alamat email yang sesuai dengan akun Jaga Duit Anda</b> di kolom pesan saat pembayaran.
                           </p>
                           <p>
                               Aktivasi akan diproses dalam <b>maksimal 1x24 jam</b>.
                           </p>
                            <p>
                                Jika ingin aktivasi lebih cepat, silakan hubungi <a href="https://wa.me/628989019049" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Support via WhatsApp</a> dengan menyertakan bukti pembayaran.
                           </p>
                        </AlertDescription>
                    </Alert>
                 </div>
            </main>
        </div>
    );
}
