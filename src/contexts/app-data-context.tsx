'use client';

import { createContext, useContext, ReactNode } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { Transaction, Goal, Profile } from '@/lib/types';

interface AppDataContextType {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  profile: Profile;
  setProfile: (profile: Profile) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [goals, setGoals] = useLocalStorage<Goal[]>('goals', []);
  const [profile, setProfile] = useLocalStorage<Profile>('profile', {
    name: 'User',
    currency: '$',
  });

  const value = {
    transactions,
    setTransactions,
    goals,
    setGoals,
    profile,
    setProfile,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
