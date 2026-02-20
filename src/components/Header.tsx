"use client"

import * as React from 'react'
import { Button } from "@/components/ui/button"
import { HandCoins, Bell, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
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
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/login');
    };
    
    const unreadCount = (notifications || []).filter(n => !n.isRead).length;

    return (
        <header className="fixed top-0 w-full z-50 bg-background/90 dark:bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <HandCoins className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold tracking-tight text-foreground dark:text-white">Jaga Duit</h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-muted"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    {theme === 'dark' ? <Sun className="h-5 w-5 text-slate-300" /> : <Moon className="h-5 w-5 text-slate-600" />}
                    <span className="sr-only">Toggle theme</span>
                </Button>

                <Link href="/notifications" passHref>
                    <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted">
                        <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                        <span className="sr-only">Notifikasi</span>
                    </Button>
                </Link>

                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center focus:outline-none ml-1 group">
                                <div className="relative">
                                    <Avatar className="h-9 w-9 shadow-lg shadow-primary/30 border-2 border-transparent group-hover:border-primary/50 transition-all">
                                        <AvatarImage src={user.photoURL || ''} />
                                        <AvatarFallback className="bg-primary text-white font-bold text-sm">
                                            {user.displayName?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Badge className="absolute -bottom-1 -right-1 h-4 px-1 text-[8px] font-bold border-2 border-background">
                                        {level}
                                    </Badge>
                                </div>
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
                                <Link href="/settings">Pengaturan Profil</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/premium">
                                    {isPremium ? 'Kelola Premium' : 'Upgrade ke Premium'}
                                </Link>
                            </DropdownMenuItem>
                            {isAdmin && (
                                <DropdownMenuItem asChild>
                                    <Link href="/admin">Dasbor Admin</Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                                Keluar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    )
}
