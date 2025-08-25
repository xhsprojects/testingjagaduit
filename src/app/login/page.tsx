
import type { Metadata } from 'next';
import LoginClientPage from './client';

export const metadata: Metadata = {
  title: 'Masuk atau Daftar ke Jaga Duit',
  description: 'Masuk atau daftar gratis ke akun Jaga Duit Anda untuk mulai mengelola keuangan pribadi dengan cerdas dan mudah.',
  alternates: {
    canonical: '/login',
  },
};

export default function LoginPage() {
  return <LoginClientPage />;
}
