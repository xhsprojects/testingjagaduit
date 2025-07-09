
import type { Metadata } from 'next';
import NotesClientPage from './client';

export const metadata: Metadata = {
  title: 'Catatan Pribadi',
  description: 'Buat dan kelola catatan pribadi, ide, atau daftar tugas Anda di Jaga Duit.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotesPage() {
  return <NotesClientPage />;
}
