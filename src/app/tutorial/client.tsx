
"use client"

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, BookOpen, HandCoins, LayoutGrid, PiggyBank, PlusCircle, Repeat, Target, Landmark, Bot, Trophy, ScanLine, Upload, Wallet, CreditCard, BarChart3, Users2 } from 'lucide-react';
import Link from 'next/link';

const tutorialSections = [
  {
    icon: PiggyBank,
    title: 'Langkah 1: Mengatur Anggaran Bulanan',
    content: (
      <div className="space-y-4">
        <p>Setelah menyelesaikan pengaturan awal, langkah selanjutnya adalah menetapkan budget untuk setiap kategori pengeluaran Anda. Ini akan menjadi fondasi untuk semua pelacakan dan laporan.</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Buka halaman <strong>Anggaran</strong> dari menu navigasi di bagian bawah.</li>
          <li>Di sana, Anda akan melihat semua kategori yang telah Anda siapkan.</li>
          <li>Masukkan jumlah dana yang ingin Anda alokasikan untuk setiap kategori di kolom yang tersedia.</li>
          <li>Total dari semua alokasi ini akan secara otomatis menjadi <strong>Total Anggaran Bulanan</strong> Anda.</li>
          <li>Jangan lupa klik <strong>"Simpan Perubahan Anggaran"</strong> di bagian bawah setelah selesai.</li>
        </ol>
        <Button asChild variant="outline" size="sm"><Link href="/budget">Buka Halaman Anggaran</Link></Button>
      </div>
    ),
  },
  {
    icon: LayoutGrid,
    title: 'Memahami Dasbor Utama',
    content: (
       <div className="space-y-4">
        <p>Dasbor adalah pusat kendali keuangan Anda. Di sini Anda bisa melihat ringkasan, mencatat transaksi, dan mengakses semua fitur utama dengan cepat.</p>
        <ul className="list-disc list-inside space-y-2">
            <li><strong>Ringkasan Keuangan:</strong> Kartu di bagian atas menampilkan sisa anggaran, pemasukan, pengeluaran, dan total tabungan Anda untuk periode berjalan.</li>
            <li><strong>Grafik & Analisis:</strong> Visualisasikan distribusi pengeluaran Anda dan bandingkan anggaran dengan realisasi secara real-time.</li>
            <li><strong>Tombol Aksi Cepat:</strong> Gunakan tombol (+) di pojok kanan bawah untuk menambah pengeluaran atau pemasukan dengan cepat.</li>
            <li><strong>Menu Navigasi:</strong> Semua halaman utama seperti Laporan, Pengingat, dan lainnya dapat diakses dari dasbor.</li>
        </ul>
        <Button asChild variant="outline" size="sm"><Link href="/">Kembali ke Dasbor</Link></Button>
      </div>
    ),
  },
   {
    icon: PlusCircle,
    title: 'Mencatat Transaksi (Pemasukan & Pengeluaran)',
    content: (
       <div className="space-y-4">
        <p>Mencatat setiap transaksi adalah kunci untuk menjaga anggaran tetap akurat.</p>
        <ul className="list-disc list-inside space-y-2">
            <li><strong>Tambah Pengeluaran:</strong> Klik tombol (+) di pojok kanan bawah, pilih "Tambah Pengeluaran". Isi jumlah, pilih kategori, dompet sumber dana, dan tanggal. Catatan bersifat opsional.</li>
            <li><strong>Pindai Struk (Premium):</strong> Hemat waktu dengan memindai struk. AI akan otomatis mengisi jumlah dan catatan untuk Anda.</li>
            <li><strong>Split Transaksi (Premium):</strong> Satu transaksi untuk beberapa kategori? Centang "Split Transaksi" untuk membagi satu pembayaran ke beberapa kategori berbeda (misal: belanja di supermarket).</li>
            <li><strong>Tambah Pemasukan:</strong> Klik tombol (+), pilih "Tambah Pemasukan". Catat pendapatan di luar anggaran bulanan Anda di sini, misalnya dari bonus atau pekerjaan sampingan.</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Wallet,
    title: 'Mengelola Aset & Liabilitas',
    content: (
      <div className="space-y-4">
          <p>Kelola semua sumber dana dan kewajiban Anda di satu tempat.</p>
          <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-primary">Dompet (Wallets):</strong> Mewakili sumber dana Anda (misal: Tunai, Rekening Bank, E-Wallet). Tambah, ubah, atau hapus dompet di halaman <Link href="/wallets" className="font-bold underline">Dompet</Link>. Saldo akan ter-update otomatis berdasarkan transaksi.</li>
              <li><strong className="text-primary">Tujuan (Savings Goals):</strong> Buat target tabungan seperti "Dana Darurat" atau "Liburan" di halaman <Link href="/savings" className="font-bold underline">Tujuan</Link>. Alokasikan dana dengan membuat transaksi pengeluaran dari kategori "Tabungan & Investasi".</li>
              <li><strong className="text-primary">Utang (Debts):</strong> Catat semua utang Anda di halaman <Link href="/debts" className="font-bold underline">Manajemen Utang</Link>. Setiap pembayaran yang dicatat melalui kategori "Pembayaran Utang" akan otomatis mengurangi sisa utang.</li>
          </ul>
      </div>
    ),
  },
  {
    icon: Bot,
    title: 'Memanfaatkan Fitur AI (Premium)',
    content: (
      <div className="space-y-4">
          <p>Upgrade ke Premium untuk membuka kekuatan penuh dari asisten keuangan cerdas Anda.</p>
          <ul className="list-disc list-inside space-y-2">
              <li><strong>Laporan Analisis AI:</strong> Dapatkan ringkasan, wawasan, dan pengeluaran teratas secara otomatis di halaman <Link href="/reports" className="font-bold underline">Laporan</Link>.</li>
              <li><strong>Peramalan Anggaran:</strong> AI akan memberi tahu Anda jika Anda berisiko over-budget sebelum periode berakhir.</li>
              <li><strong>Asisten Chatbot:</strong> Tanya apa saja seputar keuangan pribadi dan dapatkan jawaban instan dari AI.</li>
              <li><strong>Impor Transaksi:</strong> Impor file CSV dari e-banking dan biarkan AI mengkategorikan ratusan transaksi secara otomatis di halaman <Link href="/import" className="font-bold underline">Impor</Link>.</li>
              <li><strong>Kalender Finansial:</strong> Lihat semua jadwal pembayaran dan transaksi rutin dalam satu kalender interaktif di halaman <Link href="/financial-calendar" className="font-bold underline">Kalender</Link>.</li>
          </ul>
           <Button asChild variant="outline" size="sm"><Link href="/premium">Lihat Fitur Premium</Link></Button>
      </div>
    ),
  },
   {
    icon: Trophy,
    title: 'Gamifikasi: Naik Level & Kustomisasi',
    content: (
       <div className="space-y-4">
        <p>Mengatur keuangan tidak harus membosankan! Dapatkan hadiah seiring Anda menjadi lebih bijak secara finansial.</p>
        <ul className="list-disc list-inside space-y-2">
            <li><strong>Poin Pengalaman (XP):</strong> Anda akan mendapatkan XP setiap kali mencatat transaksi, membuka prestasi, atau menyelesaikan tujuan.</li>
            <li><strong>Naik Level:</strong> Semakin banyak XP, semakin tinggi level Anda. Level yang lebih tinggi akan membuka tema kustomisasi baru.</li>
            <li><strong>Lencana Prestasi:</strong> Capai tonggak tertentu (misal: mencatat 10 transaksi) untuk membuka lencana penghargaan.</li>
            <li><strong>Tema Aplikasi:</strong> Kunjungi halaman <Link href="/achievements" className="font-bold underline">Jejak Prestasi</Link> untuk melihat progres Anda dan mengubah tema tampilan aplikasi.</li>
        </ul>
      </div>
    ),
  },
];

export default function TutorialClientPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Kembali</span>
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="font-headline text-xl font-bold text-foreground">
            Panduan Aplikasi
          </h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Selamat Datang di Jaga Duit!</CardTitle>
            <CardDescription>
              Panduan ini akan membantu Anda memahami cara kerja setiap fitur agar Anda bisa mengelola keuangan dengan maksimal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {tutorialSections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger className="text-left hover:no-underline">
                        <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-primary" />
                            <span className="font-semibold">{section.title}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="prose prose-sm dark:prose-invert max-w-none pl-12">
                      {section.content}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
