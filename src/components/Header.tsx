
"use client"

import { Button } from "@/components/ui/button"
import { HandCoins, PlusCircle, LogOut, Gem, UserCog, Star, Trophy, BookMarked, Bell, BellRing, Settings, BookText, BookOpen } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { useAuth } from "@/context/AuthContext"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Badge } from "./ui/badge"

export default function Header() {
    const { user, isAdmin, isPremium, premiumExpiresAt, level, notifications } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/login');
    };
    
    const isLifetime = premiumExpiresAt && premiumExpiresAt.getFullYear() > 9000;
    const unreadCount = (notifications || []).filter(n => !n.isRead).length;

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
            <div className="flex items-center gap-2">
                <Link href="/" passHref>
                    <div className="flex items-center gap-2 cursor-pointer">
                        <HandCoins className="h-6 w-6 text-primary" />
                        <h1 className="font-headline text-xl font-bold text-foreground">Jaga Duit</h1>
                    </div>
                </Link>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                {user && (
                    <Link href="/notifications" passHref>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 justify-center rounded-full">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Badge>
                            )}
                            <span className="sr-only">Notifikasi</span>
                        </Button>
                    </Link>
                )}
                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex flex-col items-center gap-0.5 rounded-md p-1 transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-bold text-primary leading-none">LVL {level}</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem asChild>
                                <Link href="/reports">
                                    <BookMarked className="mr-2 h-4 w-4" />
                                     <span>Laporan Keuangan</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/tutorial">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                     <span>Panduan Aplikasi</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/reminders">
                                    <BellRing className="mr-2 h-4 w-4" />
                                     <span>Pengingat Bayar</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/achievements">
                                    <Trophy className="mr-2 h-4 w-4" />
                                     <span>Jejak Prestasi</span>
                                </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                                <Link href="/notes">
                                    <BookText className="mr-2 h-4 w-4" />
                                     <span>Catatan Pribadi</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                     <span>Pengaturan</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem asChild>
                                <Link href="/premium">
                                    <Gem className="mr-2 h-4 w-4 text-primary" />
                                     {isPremium ? (
                                        <span>Kelola Langganan</span>
                                     ) : (
                                        <span>Upgrade ke Premium</span>
                                     )}
                                </Link>
                            </DropdownMenuItem>
                            {isPremium && (
                                <DropdownMenuItem disabled>
                                    <Star className="mr-2 h-4 w-4 text-yellow-400" />
                                    <span>
                                        {isLifetime ? 'Premium Seumur Hidup' : `Aktif s.d. ${premiumExpiresAt?.toLocaleDateString('id-ID')}`}
                                    </span>
                                </DropdownMenuItem>
                             )}
                             {isAdmin && (
                                <DropdownMenuItem asChild>
                                    <Link href="/admin">
                                        <UserCog className="mr-2 h-4 w-4" />
                                        <span>Dasbor Admin</span>
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Keluar</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    )
}
