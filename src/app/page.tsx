
import type { Metadata } from 'next';
import ClientPage from './client';

export const metadata: Metadata = {
  title: 'Dasbor Keuangan',
  description: 'Lihat ringkasan keuangan, pengeluaran terbaru, dan progres tujuan menabung Anda di dasbor Jaga Duit.',
};

export default function Home() {
  return <ClientPage />;
}
