
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { ClientLayoutWrapper } from '@/components/ClientLayoutWrapper';
import { Analytics } from '@vercel/analytics/next';

const siteUrl = 'https://www.jagaduit.top';

export const metadata: Metadata = {
  title: {
    default: 'Jaga Duit - Aplikasi Keuangan & Manajemen Anggaran Cerdas',
    template: '%s | Jaga Duit',
  },
  description: 'Jaga Duit adalah aplikasi manajemen keuangan pribadi berbasis AI yang membantu Anda mengatur anggaran, mencatat pengeluaran, melacak utang, dan mencapai tujuan finansial. Mulai kelola keuangan Anda dengan cerdas!',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: '/',
  },
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ClientLayoutWrapper>
              {children}
              <Toaster />
            </ClientLayoutWrapper>
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
