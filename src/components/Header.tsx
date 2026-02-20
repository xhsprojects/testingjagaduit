
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
    
    const isLifetime = premiumExpiresAt && premiumExpiresAt.getFullYear() > 9000;
    const unreadCount = (notifications || []).filter(n => !n.isRead).length;

    return (
        <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                    <HandCoins className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">Jaga Duit</h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-accent"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    <span className="sr-only">Toggle theme</span>
                </Button>

                <Link href="/notifications" passHref>
                    <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-accent">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full animate-pulse"></span>
                        )}
                        <span className="sr-only">Notifikasi</span>
                    </Button>
                </Link>

                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 focus:outline-none ml-1 group">
                                <div className="relative">
                                    <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary/30 transition-all shadow-sm">
                                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                            {user.displayName?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Badge className="absolute -bottom-1 -right-1 h-4 px-1 text-[8px] font-bold border-2 border-background">
                                        LVL {level}
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
