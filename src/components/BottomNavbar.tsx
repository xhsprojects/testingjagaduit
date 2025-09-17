
"use client"

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutGrid, CreditCard, Target, History, Landmark, Wallet, Tag } from 'lucide-react'

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
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:bottom-4 md:left-1/2 md:w-auto md:translate-x-[-50%] md:rounded-full md:border md:shadow-lg">
            <div className="flex h-16 items-center justify-around md:justify-center md:gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 text-xs font-medium w-16 h-full transition-colors md:h-auto md:w-auto md:rounded-full md:px-4 md:py-2 md:flex-row md:gap-2',
                                isActive 
                                    ? 'text-primary md:bg-primary md:text-primary-foreground' 
                                    : 'text-muted-foreground hover:text-foreground md:hover:bg-accent'
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="md:block">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
