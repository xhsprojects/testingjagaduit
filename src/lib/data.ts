
import type { Category, Expense, Wallet } from '@/lib/types';

export const presetCategories: Omit<Category, 'id' | 'budget'>[] = [
  { name: 'Makan Harian', icon: 'UtensilsCrossed' },
  { name: 'Kebutuhan Lain', icon: 'ShoppingBasket' },
  { name: 'Pendidikan', icon: 'GraduationCap' },
  { name: 'Dana Darurat', icon: 'ShieldAlert' },
  { name: 'Main / Hiburan', icon: 'Gamepad2' },
  { name: 'Untuk Keluarga', icon: 'HeartHandshake' },
  { name: 'Transfer Antar Dompet', icon: 'ArrowLeftRight', isEssential: true },
  { name: 'Pembayaran Utang', icon: 'CreditCard', isEssential: true, isDebtCategory: true },
  { name: 'Tabungan & Investasi', icon: 'PiggyBank', isEssential: true },
];

export const presetWallets: Omit<Wallet, 'id' | 'initialBalance'>[] = [
  { name: 'Tunai', icon: 'Banknote' },
  { name: 'Rekening Bank', icon: 'Landmark' },
];

export const initialExpenses: Expense[] = [];
