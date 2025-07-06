
"use client"

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import type { Reminder, RecurringTransaction } from '@/lib/types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, getDaysInMonth, setDate } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { DayContentProps } from 'react-day-picker';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Lock, Gem, CalendarDays as CalendarIcon, Loader2, BellRing, Repeat, TrendingUp, TrendingDown, CheckCircle, Circle, PlusCircle, Pencil, Trash2, CalendarCheck, CalendarClock, Check } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';
import { AddReminderForm } from '@/components/AddReminderForm';
import { deleteReminder, toggleReminderPaidStatus } from '@/app/reminders/actions';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


type CalendarEvent = {
  id: string;
  date: Date;
  title: string;
  amount: number;
  type: 'reminder' | 'recurring-expense' | 'recurring-income';
  isPaid?: boolean;
  notes?: string;
};

const convertTimestamps = (data: any): any => {
    if (!data) return data;
    if (data?.toDate) {
        return data.toDate();
    }
    if (Array.isArray(data)) {
        return data.map(item => convertTimestamps(item));
    }
    if (typeof data === 'object' && data !== null) {
        const newObj: { [key: string]: any } = {};
        for (const key of Object.keys(data)) {
            newObj[key] = convertTimestamps(data[key]);
        }
        return newObj;
    }
    return data;
};

// Sub-component for displaying a single event in the list
const EventItem = ({ event, onTogglePaid, onEdit, onDelete }: {
    event: CalendarEvent;
    onTogglePaid: (id: string, isPaid: boolean) => void;
    onEdit: (event: CalendarEvent) => void;
    onDelete: (event: CalendarEvent) => void;
}) => {
    const iconMap = {
        'reminder': <BellRing className="h-5 w-5 text-amber-500 flex-shrink-0" />,
        'recurring-expense': <TrendingDown className="h-5 w-5 text-red-500 flex-shrink-0" />,
        'recurring-income': <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0" />,
    };

    const isReminder = event.type === 'reminder';
    
    return (
        <div className="flex items-start gap-4 p-3 rounded-md border bg-background">
            {isReminder ? (
                <Checkbox
                    id={`event-${event.id}`}
                    checked={event.isPaid}
                    onCheckedChange={(checked) => onTogglePaid(event.id, !!checked)}
                    className="mt-1"
                />
            ) : (
                <div className="mt-1">{iconMap[event.type]}</div>
            )}
            <div className="flex-1 grid gap-1">
                <label htmlFor={isReminder ? `event-${event.id}` : undefined} className={cn("font-semibold cursor-pointer", isReminder && event.isPaid && "line-through text-muted-foreground")}>{event.title}</label>
                <p className={cn("text-sm", isReminder && event.isPaid ? "text-muted-foreground line-through" : "text-foreground")}>{formatCurrency(event.amount)}</p>
                {event.notes && <p className="text-xs text-muted-foreground">{event.notes}</p>}
            </div>
             {isReminder && (
                <div className="flex items-center gap-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(event)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(event)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {!isReminder && (
                 <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Repeat className="h-3 w-3" />
                    <span>Otomatis</span>
                 </div>
            )}
        </div>
    );
};


export default function FinancialCalendarPage() {
    const { user, idToken, loading: authLoading, isPremium } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [isLoadingData, setIsLoadingData] = React.useState(true);
    const [reminders, setReminders] = React.useState<Reminder[]>([]);
    const [recurringTxs, setRecurringTxs] = React.useState<RecurringTransaction[]>([]);
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [selectedDay, setSelectedDay] = React.useState<Date | undefined>(new Date());
    
    // State for CRUD
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingReminder, setEditingReminder] = React.useState<Reminder | null>(null);
    const [reminderToDelete, setReminderToDelete] = React.useState<Reminder | null>(null);

    React.useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (!isPremium) {
            setIsLoadingData(false);
            return;
        }

        setIsLoadingData(true);

        const remindersQuery = query(collection(db, 'users', user.uid, 'reminders'));
        const recurringQuery = query(collection(db, 'users', user.uid, 'recurringTransactions'));

        const remUnsub = onSnapshot(remindersQuery, (snapshot) => {
            setReminders(snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Reminder));
        });

        const recUnsub = onSnapshot(recurringQuery, (snapshot) => {
            setRecurringTxs(snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as RecurringTransaction));
            setIsLoadingData(false);
        });

        return () => {
            remUnsub();
            recUnsub();
        };

    }, [user, isPremium, authLoading, router]);

    const events = React.useMemo(() => {
        const allEvents = new Map<string, CalendarEvent[]>();
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));

        reminders.forEach(rem => {
            const dateKey = format(rem.dueDate, 'yyyy-MM-dd');
            const event: CalendarEvent = {
                id: rem.id,
                date: rem.dueDate,
                title: rem.name,
                amount: rem.amount,
                type: 'reminder',
                isPaid: rem.isPaid,
                notes: rem.notes,
            };
            if (!allEvents.has(dateKey)) allEvents.set(dateKey, []);
            allEvents.get(dateKey)!.push(event);
        });

        for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
             recurringTxs.forEach(tx => {
                const daysInMonth = getDaysInMonth(d);
                if (tx.dayOfMonth > daysInMonth) return;

                const eventDate = setDate(d, tx.dayOfMonth);
                const dateKey = format(eventDate, 'yyyy-MM-dd');

                const event: CalendarEvent = {
                    id: tx.id,
                    date: eventDate,
                    title: tx.name,
                    amount: tx.amount,
                    type: tx.type === 'income' ? 'recurring-income' : 'recurring-expense',
                    notes: tx.notes
                };

                if (!allEvents.has(dateKey)) allEvents.set(dateKey, []);
                allEvents.get(dateKey)!.push(event);
            });
        }
        return allEvents;
    }, [reminders, recurringTxs, currentMonth]);
    
    const CustomDayContent = (props: DayContentProps) => {
        const { date } = props;
        const dateKey = format(date, 'yyyy-MM-dd');
        const eventCount = events.get(dateKey)?.length || 0;

        return (
            <div className="relative h-full w-full flex items-center justify-center">
                {format(date, 'd')}
                {eventCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 justify-center text-xs rounded-full pointer-events-none"
                    >
                        {eventCount > 9 ? '9+' : eventCount}
                    </Badge>
                )}
            </div>
        );
    };

    const selectedDayEvents = React.useMemo(() => {
        if (!selectedDay) return [];
        const dateKey = format(selectedDay, 'yyyy-MM-dd');
        return (events.get(dateKey) || []).sort((a,b) => a.title.localeCompare(b.title));
    }, [selectedDay, events]);
    
    // CRUD Handlers
    const handleTogglePaid = async (reminderId: string, isPaid: boolean) => {
        if (!idToken) return;
        const result = await toggleReminderPaidStatus(idToken, reminderId, isPaid);
        if (!result.success) toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
    };

    const handleOpenForm = (event?: CalendarEvent) => {
        const reminder = event ? reminders.find(r => r.id === event.id) : null;
        setEditingReminder(reminder || null);
        setIsFormOpen(true);
    };

    const handleDeleteRequest = (event: CalendarEvent) => {
        const reminder = reminders.find(r => r.id === event.id);
        if (reminder) setReminderToDelete(reminder);
    };

    const confirmDelete = async () => {
        if (!reminderToDelete || !idToken) return;
        const result = await deleteReminder(idToken, reminderToDelete.id);
        if (result.success) {
            toast({ title: 'Sukses', description: 'Agenda berhasil dihapus.' });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setReminderToDelete(null);
    };

    const PageHeader = () => (
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Kembali</span>
        </Button>
        <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h1 className="font-headline text-xl font-bold text-foreground">
                Kalender Finansial
            </h1>
        </div>
      </header>
    );

    const LockedState = () => (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <PageHeader />
             <main className="flex-1 flex items-center justify-center p-4 pb-20">
                    <Card className="w-full max-w-lg text-left">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-lg">
                                    <CalendarIcon className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="font-headline text-2xl">Lihat Semua Jadwal Keuangan dalam Satu Tampilan</CardTitle>
                                    <CardDescription>
                                        Jangan pernah lagi melewatkan tanggal jatuh tempo atau pembayaran.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Kalender Finansial menyatukan semua pengingat, tagihan, dan transaksi berulang Anda dalam satu kalender interaktif. Dapatkan gambaran jelas tentang arus kas Anda di masa depan dan rencanakan pengeluaran Anda dengan lebih baik.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Visualisasikan Jatuh Tempo</h4>
                                        <p className="text-sm text-muted-foreground">Lihat semua tagihan dan pengingat Anda dalam format kalender yang mudah dibaca.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Lacak Transaksi Otomatis</h4>
                                        <p className="text-sm text-muted-foreground">Lihat kapan gaji atau pembayaran rutin lainnya dijadwalkan untuk masuk atau keluar dari rekening Anda.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold">Antisipasi Arus Kas</h4>
                                        <p className="text-sm text-muted-foreground">Rencanakan keuangan bulanan Anda dengan lebih percaya diri dengan mengetahui semua jadwal penting di depan mata.</p>
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
    );

    if (authLoading || isLoadingData) {
        return <div className="flex h-screen w-full items-center justify-center bg-secondary"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!isPremium) {
        return <LockedState />;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <PageHeader />
            <main className="flex-1 p-4 sm:p-6 md:p-8 flex justify-center">
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardContent className="p-0 sm:p-4 flex justify-center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDay}
                                    onSelect={setSelectedDay}
                                    month={currentMonth}
                                    onMonthChange={setCurrentMonth}
                                    components={{
                                        DayContent: CustomDayContent
                                    }}
                                    className="w-full"
                                />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline text-lg">
                                    Agenda untuk {selectedDay ? format(selectedDay, "d MMMM yyyy", { locale: idLocale }) : '...'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 h-[450px] overflow-y-auto">
                               {selectedDayEvents.length > 0 ? (
                                    selectedDayEvents.map(event => 
                                        <EventItem 
                                            key={`${event.id}-${event.date.toISOString()}`} 
                                            event={event}
                                            onTogglePaid={handleTogglePaid}
                                            onEdit={handleOpenForm}
                                            onDelete={handleDeleteRequest}
                                        />
                                    )
                               ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                        <CalendarIcon className="h-12 w-12 mb-4" />
                                        <p className="font-semibold">Tidak ada jadwal</p>
                                        <p className="text-sm">Tidak ada agenda atau transaksi berulang pada tanggal ini.</p>
                                    </div>
                               )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            
            <SpeedDial mainIcon={<PlusCircle className="h-7 w-7" />}>
                <SpeedDialAction label="Tambah Agenda" onClick={() => handleOpenForm()}>
                    <BellRing className="h-5 w-5 text-blue-500" />
                </SpeedDialAction>
            </SpeedDial>

            <AddReminderForm 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                reminderToEdit={editingReminder}
            />

            <AlertDialog open={!!reminderToDelete} onOpenChange={(open) => !open && setReminderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Agenda Ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Anda akan menghapus agenda untuk "{reminderToDelete?.name}". Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                           Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
