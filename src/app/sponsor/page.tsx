
import type { Metadata } from 'next';
import SponsorClientPage from './client';

export const metadata: Metadata = {
  title: 'Sponsor Jaga Duit - Jangkau Audiens Finansial yang Tepat',
  description: 'Bermitra dengan Jaga Duit untuk menjangkau audiens yang cerdas secara finansial di Indonesia. Pelajari peluang sponsor dan kemitraan untuk merek Anda.',
  keywords: [
    'sponsor startup',
    'kemitraan startup fintech',
    'sponsorship aplikasi keuangan',
    'iklan di aplikasi finansial',
    'Jaga Duit partnership',
    'menjangkau audiens finansial',
    'kerjasama merek',
    'marketing aplikasi',
    'audiens melek finansial',
    'kolaborasi merek indonesia',
    'brand placement',
    'native advertising',
    'digital marketing fintech',
    'sponsorship opportunity indonesia',
  ],
  alternates: {
    canonical: '/sponsor',
  },
};

export default function SponsorPage() {
  return <SponsorClientPage />;
}
