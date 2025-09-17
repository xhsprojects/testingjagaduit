
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
    'startup indonesia cari investor',
    'investasi tahap awal',
    'pitch deck fintech',
    'fintech indonesia',
    'peluang investasi asia tenggara',
    'startup keuangan',
    'early stage investment',
    'VC funding',
  ],
  alternates: {
    canonical: '/investor',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Jaga Duit',
  url: 'https://www.jagaduit.top',
  logo: 'https://www.jagaduit.top/icons/icon-512x512.png',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'jagaduitofficial@gmail.com',
    contactType: 'Investor Relations',
  },
};

export default function InvestorPage() {
  return (
    <>
       <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <InvestorClientPage />
    </>
  );
}
