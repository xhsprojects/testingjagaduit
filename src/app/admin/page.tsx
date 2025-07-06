
// src/app/admin/page.tsx
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, UserCog, Loader2, MoreVertical, Search, Trash2, Wrench, Server, BellRing, BellDot, MessageSquare } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { updateSubscription, setMaintenanceMode, triggerDailyReminders, sendTestNotification, sendBroadcastNotification } from './actions';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';


interface AdminAppUser {
    id: string; 
    email?: string;
    displayName?: string;
    photoURL?: string;
    premiumExpiresAt?: { toDate: () => Date };
}

type ActionType = 'add_month' | 'add_year' | 'set_lifetime' | 'stop_subscription';

const UserRow = ({ 
    user, 
    isSelected, 
    onSelectionChange 
}: { 
    user: AdminAppUser;
    isSelected: boolean;
    onSelectionChange: (userId: string, checked: boolean) => void;
}) => {
    const { idToken } = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isConfirmingStop, setIsConfirmingStop] = React.useState(false);
    const { toast } = useToast();

    const expiryDate = user.premiumExpiresAt?.toDate();
    const isCurrentlyPremium = expiryDate ? expiryDate > new Date() : false;
    const isLifetime = expiryDate && expiryDate.getFullYear() > 9000;

    const handleAction = async (action: ActionType) => {
        setIsLoading(true);
        if (!idToken) {
            toast({
                title: 'Otentikasi Gagal',
                description: 'Token otentikasi tidak ditemukan. Silakan muat ulang halaman.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }

        try {
            const result = await updateSubscription(user.id, idToken, action);
            if (result.success) {
                toast({
                    title: 'Sukses',
                    description: `${result.message} untuk ${user.email}.`,
                });
            } else {
                 toast({
                    title: 'Gagal',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            console.error("Failed to update subscription (unhandled exception):", error);
            toast({
                title: 'Error Tak Terduga',
                description: 'Terjadi error yang tidak dapat ditangani. Cek konsol browser.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            setIsConfirmingStop(false);
        }
    };

    return (
        <>
            <TableRow>
                 <TableCell>
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectionChange(user.id, !!checked)}
                        aria-label={`Pilih pengguna ${user.email}`}
                    />
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.photoURL || ''} />
                            <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{user.displayName || 'No Name'}</div>
                    </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                    <Badge variant={isCurrentlyPremium ? 'default' : 'secondary'}>
                        {isLifetime ? 'Lifetime' : (isCurrentlyPremium ? 'Premium' : 'Standard')}
                    </Badge>
                    {isCurrentlyPremium && !isLifetime && expiryDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Aktif s.d. {expiryDate.toLocaleDateString('id-ID')}
                        </p>
                    )}
                </TableCell>
                <TableCell className="text-right">
                    {isLoading ? (
                         <Button disabled size="sm">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Memproses...
                        </Button>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleAction('add_month')}>Perpanjang 1 Bulan</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction('add_year')}>Perpanjang 1 Tahun</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction('set_lifetime')}>Jadikan Lifetime</DropdownMenuItem>
                                {isCurrentlyPremium && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setIsConfirmingStop(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Hentikan Langganan
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </TableCell>
            </TableRow>
            <AlertDialog open={isConfirmingStop} onOpenChange={setIsConfirmingStop}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hentikan langganan untuk {user.email}?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Tindakan ini akan segera mencabut akses premium pengguna dan tidak dapat dibatalkan. Status mereka akan kembali ke Standard. Apakah Anda yakin?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('stop_subscription')} className={buttonVariants({ variant: 'destructive' })}>
                           Ya, Hentikan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const AppSettings = () => {
    const { isMaintenanceMode, idToken } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleMaintenanceToggle = async (checked: boolean) => {
        setIsSubmitting(true);
        if (!idToken) {
            toast({ title: "Otentikasi Gagal", variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await setMaintenanceMode(checked, idToken);
            if (result.success) {
                toast({ title: "Sukses", description: result.message });
            } else {
                toast({ title: "Gagal", description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Pengaturan Aplikasi
                </CardTitle>
                <CardDescription>
                    Kelola pengaturan global untuk aplikasi Jaga Duit.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="maintenance-mode" className="text-base font-medium">Mode Perbaikan</Label>
                        <p className="text-sm text-muted-foreground">
                            Jika aktif, hanya admin yang bisa mengakses aplikasi.
                        </p>
                    </div>
                    <Switch
                        id="maintenance-mode"
                        checked={isMaintenanceMode}
                        onCheckedChange={handleMaintenanceToggle}
                        disabled={isSubmitting}
                        aria-label="Maintenance mode"
                    />
                </div>
            </CardContent>
        </Card>
    );
};

const ReminderTester = () => {
    const { idToken } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleTriggerReminders = async () => {
        setIsSubmitting(true);
        if (!idToken) {
            toast({ title: "Otentikasi Gagal", variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        
        try {
            const result = await triggerDailyReminders(idToken);
            if (result.success) {
                toast({ 
                    title: "Proses Selesai", 
                    description: `Notifikasi Terkirim: ${result.notificationsSent}. Pengguna Dicek: ${result.usersChecked}. Dengan Token: ${result.usersWithToken}. Punya Tagihan: ${result.usersWithDueReminders}. Errors: ${result.errors.length}` 
                });
            } else {
                 toast({ title: "Gagal", description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <BellRing className="h-5 w-5" />
                    Uji Coba Flow Pengingat
                </CardTitle>
                <CardDescription>
                    Jalankan flow pengiriman notifikasi pengingat secara manual. Ini akan memeriksa semua pengguna dan mengirim notifikasi untuk tagihan yang jatuh tempo besok.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button onClick={handleTriggerReminders} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Jalankan Flow Pengingat
                </Button>
            </CardFooter>
        </Card>
    );
}

const DirectNotificationTester = () => {
    const { idToken } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSendTest = async () => {
        setIsSubmitting(true);
        if (!idToken) {
            toast({ title: "Otentikasi Gagal", variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await sendTestNotification(idToken);
            if (result.success) {
                toast({ title: "Sukses", description: result.message });
            } else {
                toast({ title: "Gagal", description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <BellDot className="h-5 w-5" />
                    Tes Notifikasi Langsung
                </CardTitle>
                <CardDescription>
                    Kirim notifikasi tes langsung ke perangkat Anda untuk memastikan sistem berfungsi. Ini mengabaikan logika pengingat.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                 <Button onClick={handleSendTest} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kirim Notifikasi Tes
                </Button>
            </CardFooter>
        </Card>
    );
}

const BroadcastSender = ({ selectedUserIds }: { selectedUserIds: string[] }) => {
    const { idToken } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [title, setTitle] = React.useState("");
    const [body, setBody] = React.useState("");
    const [link, setLink] = React.useState("");
    const hasSelection = selectedUserIds.length > 0;

    const handleSendBroadcast = async () => {
        if (!title || !body) {
            toast({ title: "Input Tidak Lengkap", description: "Judul dan isi pesan harus diisi.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        if (!idToken) {
            toast({ title: "Otentikasi Gagal", variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await sendBroadcastNotification(idToken, title, body, link, hasSelection ? selectedUserIds : undefined);
            if (result.success) {
                toast({ 
                    title: "Broadcast Terkirim", 
                    description: `Pesan berhasil dikirim ke ${result.notificationsSent} pengguna.`
                });
                setTitle("");
                setBody("");
                setLink("");
            } else {
                 toast({ title: "Gagal Mengirim", description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Kirim Broadcast Notifikasi
                </CardTitle>
                <CardDescription>
                    Kirim pesan notifikasi kustom ke semua pengguna atau pengguna terpilih. Gunakan dengan bijak.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <Label htmlFor="broadcast-title">Judul Notifikasi</Label>
                    <Input 
                        id="broadcast-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Contoh: Pembaruan Aplikasi!"
                        disabled={isSubmitting}
                    />
                 </div>
                 <div>
                    <Label htmlFor="broadcast-body">Isi Pesan</Label>
                    <Textarea 
                        id="broadcast-body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Contoh: Kami baru saja menambahkan fitur pelacakan kekayaan bersih. Yuk, coba sekarang!"
                        disabled={isSubmitting}
                    />
                 </div>
                 <div>
                    <Label htmlFor="broadcast-link">Tautan Kustom (Opsional)</Label>
                    <Input 
                        id="broadcast-link"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="Contoh: /savings atau /history"
                        disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Jika kosong, akan mengarah ke halaman utama.</p>
                 </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSendBroadcast} disabled={isSubmitting || !title || !body}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {hasSelection ? `Kirim ke ${selectedUserIds.length} Pengguna Terpilih` : 'Kirim ke Semua Pengguna'}
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function AdminPage() {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = React.useState<AdminAppUser[]>([]);
    const [isDataLoading, setIsDataLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedUserIds, setSelectedUserIds] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        if (!loading && !isAdmin) {
            router.push('/');
        }
    }, [user, isAdmin, loading, router]);
    
    React.useEffect(() => {
        if (!isAdmin) return;

        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData: AdminAppUser[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: doc.id, ...doc.data() } as AdminAppUser);
            });
            setUsers(usersData);
            setIsDataLoading(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            setIsDataLoading(false);
        });

        return () => unsubscribe();
    }, [isAdmin]);

    const filteredUsers = React.useMemo(() => {
        if (!searchQuery) return users;
        return users.filter(u => 
            u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    const handleUserSelectionChange = (userId: string, isSelected: boolean) => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(userId);
            } else {
                newSet.delete(userId);
            }
            return newSet;
        });
    };

    const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
        } else {
            setSelectedUserIds(new Set());
        }
    };


    if (loading || !isAdmin || isDataLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat Dasbor Admin...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Admin Dashboard
                    </h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 space-y-6 pb-20">
                <AppSettings />
                <BroadcastSender selectedUserIds={Array.from(selectedUserIds)} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DirectNotificationTester />
                    <ReminderTester />
                </div>
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>
                                    Lihat, cari, dan kelola status premium untuk semua pengguna terdaftar.
                                </CardDescription>
                            </div>
                            <div className="relative w-full sm:w-auto sm:max-w-xs">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Cari pengguna..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 px-4">
                                        <Checkbox
                                            checked={
                                                filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length
                                                    ? true
                                                    : selectedUserIds.size > 0
                                                    ? 'indeterminate'
                                                    : false
                                            }
                                            onCheckedChange={handleSelectAllChange}
                                            aria-label="Pilih semua"
                                        />
                                    </TableHead>
                                    <TableHead>Pengguna</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map((u) => (
                                        <UserRow 
                                            key={u.id} 
                                            user={u}
                                            isSelected={selectedUserIds.has(u.id)}
                                            onSelectionChange={handleUserSelectionChange}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            Pengguna tidak ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
