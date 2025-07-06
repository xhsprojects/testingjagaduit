export type Transaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description?: string;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
};

export type Profile = {
  name: string;
  currency: string;
};

export type View = 'dashboard' | 'transactions' | 'reports' | 'goals' | 'settings';
