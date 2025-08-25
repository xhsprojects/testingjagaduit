
import type { Metadata } from 'next';
import LandingClientPage from './client';

export const metadata: Metadata = {
  title: 'Jaga Duit: Aplikasi Keuangan & Budget Cerdas Berbasis AI',
  description: 'Kendalikan keuangan Anda dengan Jaga Duit. Aplikasi manajemen finansial pribadi yang didukung AI untuk membantu Anda mengatur anggaran, melacak pengeluaran, dan mencapai tujuan finansial.',
  alternates: {
    canonical: '/landing',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Jaga Duit',
  operatingSystem: 'WEB',
  applicationCategory: 'FinanceApplication',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'IDR',
  },
};


export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClientPage />
    </>
  );
}
