import type { Metadata } from 'next';
import CategoriesClientPage from './client';

export const metadata: Metadata = {
  title: 'Kelola Kategori',
  description: 'Tambah, ubah, atau hapus kategori pengeluaran Anda di Jaga Duit.',
};

export default function CategoriesPage() {
  return <CategoriesClientPage />;
}
