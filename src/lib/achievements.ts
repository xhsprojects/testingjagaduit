
import type { Badge } from './types';

// A more gradual and extended level progression.
// The XP required to reach level L is Threshold(L-1).
// XP needed to advance from L to L+1 is 100 * L.
export const LEVEL_THRESHOLDS = [
    0,      // Level 1
    100,    // Level 2
    300,    // Level 3
    600,    // Level 4
    1000,   // Level 5
    1500,   // Level 6
    2100,   // Level 7
    2800,   // Level 8
    3600,   // Level 9
    4500,   // Level 10
    5500,   // Level 11
    6600,   // Level 12
    7800,   // Level 13
    9100,   // Level 14
    10500,  // Level 15
    12000,  // Level 16
    13600,  // Level 17
    15300,  // Level 18
    17100,  // Level 19
    19000,  // Level 20
    21000,  // Level 21
    23100,  // Level 22
    25300,  // Level 23
    27600,  // Level 24
    30000,  // Level 25
    32500,  // Level 26
    35100,  // Level 27
    37800,  // Level 28
    40600,  // Level 29
    43500,  // Level 30
];


export function getLevelFromXp(xp: number): number {
    // LEVEL_THRESHOLDS is 0-indexed for levels 1+
    // Example: LEVEL_THRESHOLDS[0] is for level 1, LEVEL_THRESHOLDS[1] is for level 2...
    // A user at level 1 has XP between LEVEL_THRESHOLDS[0] and LEVEL_THRESHOLDS[1]-1
    let level = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            level = i + 1; // Level is 1-based, index is 0-based
            break;
        }
    }
    return level;
}

export const allBadges: Badge[] = [
  {
    id: 'first-step',
    name: 'Langkah Pertama',
    description: 'Anda berhasil mengatur anggaran bulanan untuk pertama kalinya.',
    icon: 'Award',
  },
  {
    id: 'first-expense',
    name: 'Mulai Mencatat',
    description: 'Mencatat transaksi pengeluaran pertama Anda.',
    icon: 'Star',
  },
  {
    id: 'ten-expenses',
    name: 'Pencatat Junior',
    description: 'Berhasil mencatat 10 transaksi pengeluaran.',
    icon: 'Star',
  },
  {
    id: 'fifty-expenses',
    name: 'Pencatat Senior',
    description: 'Berhasil mencatat 50 transaksi pengeluaran.',
    icon: 'Trophy',
  },
   {
    id: 'hundred-expenses',
    name: 'Master Pencatat',
    description: 'Berhasil mencatat 100 transaksi pengeluaran. Anda luar biasa!',
    icon: 'Trophy',
  },
  {
    id: 'first-goal',
    name: 'Punya Impian',
    description: 'Membuat tujuan menabung untuk pertama kalinya.',
    icon: 'Goal',
  },
  {
    id: 'goal-conqueror',
    name: 'Penakluk Tujuan',
    description: 'Berhasil menyelesaikan sebuah tujuan menabung.',
    icon: 'Sparkles',
  },
  {
    id: 'debt-slayer',
    name: 'Penakluk Utang',
    description: 'Berhasil melunasi sebuah utang.',
    icon: 'ShieldCheck',
  },
  {
    id: 'super-saver',
    name: 'Raja Hemat',
    description: 'Menyelesaikan periode anggaran dengan sisa dana lebih dari 20% pemasukan.',
    icon: 'PiggyBank',
  },
  {
    id: 'investor-rookie',
    name: 'Investor Muda',
    description: 'Melakukan setoran pertama ke kategori "Tabungan & Investasi".',
    icon: 'CandlestickChart',
  },
  {
    id: 'ai-consultant',
    name: 'Konsultan AI',
    description: 'Menggunakan salah satu fitur analisis AI untuk pertama kalinya.',
    icon: 'BrainCircuit',
  },
   {
    id: 'anniversary',
    name: 'Setia Setahun',
    description: 'Menggunakan Jaga Duit selama satu tahun. Terima kasih!',
    icon: 'CakeSlice',
    isSecret: true,
  },
];
