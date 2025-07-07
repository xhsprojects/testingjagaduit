
import type { Metadata } from 'next';
import AdminClientPage from './client';

export const metadata: Metadata = {
  title: 'Dasbor Admin',
  description: 'Halaman khusus untuk administrasi aplikasi Jaga Duit.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminClientPage />;
}
