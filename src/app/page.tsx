'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Dashboard } from '@/components/dashboard';
import { Transactions } from '@/components/transactions';
import { Reports } from '@/components/reports';
import { Goals } from '@/components/goals';
import { Settings } from '@/components/settings';

export type View = 'dashboard' | 'transactions' | 'reports' | 'goals' | 'settings';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <Transactions />;
      case 'reports':
        return <Reports />;
      case 'goals':
        return <Goals />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout activeView={activeView} setActiveView={setActiveView}>
      {renderView()}
    </AppLayout>
  );
}
