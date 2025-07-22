
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, UserPlus, FilePlus, Percent, MessageCircle, Copy, Trash2, PlusCircle, MinusCircle, Users, ReceiptText, Share2, Info } from 'lucide-react';
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

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

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
            <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Fitur Baru!</AlertTitle>
                    <AlertDescription>
                        Fitur Split Bill sedang dalam pengembangan. Anda bisa mencoba versi awal ini untuk membagi tagihan. Mohon berikan masukan Anda!
                    </AlertDescription>
                </Alert>
                {/* Konten utama akan ditambahkan di sini */}
                 <Card>
                    <CardHeader>
                        <CardTitle>Segera Hadir</CardTitle>
                        <CardDescription>
                            Fitur canggih untuk membagi tagihan sedang dalam tahap akhir pengembangan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-muted-foreground py-12">
                         <ReceiptText className="h-16 w-16 mx-auto mb-4" />
                         <p className="font-semibold">Fungsionalitas penuh akan segera tersedia.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
