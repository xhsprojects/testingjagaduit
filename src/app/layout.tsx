
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper';
import { Analytics } from '@vercel/analytics/next';
import { Poppins, PT_Sans } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
  display: 'swap',
});


const siteUrl = 'https://www.jagaduit.top';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Jaga Duit - Aplikasi Keuangan & Manajemen Anggaran Cerdas',
    template: '%s | Jaga Duit',
  },
  description: 'Jaga Duit adalah aplikasi manajemen keuangan pribadi berbasis AI yang membantu Anda mengatur anggaran, mencatat pengeluaran, melacak utang, dan mencapai tujuan finansial. Mulai kelola keuangan Anda dengan cerdas!',
  verification: {
    google: 'KODE_UNIK_ANDA_DI_SINI',
  },
  keywords: [
    'aplikasi keuangan',
    'manajemen keuangan pribadi',
    'atur anggaran',
    'catat pengeluaran',
    'budgeting app',
    'asisten keuangan AI',
    'Jaga Duit',
    'tujuan menabung',
    'lacak utang',
    'kebebasan finansial',
    'aplikasi finansial cerdas',
    'laporan keuangan',
    'analisis keuangan',
    'PWA keuangan',
  ],
  authors: [{ name: 'Jaga Duit Team', url: siteUrl }],
  creator: 'Jaga Duit Team',
  publisher: 'Jaga Duit',
  openGraph: {
    title: 'Jaga Duit - Aplikasi Keuangan & Manajemen Anggaran Cerdas',
    description: 'Kelola keuangan pribadi Anda dengan mudah menggunakan AI. Atur anggaran, catat pengeluaran, dan capai tujuan finansial Anda.',
    url: siteUrl,
    siteName: 'Jaga Duit',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Jaga Duit - Asisten Keuangan Cerdas',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jaga Duit - Aplikasi Keuangan Cerdas untuk Masa Depan Anda',
    description: 'Manajemen keuangan pribadi jadi lebih mudah dan cerdas dengan Jaga Duit. Didukung oleh AI untuk membantu Anda mencapai kebebasan finansial.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${poppins.variable} ${ptSans.variable}`}>
      <head />
      <body className="font-body antialiased">
        <ClientLayoutWrapper>
          {children}
          <Toaster />
        </ClientLayoutWrapper>
        <Analytics />
      </body>
    </html>
  );
}
