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
import { ArrowLeft, Lock, Gem, CalendarDays as CalendarIcon, Loader2, BellRing, Repeat, TrendingUp, TrendingDown, PlusCircle, Pencil, Trash2, CalendarCheck, Check } from 'lucide-react';
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
    if (data?.toDate) return data.toDate();
    if (Array.isArray(data)) return data.map(convertTimestamps);
    if (typeof data === 'object' && data !== null) return Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: convertTimestamps(data[key]) }), {});
    return data;
};

const EventItem = ({ event, onTogglePaid, onEdit, onDelete }: {
    event: CalendarEvent;
    onTogglePaid: (id: string, isPaid: boolean) => void;
    onEdit: (event: CalendarEvent) => void;
    onDelete: (event: CalendarEvent) => void;
}) => {
    const isReminder = event.type === 'reminder';
    const isIncome = event.type === 'recurring-income';
    const amountColor = isIncome ? "text-emerald-600" : "text-rose-500";
    
    return (
        <div className="flex items-center justify-between py-4 border-b last:border-b-0 border-slate-50 dark:border-slate-800/50 group">
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0",
                    isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                )}>
                    {isReminder ? <BellRing className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </div>
                <div>
                    <p className={cn("text-sm font-bold text-slate-800 dark:text-slate-100 leading-none mb-1", isReminder && event.isPaid && "line-through opacity-50")}>{event.title}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isReminder ? 'Pengingat' : 'Otomatis'}</p>
                </div>
            </div>
            <div className="text-right flex items-center gap-4">
                <div className="hidden sm:block">
                    <p className={cn("text-sm font-black tabular-nums", amountColor)}>{formatCurrency(event.amount)}</p>
                </div>
                {isReminder ? (
                    <div className="flex items-center gap-1">
                        <Checkbox checked={event.isPaid} onCheckedChange={(c) => onTogglePaid(event.id, !!c)} className="rounded-md" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => onDelete(event)}><Trash2 className="h-4 w-4"/></Button>
                    </div>
                ) : (
                    <div className="w-8 flex justify-center"><Check className="h-4 w-4 text-emerald-500"/></div>
                )}
            </div>
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
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [reminderToDelete, setReminderToDelete] = React.useState<Reminder | null>(null);

    React.useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push('/login'); return; }
        if (!isPremium) { setIsLoadingData(false); return; }

        setIsLoadingData(true);
        const remUnsub = onSnapshot(query(collection(db, 'users', user.uid, 'reminders')), (snapshot) => {
            setReminders(snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Reminder));
        });
        const recUnsub = onSnapshot(query(collection(db, 'users', user.uid, 'recurringTransactions')), (snapshot) => {
            setRecurringTxs(snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as RecurringTransaction));
            setIsLoadingData(false);
        });
        return () => { remUnsub(); recUnsub(); };
    }, [user, isPremium, authLoading, router]);

    const events = React.useMemo(() => {
        const all = new Map<string, CalendarEvent[]>();
        reminders.forEach(rem => {
            const key = format(rem.dueDate, 'yyyy-MM-dd');
            if (!all.has(key)) all.set(key, []);
            all.get(key)!.push({ id: rem.id, date: rem.dueDate, title: rem.name, amount: rem.amount, type: 'reminder', isPaid: rem.isPaid, notes: rem.notes });
        });
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));
        for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
             recurringTxs.forEach(tx => {
                const days = getDaysInMonth(d);
                if (tx.dayOfMonth > days) return;
                const evDate = setDate(d, tx.dayOfMonth);
                const key = format(evDate, 'yyyy-MM-dd');
                if (!all.has(key)) all.set(key, []);
                all.get(key)!.push({ id: tx.id, date: evDate, title: tx.name, amount: tx.amount, type: tx.type === 'income' ? 'recurring-income' : 'recurring-expense' });
            });
        }
        return all;
    }, [reminders, recurringTxs, currentMonth]);
    
    const CustomDayContent = (props: DayContentProps) => {
        const dateKey = format(props.date, 'yyyy-MM-dd');
        const count = events.get(dateKey)?.length || 0;
        return (
            <div className="relative h-full w-full flex items-center justify-center font-bold text-xs">
                {format(props.date, 'd')}
                {count > 0 && <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full"></span>}
            </div>
        );
    };

    const handleTogglePaid = async (id: string, isPaid: boolean) => {
        if (idToken) await toggleReminderPaidStatus(idToken, id, isPaid);
    };

    if (authLoading || isLoadingData) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (!isPremium) return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full -ml-2 text-slate-400"><ArrowLeft className="h-5 w-5" /></Button>
                    <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Kalender</h1>
                </div>
            </header>
            <main className="flex-1 flex items-center justify-center p-6">
                <Card className="max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 text-center border-none shadow-sm">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6"><CalendarIcon className="h-10 w-10"/></div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-4">Fitur Premium</h3>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8">Visualisasikan seluruh jadwal keuangan Anda dalam satu kalender interaktif yang cerdas.</p>
                    <Button asChild className="w-full h-12 rounded-2xl bg-primary font-black uppercase text-[10px] tracking-widest"><Link href="/premium"><Gem className="mr-2 h-4 w-4"/>Buka Akses Premium</Link></Button>
                </Card>
            </main>
        </div>
    );

    const selectedEvents = selectedDay ? (events.get(format(selectedDay, 'yyyy-MM-dd')) || []) : [];

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full -ml-2 text-slate-400"><ArrowLeft className="h-5 w-5" /></Button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Kalender Finansial</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Atur Jadwal Masa Depan</p>
                    </div>
                </div>
                <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5"><CalendarIcon className="h-5 w-5" /></div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 shadow-sm border-slate-100 dark:border-slate-800 flex justify-center">
                        <Calendar mode="single" selected={selectedDay} onSelect={setSelectedDay} month={currentMonth} onMonthChange={setCurrentMonth} components={{ DayContent: CustomDayContent }} className="w-full" />
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border-slate-100 dark:border-slate-800 min-h-[400px]">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">AGENDA {selectedDay ? format(selectedDay, "d MMM", { locale: idLocale }).toUpperCase() : ''}</h3>
                        <div className="space-y-1">
                            {selectedEvents.length > 0 ? selectedEvents.map(e => <EventItem key={e.id} event={e} onTogglePaid={handleTogglePaid} onEdit={() => {}} onDelete={() => setReminderToDelete(reminders.find(r => r.id === e.id)!)} />) : (
                                <div className="text-center py-20 text-slate-300 dark:text-slate-800 italic text-xs font-bold uppercase tracking-widest">Tidak ada agenda.</div>
                            )}
                        </div>
                    </Card>
                </div>
            </main>
            
            <SpeedDial mainIcon={<PlusCircle className="h-8 w-8" />}><SpeedDialAction label="Tambah Agenda" onClick={() => setIsFormOpen(true)}><BellRing className="h-5 w-5 text-primary" /></SpeedDialAction></SpeedDial>
            <AddReminderForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
            <AlertDialog open={!!reminderToDelete} onOpenChange={o => !o && setReminderToDelete(null)}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader><AlertDialogTitle className="font-bold uppercase tracking-widest text-xs">Hapus Agenda?</AlertDialogTitle><AlertDialogDescription className="text-xs font-bold text-slate-400">Tindakan ini permanen.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 mt-4"><AlertDialogCancel className="flex-1 rounded-xl h-10 text-[10px] font-bold uppercase tracking-widest">Batal</AlertDialogCancel><AlertDialogAction onClick={async () => { if (idToken && reminderToDelete) await deleteReminder(idToken, reminderToDelete.id); setReminderToDelete(null); }} className="flex-1 rounded-xl h-10 bg-rose-500 text-[10px] font-bold uppercase tracking-widest">Hapus</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}