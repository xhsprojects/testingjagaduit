
"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import type { Reminder } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { isPast, format, differenceInDays } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { cn, formatCurrency } from '@/lib/utils'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BellRing, Loader2, PlusCircle, Pencil, Trash2, CalendarCheck, CalendarClock, ArrowLeft } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { AddReminderForm } from '@/components/AddReminderForm'
import { deleteReminder, toggleReminderPaidStatus } from './actions'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (typeof data.toDate === 'function') {
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

const ReminderItem = ({ reminder, onTogglePaid, onEdit, onDelete }: {
    reminder: Reminder;
    onTogglePaid: (reminder: Reminder) => void;
    onEdit: (reminder: Reminder) => void;
    onDelete: (reminder: Reminder) => void;
}) => {
    const dueDate = reminder.dueDate as Date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = differenceInDays(dueDate, today);

    const getDueDateInfo = () => {
        if (reminder.isPaid) return { text: 'Sudah Dibayar', color: 'text-green-600', Icon: CalendarCheck };
        if (diff < 0) return { text: 'Terlewat', color: 'text-destructive', Icon: CalendarClock };
        if (diff === 0) return { text: 'Hari Ini', color: 'text-amber-600', Icon: CalendarClock };
        if (diff === 1) return { text: 'Besok', color: 'text-sky-600', Icon: CalendarClock };
        return { text: `Dalam ${diff} hari`, color: 'text-muted-foreground', Icon: CalendarClock };
    };

    const dueDateInfo = getDueDateInfo();
    const Icon = dueDateInfo.Icon;

    return (
        <div className={cn("flex items-start gap-4 p-4 rounded-lg border", reminder.isPaid ? 'bg-secondary/30' : 'bg-card')}>
            <Checkbox
                id={`reminder-${reminder.id}`}
                checked={reminder.isPaid}
                onCheckedChange={() => onTogglePaid(reminder)}
                className="mt-1"
                aria-label={`Tandai ${reminder.name} sebagai lunas`}
            />
            <div className="flex-1 grid gap-1">
                <label htmlFor={`reminder-${reminder.id}`} className={cn("font-semibold cursor-pointer", reminder.isPaid && "line-through text-muted-foreground")}>{reminder.name}</label>
                <p className={cn("text-lg font-bold", reminder.isPaid ? "text-muted-foreground line-through" : "text-primary")}>{formatCurrency(reminder.amount)}</p>
                <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", dueDateInfo.color)} />
                    <p className={cn("text-xs font-medium", dueDateInfo.color)}>{dueDateInfo.text}</p>
                    <span className="text-xs text-muted-foreground">| {format(dueDate, "d MMM yyyy", { locale: idLocale })}</span>
                </div>
                {reminder.notes && <p className="text-sm text-muted-foreground pt-1 border-t mt-2">{reminder.notes}</p>}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(reminder)} aria-label="Ubah pengingat">
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(reminder)} aria-label="Hapus pengingat">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default function RemindersPage() {
    const { user, idToken, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [reminders, setReminders] = React.useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingReminder, setEditingReminder] = React.useState<Reminder | null>(null);
    const [reminderToDelete, setReminderToDelete] = React.useState<Reminder | null>(null);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    React.useEffect(() => {
        if (!user?.uid) {
            setIsLoading(false);
            return;
        }

        const remindersQuery = query(collection(db, 'users', user.uid, 'reminders'), orderBy('dueDate', 'asc'));
        
        const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
            const remindersData = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Reminder);
            setReminders(remindersData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching reminders:", error);
            toast({ title: 'Gagal Memuat Pengingat', variant: 'destructive' });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid, toast]);

    const handleTogglePaid = async (reminder: Reminder) => {
        if (!user?.uid || !idToken) return;
        
        try {
            const result = await toggleReminderPaidStatus(idToken, reminder.id, !reminder.isPaid);
            if (!result.success) {
                 toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };
    
    const handleDelete = async () => {
        if (!user?.uid || !reminderToDelete || !idToken) return;
        
        try {
            const result = await deleteReminder(idToken, reminderToDelete.id);
            if (result.success) {
                 toast({ title: 'Sukses', description: 'Pengingat berhasil dihapus.' });
            } else {
                 toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setReminderToDelete(null);
        }
    }
    
    const upcomingReminders = reminders.filter(r => !r.isPaid);
    const completedReminders = reminders.filter(r => r.isPaid).sort((a,b) => (b.dueDate as Date).getTime() - (a.dueDate as Date).getTime());

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="flex items-center gap-3 text-lg font-semibold text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Memuat Pengingat...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Kembali</span>
                    </Button>
                    <div className="flex items-center gap-2">
                        <BellRing className="h-5 w-5 text-primary" />
                        <h1 className="font-headline text-xl font-bold text-foreground">
                            Pengingat Pembayaran
                        </h1>
                    </div>
                </header>
                <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mendatang</CardTitle>
                            <CardDescription>Daftar tagihan dan pembayaran yang perlu segera diselesaikan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {upcomingReminders.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <CalendarCheck className="mx-auto h-12 w-12 text-green-500" />
                                    <p className="mt-4 font-semibold">Tidak ada tagihan mendatang.</p>
                                    <p className="text-sm">Semua pembayaran Anda sudah beres!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingReminders.map(reminder => (
                                        <ReminderItem key={reminder.id} reminder={reminder} onTogglePaid={handleTogglePaid} onEdit={() => { setEditingReminder(reminder); setIsFormOpen(true); }} onDelete={() => setReminderToDelete(reminder)} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {completedReminders.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>
                                    <h3 className="text-lg font-semibold">Riwayat Selesai ({completedReminders.length})</h3>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4">
                                        {completedReminders.map(reminder => (
                                            <ReminderItem key={reminder.id} reminder={reminder} onTogglePaid={handleTogglePaid} onEdit={() => { setEditingReminder(reminder); setIsFormOpen(true); }} onDelete={() => setReminderToDelete(reminder)} />
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}

                </main>
            </div>
            
            <Button 
                onClick={() => { setEditingReminder(null); setIsFormOpen(true); }}
                className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg z-40 md:bottom-6"
                size="icon"
                aria-label="Tambah Pengingat"
            >
                <PlusCircle className="h-6 w-6" />
            </Button>

            <AddReminderForm 
                isOpen={isFormOpen}
                onOpenChange={setIsFormOpen}
                reminderToEdit={editingReminder}
            />

            <AlertDialog open={!!reminderToDelete} onOpenChange={(open) => !open && setReminderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Pengingat?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Anda akan menghapus pengingat untuk "{reminderToDelete?.name}". Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                           Ya, Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
