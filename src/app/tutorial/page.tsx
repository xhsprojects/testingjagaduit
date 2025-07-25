
import type { Metadata } from 'next';
import TutorialClientPage from './client';

export const metadata: Metadata = {
  title: 'Tutorial Aplikasi',
  description: 'Pelajari cara menggunakan semua fitur canggih di Jaga Duit, mulai dari pengaturan anggaran hingga menggunakan asisten AI.',
  robots: {
    index: false, // Don't want this page indexed by search engines
    follow: false,
  },
};

export default function TutorialPage() {
  return <TutorialClientPage />;
}
