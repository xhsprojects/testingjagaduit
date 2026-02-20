
"use client"

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutGrid, CreditCard, Target, History, Landmark, Wallet } from 'lucide-react'

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
        <nav className="fixed bottom-0 w-full bg-background border-t border-border/50 pb-safe pt-2 px-4 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center max-w-lg mx-auto pb-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href === '/history' && pathname.startsWith('/history'))
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 transition-all duration-300 px-2 py-1 rounded-xl',
                                isActive 
                                    ? 'text-primary' 
                                    : 'text-muted-foreground hover:text-primary/70'
                            )}
                        >
                            <Icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                            <span className="text-[10px] font-bold tracking-tight uppercase">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
