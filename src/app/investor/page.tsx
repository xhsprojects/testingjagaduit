
import type { Metadata } from 'next';
import InvestorClientPage from './client';

export const metadata: Metadata = {
  title: 'Investasi di Jaga Duit - Bentuk Masa Depan Keuangan Personal',
  description: 'Jaga Duit mencari mitra investasi untuk mengakselerasi pertumbuhan dan merevolusi manajemen keuangan pribadi di Asia Tenggara. Temukan visi, traksi, dan peluang investasi kami.',
  keywords: [
    'investasi startup teknologi',
    'investasi fintech',
    'pendanaan Jaga Duit',
    'peluang investasi saas',
    'investasi seed indonesia',
    'modal ventura',
    'angel investor',
  ],
  alternates: {
    canonical: '/investor',
  },
};

export default function InvestorPage() {
  return <InvestorClientPage />;
}
