
import type { Metadata } from 'next';
import SplitBillClientPage from './client';

export const metadata: Metadata = {
  title: 'Split Bill - Bagi Tagihan',
  description: 'Bagi tagihan dengan teman-teman Anda secara adil dan mudah menggunakan fitur Split Bill dari Jaga Duit.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SplitBillPage() {
  return <SplitBillClientPage />;
}
