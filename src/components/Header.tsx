
"use client"

import * as React from 'react'
import { Button } from "@/components/ui/button"
import { HandCoins, Bell, Moon, Sun, User } from "lucide-react"
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
    const { user, isAdmin, isPremium, level, notifications } = useAuth();
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/login');
    };
    
    const unreadCount = (notifications || []).filter(n => !n.isRead).length;

    return (
        <header className="fixed top-0 w-full z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/5">
                        <HandCoins className="h-5 w-5" />
                    </div>
                    <h1 className="font-extrabold text-lg tracking-tight text-slate-800 dark:text-white">Jaga Duit</h1>
                </div>

                <div className="flex items-center space-x-2 md:space-x-4">
                    <button 
                        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary transition-all duration-300"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>

                    <Link href="/notifications" passHref>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary transition-all duration-300 relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-950"></span>
                            )}
                        </button>
                    </Link>

                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center focus:outline-none ml-1 group">
                                    <div className="relative">
                                        <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 transition-all group-hover:border-primary/50 shadow-sm">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-xs text-slate-500 dark:text-slate-400">{user.displayName?.charAt(0) || 'U'}</span>
                                            )}
                                        </div>
                                        <Badge className="absolute -bottom-1.5 -right-1.5 h-4 px-1 text-[8px] font-extrabold bg-primary border-2 border-white dark:border-slate-950 text-white rounded-lg shadow-sm">
                                            {level}
                                        </Badge>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 rounded-2xl p-2" align="end" forceMount>
                                <DropdownMenuLabel className="font-bold p-3">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-xs uppercase tracking-widest text-slate-400">Akun Saya</p>
                                        <p className="text-sm font-extrabold leading-none text-slate-800 dark:text-white">{user.displayName}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="mx-2" />
                                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                    <Link href="/settings" className="flex items-center gap-2">Pengaturan Profil</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                                    <Link href="/premium" className="flex items-center gap-2">
                                        {isPremium ? 'Kelola Premium' : 'Upgrade ke Premium'}
                                    </Link>
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-primary font-bold">
                                        <Link href="/admin">Dasbor Admin</Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="mx-2" />
                                <DropdownMenuItem onClick={handleSignOut} className="rounded-xl cursor-pointer text-red-500 focus:text-red-500 font-extrabold uppercase text-[10px] tracking-[0.2em] p-3">
                                    Keluar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </header>
    )
}
