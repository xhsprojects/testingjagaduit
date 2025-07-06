
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, User, Palette, Bell, Trash2, ChevronRight, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount, updateUserProfile } from './actions';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Input } from '@/components/ui/input';

const SettingsItem = ({ icon, title, description, href, action }: { icon: React.ElementType, title: string, description: string, href?: string, action?: () => void }) => {
    const Component = href ? Link : 'div';
    const props = href ? { href } : { onClick: action, className: "cursor-pointer" };
    const Icon = icon;

    return (
        <Component {...props}>
            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary transition-colors">
                <Icon className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="flex-1">
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {href && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </div>
        </Component>
    );
};

export default function SettingsPage() {
    const { user, loading, idToken } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isSavingName, setIsSavingName] = React.useState(false);
    const [displayName, setDisplayName] = React.useState(user?.displayName || '');

    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if(user) {
            setDisplayName(user.displayName || '');
        }
    }, [user, loading, router]);

    const handleDeleteAccount = async () => {
        if (!idToken) {
            toast({ title: 'Sesi tidak valid', variant: 'destructive' });
            return;
        }
        setIsDeleting(true);
        const result = await deleteUserAccount(idToken);
        if (result.success) {
            toast({ title: 'Akun Dihapus', description: 'Akun Anda telah berhasil dihapus secara permanen.' });
            await signOut(auth); // Sign out the user on the client
            router.push('/login');
        } else {
            toast({ title: 'Gagal Menghapus Akun', description: result.message, variant: 'destructive' });
        }
        setIsDeleting(false);
    };
    
    const handleNameChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!idToken || !displayName || displayName === user?.displayName) return;
        setIsSavingName(true);
        const result = await updateUserProfile(idToken, displayName);
        if (result.success) {
            toast({ title: 'Sukses', description: result.message });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setIsSavingName(false);
    };

    if (loading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <h1 className="font-headline text-xl font-bold text-foreground flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-primary" />
                    Pengaturan
                </h1>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 pb-20">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><User /> Profil</CardTitle>
                    </CardHeader>
                    <form onSubmit={handleNameChange}>
                        <CardContent className="space-y-4">
                             <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <label htmlFor="displayName" className="text-sm font-medium">Nama Tampilan</label>
                                    <Input
                                        id="displayName"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSavingName || displayName === user.displayName}>
                                {isSavingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Simpan Perubahan Nama
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preferensi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <SettingsItem
                            icon={Palette}
                            title="Tampilan & Tema"
                            description="Ubah warna tema, buka lencana, dan lihat level Anda."
                            href="/achievements"
                        />
                        <SettingsItem
                            icon={Bell}
                            title="Notifikasi"
                            description="Lihat riwayat notifikasi Anda."
                            href="/notifications"
                        />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Akun</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer text-destructive">
                                    <Trash2 className="h-6 w-6 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-semibold">Hapus Akun</p>
                                        <p className="text-sm">Tindakan ini akan menghapus akun dan semua data Anda secara permanen. Tindakan ini tidak dapat dibatalkan.</p>
                                    </div>
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Apakah Anda Benar-Benar Yakin?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Ini adalah tindakan terakhir. Semua data Anda, termasuk anggaran, transaksi, dan prestasi akan dihapus selamanya. Ini tidak bisa dibatalkan.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Ya, Hapus Akun Saya
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
