'use client';

import type { Dispatch, SetStateAction, ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/icons';
import { useAppData } from '@/contexts/app-data-context';
import type { View } from '@/app/page';
import {
  LayoutDashboard,
  Wallet,
  AreaChart,
  Target,
  Settings as SettingsIcon,
  PanelLeft,
} from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

interface AppLayoutProps {
  children: ReactNode;
  activeView: View;
  setActiveView: Dispatch<SetStateAction<View>>;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: Wallet },
  { id: 'reports', label: 'Reports', icon: AreaChart },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function AppLayout({ children, activeView, setActiveView }: AppLayoutProps) {
  const { profile } = useAppData();
  const isMobile = useIsMobile();

  const sidebarContent = (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Logo className="size-8 text-primary" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">DuitSensei</h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => setActiveView(item.id as View)}
                isActive={activeView === item.id}
                className="w-full justify-start"
                tooltip={item.label}
              >
                <item.icon className="size-5" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{profile.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-medium">{profile.name}</span>
          </div>
        </div>
      </SidebarFooter>
    </>
  );

  if (isMobile) {
    return (
      <Sheet>
        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <div className="flex items-center gap-2">
                <Logo className="size-6 text-primary" />
                <h1 className="text-lg font-bold">DuitSensei</h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
        <SheetContent side="left" className="flex flex-col bg-sidebar p-0 w-[280px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        {sidebarContent}
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
