
import type { IconName } from '@/lib/icons';

export type Category = {
  id: string;
  name: string;
  budget: number;
  icon: IconName;
  isEssential?: boolean;
  isDebtCategory?: boolean;
};

export type Wallet = {
  id: string;
  name: string;
  icon: IconName;
  initialBalance: number;
};

export type Asset = {
  id: string;
  name: string;
  value: number;
  type: 'Properti' | 'Investasi' | 'Kas & Setara Kas' | 'Lainnya';
};

export type Income = {
  id: string;
  date: Date;
  amount: number; // Final amount (baseAmount - adminFee)
  baseAmount: number;
  adminFee?: number;
  notes?: string;
  walletId?: string;
};

export type Expense = {
  id:string;
  date: Date;
  categoryId: string;
  amount: number; // Final amount (baseAmount + adminFee)
  baseAmount: number;
  adminFee?: number;
  notes?: string;
  savingGoalId?: string;
  debtId?: string;
  walletId?: string;
};

export type RecurringTransaction = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number; // Final amount
  baseAmount: number;
  adminFee?: number;
  categoryId?: string; // Only for expenses
  walletId: string;
  dayOfMonth: number; // 1-31
  notes?: string;
  lastAdded: any | null; // Firestore Timestamp
};

export type SavingGoal = {
  id: string;
  name: string;
  targetAmount: number;
};

export type Debt = {
  id: string;
  name: string;
  totalAmount: number;
  interestRate: number;
  minimumPayment: number;
};

export type BudgetPeriod = {
  income: number;
  incomes?: Income[];
  categories: Category[];
  expenses: Expense[];
  periodStart: string; // ISO date string
  periodEnd?: string;   // ISO date string, optional for the current period
  // Add summary fields for archive
  totalIncome?: number;
  totalExpenses?: number;
  remainingBudget?: number;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  isSecret?: boolean;
};

export type UserAchievement = {
  badgeId: string;
  unlockedAt: any; // Firestore Timestamp
};

export type Reminder = {
  id: string;
  name: string;
  amount: number;
  dueDate: any; // Firestore Timestamp
  isPaid: boolean;
  notes?: string;
};

export type AppNotification = {
  id: string;
  type: 'reminder' | 'subscription' | 'broadcast' | 'recurring_transaction';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: any; // Firestore Timestamp
  link?: string;
  relatedId?: string;
};

export type PersonalNote = {
  id: string;
  title: string;
  content: string;
  updatedAt: any; // Firestore Timestamp
};
