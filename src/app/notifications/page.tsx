
"use client"

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import type { AppNotification } from '@/lib/types'
import { format, formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Bell, CheckCheck, CalendarClock, Gem, Repeat, Megaphone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { markAllNotificationsAsRead } from './actions'

const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (data?.toDate) {
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  if (typeof data === 'object' && data !== null && !data._seconds) {
    const newObj: { [key: string]: any } = {};
    for (const key of Object.keys(data)) {
      newObj[key] = convertTimestamps(data[key]);
    }
    return newObj;
  }
  return data;
};

const NotificationItem = ({ notification }: { notification: AppNotification }) => {
    
    const getNotificationDetails = () => {
        switch (notification.type) {
            case 'reminder': return { icon: CalendarClock, color: 'text-amber-500' };
            case 'subscription': return { icon: Gem, color: 'text-primary' };
            case 'broadcast': return { icon: Megaphone, color: 'text-purple-500' };
            case 'recurring_transaction': return { icon: Repeat, color: 'text-blue-500' };
            default: return { icon: Bell, color: 'text-muted-foreground' };
        }
    }

    const { icon: Icon, color } = getNotificationDetails();
    const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: idLocale });

    return (
        <Link href={notification.link || '#'} className="block w-full">
            <div className={cn("flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-secondary transition-colors", notification.isRead && 'opacity-60 bg-secondary/50')}>
                <div className={cn("p-2 rounded-full mt-1", notification.isRead ? 'bg-muted' : 'bg-primary/10')}>
                    <Icon className={cn("h-5 w-5", notification.isRead ? 'text-muted-foreground' : color)} />
                </div>
                <div className="flex-1 grid gap-1">
                    <p className="font-semibold">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                </div>
            </div>
        </Link>
    );
};


export default function NotificationsPage() {
    const { user, idToken, loading: authLoading, notifications } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (!authLoading && user) {
            setIsLoading(false);
        }
    }, [user, authLoading, router]);
    
    const handleMarkAllRead = async () => {
        if (!idToken) {
            toast({ title: 'Sesi tidak valid', variant: 'destructive' });
            return;
        }
        const result = await markAllNotificationsAsRead(idToken);
        if (result.success) {
            toast({ title: 'Sukses', description: result.message });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
    }

    const unreadNotifications = (notifications || []).filter(n => !n.isRead);
    const readNotifications = (notifications || []).filter(n => n.isRead);

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="flex items-center gap-3 text-lg font-semibold text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Memuat Notifikasi...</span>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
                <div className='flex items-center gap-2'>
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Kembali</span>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        <h1 className="font-headline text-xl font-bold text-foreground">
                            Notifikasi
                        </h1>
                    </div>
                </div>
                 {unreadNotifications.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Tandai Semua Dibaca
                    </Button>
                )}
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Notifikasi Belum Dibaca</CardTitle>
                        <CardDescription>Ini adalah pemberitahuan penting yang memerlukan perhatian Anda.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {unreadNotifications.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                <CheckCheck className="mx-auto h-12 w-12 text-green-500" />
                                <p className="mt-4 font-semibold">Semua notifikasi sudah dibaca!</p>
                                <p className="text-sm">Tidak ada notifikasi baru untuk saat ini.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {unreadNotifications.map(notification => (
                                    <NotificationItem key={notification.id} notification={notification} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                 {readNotifications.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Notifikasi Terdahulu</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-4">
                                {readNotifications.slice(0, 10).map(notification => (
                                    <NotificationItem key={notification.id} notification={notification} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                 )}
            </main>
        </div>
    );
}
