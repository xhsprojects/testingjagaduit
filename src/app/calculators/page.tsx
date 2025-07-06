
"use client"

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, Gem, Calculator as CalculatorIcon, Check, BarChart3, TrendingUp, PiggyBank } from 'lucide-react';
import InvestmentGrowthCalculator from '@/components/calculators/InvestmentGrowthCalculator';
import DebtPayoffCalculator from '@/components/calculators/DebtPayoffCalculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function CalculatorsPage() {
    const { user, loading: authLoading, isPremium } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat Kalkulator...</div>
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
                        <CalculatorIcon className="h-5 w-5 text-primary" />
                        <h1 className="font-headline text-xl font-bold text-foreground">
                            Kalkulator & Proyeksi
                        </h1>
                    </div>
                </header>
                 <main className="flex-1 flex items-center justify-center p-4 pb-20">
                    <Card className="w-full max-w-lg text-left">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    <CalculatorIcon className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-2xl">Rencanakan & Proyeksikan Masa Depan Keuangan Anda</CardTitle>
                                    <CardDescription>
                                        Gunakan alat canggih untuk membuat keputusan finansial yang lebih cerdas.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Berhenti menebak-nebak dan mulailah membuat keputusan berdasarkan data. Fitur premium ini memberikan Anda alat untuk melihat bagaimana investasi Anda bisa bertumbuh atau menyusun strategi paling efektif untuk melunasi utang.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Kalkulator Pertumbuhan Investasi</h4>
                                        <p className="text-sm text-muted-foreground">Lihat proyeksi pertumbuhan dana Anda dengan memperhitungkan setoran rutin dan imbal hasil tahunan.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Kalkulator Pelunasan Utang</h4>
                                        <p className="text-sm text-muted-foreground">Bandingkan strategi 'Avalanche' (bunga tertinggi) vs 'Snowball' (saldo terkecil) untuk melihat mana yang lebih cepat dan hemat biaya bagi Anda.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Buat Keputusan Cerdas</h4>
                                        <p className="text-sm text-muted-foreground">Antisipasi masa depan finansial Anda dan buat rencana yang lebih solid untuk mencapai kebebasan finansial.</p>
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
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex items-center gap-2">
                    <CalculatorIcon className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Kalkulator & Proyeksi
                    </h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 pb-20">
                <Tabs defaultValue="investment" className="w-full">
                    <TabsList>
                        <TabsTrigger value="investment">Pertumbuhan Investasi</TabsTrigger>
                        <TabsTrigger value="debt">Pelunasan Utang</TabsTrigger>
                    </TabsList>
                    <TabsContent value="investment" className="mt-6">
                        <InvestmentGrowthCalculator />
                    </TabsContent>
                    <TabsContent value="debt" className="mt-6">
                        <DebtPayoffCalculator />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
