
import type { Metadata } from 'next';
import PremiumClientPage from './client';

export const metadata: Metadata = {
  title: 'Paket Premium Jaga Duit',
  description: 'Upgrade ke Jaga Duit Premium untuk membuka semua fitur AI canggih seperti peramalan anggaran, analisis laporan, dan chatbot keuangan pribadi.',
  alternates: {
    canonical: '/premium',
  },
};

export default function PremiumPage() {
  return <PremiumClientPage />;
}
