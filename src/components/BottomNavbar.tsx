
"use client"

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutGrid, Target, Landmark, CreditCard, Wallet, History } from 'lucide-react'

const navItems = [
    { href: '/dasbor', label: 'Dasbor', icon: LayoutGrid },
    { href: '/savings', label: 'Tujuan', icon: Target },
    { href: '/budget', label: 'Anggaran', icon: Landmark },
    { href: '/debts', label: 'Utang', icon: CreditCard },
    { href: '/wallets', label: 'Dompet', icon: Wallet },
    { href: '/history', label: 'Riwayat', icon: History },
]

export function BottomNavbar() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 w-full max-w-7xl left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 pb-safe pt-2 z-40 shadow-2xl">
            <div className="grid grid-cols-6 h-16 items-center max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href === '/history' && pathname.startsWith('/history'))
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 transition-all duration-300 px-1',
                                isActive 
                                    ? 'text-primary scale-110' 
                                    : 'text-slate-400 dark:text-slate-500 hover:text-primary transition-colors'
                            )}
                        >
                            <Icon className={cn("h-5 w-5")} />
                            <span className="text-[9px] font-extrabold uppercase tracking-tighter">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
