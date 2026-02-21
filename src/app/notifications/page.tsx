"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Bell, CheckCheck, CalendarClock, Gem, Repeat, Megaphone, Trash2, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { markAllNotificationsAsRead, markNotificationAsRead, deleteReadNotifications } from './actions'
import { type AppNotification } from '@/lib/types'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

const NotificationItem = ({ notification, onNotificationClick }: { 
    notification: AppNotification; 
    onNotificationClick: (notification: AppNotification) => void;
}) => {
    const getIcon = () => {
        switch (notification.type) {
            case 'reminder': return { icon: CalendarClock, color: 'bg-amber-50 text-amber-500' };
            case 'subscription': return { icon: Gem, color: 'bg-primary/10 text-primary' };
            case 'broadcast': return { icon: Megaphone, color: 'bg-purple-50 text-purple-500' };
            case 'recurring_transaction': return { icon: Repeat, color: 'bg-blue-50 text-blue-500' };
            default: return { icon: Bell, color: 'bg-slate-100 text-slate-400' };
        }
    }
    const { icon: Icon, color } = getIcon();

    return (
        <div 
            onClick={() => onNotificationClick(notification)}
            className={cn(
                "flex items-center gap-4 py-4 border-b last:border-b-0 border-slate-50 dark:border-slate-800/50 cursor-pointer group transition-all",
                notification.isRead && "opacity-50"
            )}
        >
            <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105", color)}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate pr-4">{notification.title}</h4>
                    {!notification.isRead && <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>}
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1 mb-1">{notification.body}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">
                    {format(notification.createdAt.toDate(), "d MMM • HH:mm", { locale: idLocale })}
                </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
        </div>
    );
};

export default function NotificationsPage() {
    const { user, idToken, loading: authLoading, notifications } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    if (authLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!user) { router.push('/login'); return null; }

    const handleNotificationClick = async (n: AppNotification) => {
        if (idToken && !n.isRead) await markNotificationAsRead(idToken, n.id);
        if (n.link) router.push(n.link);
    }

    const unread = (notifications || []).filter(n => !n.isRead);
    const read = (notifications || []).filter(n => n.isRead);

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full -ml-2 text-slate-400"><ArrowLeft className="h-5 w-5" /></Button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Pusat Notifikasi</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Informasi Akun Anda</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-primary rounded-full" onClick={async () => idToken && await markAllNotificationsAsRead(idToken)} title="Tandai semua dibaca"><CheckCheck className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon" className="text-rose-500 rounded-full" onClick={async () => idToken && await deleteReadNotifications(idToken)} title="Hapus yang sudah dibaca"><Trash2 className="h-5 w-5"/></Button>
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-3xl mx-auto w-full space-y-10">
                <section>
                    <div className="px-1 mb-4 flex justify-between items-center">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">PEMBERITAHUAN BARU</h2>
                        <span className="text-[9px] font-black bg-primary text-white px-2 py-0.5 rounded-full">{unread.length}</span>
                    </div>
                    <Card className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border-none">
                        {unread.length > 0 ? (
                            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {unread.map(n => <NotificationItem key={n.id} notification={n} onNotificationClick={handleNotificationClick} />)}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <CheckCheck className="h-10 w-10 mx-auto text-slate-200 dark:text-slate-800 mb-3" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Semua notifikasi sudah dibaca.</p>
                            </div>
                        )}
                    </Card>
                </section>

                {read.length > 0 && (
                    <section>
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-4">RIWAYAT TERDAHULU</h2>
                        <Card className="bg-transparent border-none shadow-none p-0">
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {read.slice(0, 15).map(n => <NotificationItem key={n.id} notification={n} onNotificationClick={handleNotificationClick} />)}
                            </div>
                        </Card>
                    </section>
                )}
            </main>
        </div>
    );
}