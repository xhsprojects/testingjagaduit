
import type { Metadata } from 'next';
import AchievementsClientPage from './client';

export const metadata: Metadata = {
  title: 'Jejak Prestasi',
  description: 'Lihat semua lencana yang telah Anda raih, lacak progres level Anda, dan kustomisasi tema aplikasi Jaga Duit Anda.',
};

export default function AchievementsPage() {
  return <AchievementsClientPage />;
}
