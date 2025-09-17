
import type { Metadata } from 'next';
import LandingClientPage from './landing/client';

export const metadata: Metadata = {
  title: 'Jaga Duit: Aplikasi Keuangan & Budget Cerdas Berbasis AI',
  description: 'Kendalikan keuangan Anda dengan Jaga Duit. Aplikasi manajemen finansial pribadi yang didukung AI untuk membantu Anda mengatur anggaran, melacak pengeluaran, dan mencapai tujuan finansial.',
  keywords: [
    'aplikasi keuangan',
    'manajemen keuangan',
    'atur anggaran',
    'catat pengeluaran',
    'budgeting app',
    'asisten keuangan AI',
    'Jaga Duit',
    'tujuan menabung',
    'lacak utang',
    'aplikasi pencatat keuangan',
    'gamifikasi keuangan',
    'chatbot finansial',
    'kalender finansial',
    'pelacakan kekayaan bersih',
    'aplikasi budget indonesia',
    'personal finance indonesia',
    'pindai struk',
    'impor csv bank',
    'fintech indonesia',
    'literasi keuangan',
  ],
  alternates: {
    canonical: '/',
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
