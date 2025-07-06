
"use client"

import * as React from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Separator } from '@/components/ui/separator'
import { Heart, MessageSquare } from 'lucide-react'

interface SupportDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function SupportDialog({ isOpen, onOpenChange }: SupportDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full flex-col gap-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className='font-headline text-xl'>Dukungan & Informasi Aplikasi</DialogTitle>
          <DialogDescription>
            Terima kasih telah menggunakan Jaga Duit. Di bawah ini adalah ringkasan fitur dan informasi penting tentang aplikasi.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
            <div className="p-6 pt-0">
                <div className="space-y-4 text-sm">
                    <h4 className="font-bold font-headline">Tentang Jaga Duit</h4>
                    <p>
                        Jaga Duit adalah aplikasi web modern yang dirancang untuk membantu Anda mengelola keuangan pribadi dengan mudah, efektif, dan menyenangkan.
                    </p>

                    <Separator />

                    <h4 className="font-bold font-headline">Fitur Inti (Gratis)</h4>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>Manajemen Keuangan Lengkap:</strong> Atur anggaran, catat transaksi, kelola <strong>dompet</strong>, lacak <strong>tujuan menabung</strong>, dan pantau <strong>utang</strong> Anda.
                        </li>
                        <li>
                            <strong>Otomatisasi & Pengingat:</strong> Atur <strong>transaksi berulang</strong> untuk tagihan rutin dan gunakan <strong>pengingat pembayaran</strong> agar tidak ada yang terlewat.
                        </li>
                        <li>
                            <strong>Laporan & Riwayat:</strong> Lihat laporan visual dasar, akses riwayat lengkap, dan ekspor data Anda ke format CSV atau PDF.
                        </li>
                        <li>
                            <strong>Gamifikasi & Kustomisasi:</strong> Dapatkan <strong>XP & Level</strong>, buka <strong>lencana prestasi</strong>, dan personalisasi tampilan dengan tema yang ada.
                        </li>
                    </ul>

                    <Separator />

                    <h4 className="font-bold font-headline">Fitur Premium & AI Cerdas</h4>
                     <ul className="list-['-_'] pl-4 mt-1 space-y-1">
                        <li><strong>Kalender Finansial:</strong> Visualisasikan semua jadwal keuangan Anda—tagihan, gaji, dan transaksi rutin—dalam satu kalender.</li>
                        <li><strong>Impor Transaksi CSV:</strong> Impor riwayat transaksi dari e-banking untuk pencatatan massal otomatis.</li>
                        <li><strong>Pindai Struk:</strong> Isi form pengeluaran secara otomatis dari foto struk.</li>
                        <li><strong>Pelacakan Kekayaan Bersih:</strong> Lacak total aset dan utang Anda.</li>
                        <li><strong>Kalkulator Keuangan:</strong> Proyeksikan pertumbuhan investasi dan strategi pelunasan utang.</li>
                        <li><strong>Laporan & Peramalan:</strong> Dapatkan analisis mendalam dan peringatan dini dari AI.</li>
                        <li><strong>Chatbot Konsultasi:</strong> Mengobrol dengan asisten keuangan untuk mendapatkan jawaban dan tips.</li>
                        <li><strong>Kustomisasi Warna:</strong> Atur warna tema utama aplikasi sesuai keinginan Anda.</li>
                    </ul>

                    <Separator />

                    <h4 className="font-bold font-headline">Penyimpanan & Keamanan Data</h4>
                    <p>
                        Semua data Anda—anggaran, transaksi, dan tujuan—disimpan dengan aman di cloud menggunakan <strong>Firebase Firestore dari Google</strong>. Ini berarti data Anda tersinkronisasi dan dapat diakses dari perangkat mana pun Anda login. Privasi Anda adalah prioritas kami.
                    </p>
                </div>
            </div>
        </div>
        
        <DialogFooter className='flex-col-reverse items-center gap-4 border-t p-4 sm:flex-row sm:justify-between sm:p-6'>
             <p className='text-xs text-muted-foreground text-center sm:text-left'>Punya masukan atau butuh bantuan?</p>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <Button asChild variant="outline">
                    <Link href="https://wa.me/628989019049" target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Hubungi via WA
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="https://trakteer.id/mshasbi" target="_blank" rel="noopener noreferrer">
                        <Heart className="mr-2 h-4 w-4" />
                        Beri Dukungan
                    </Link>
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
