
import type { Metadata } from 'next';
import LandingClientPage from './client';

export const metadata: Metadata = {
  title: 'Jaga Duit: Aplikasi Keuangan & Budget Cerdas Berbasis AI',
  description: 'Kendalikan keuangan Anda dengan Jaga Duit. Aplikasi manajemen finansial pribadi yang didukung AI untuk membantu Anda mengatur anggaran, melacak pengeluaran, dan mencapai tujuan finansial.',
  alternates: {
    canonical: '/landing',
  },
};

export default function LandingPage() {
  return <LandingClientPage />;
}
