
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { 
  HandCoins, 
  LayoutGrid,
  Bot,
  ScanLine,
  Repeat,
  BellRing,
  Target,
  BookMarked,
  Trophy,
  Star,
  Palette,
  CalendarDays,
  Upload,
  Scale,
  Calculator,
  BarChart3,
  TrendingUp,
  CreditCard,
  PiggyBank,
  Wallet as WalletIcon,
  ArrowRight,
  Check,
  Sparkles,
  Shield,
  Zap,
  Users,
  Heart,
  Download,
  Menu,
  X,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  LayoutDashboard,
  Cloud,
  RefreshCw,
  BrainCircuit,
  Award,
  ShieldCheck,
  Goal,
  CandlestickChart,
  UtensilsCrossed,
  ShoppingBasket,
  GraduationCap,
  ShieldAlert,
  Gamepad2,
  HeartHandshake,
  LifeBuoy,
  MessageSquare,
  Info,
  Loader2,
  Rocket
} from 'lucide-react';
import { SpeedDial, SpeedDialAction } from '@/components/SpeedDial';
import { SupportDialog } from '@/components/SupportDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { subscribeEmail } from './actions';
import { useToast } from '@/hooks/use-toast';

const Logo = ({ titleColor = 'text-slate-800', subtitleColor = 'text-slate-600' }: {
  titleColor?: string;
  subtitleColor?: string;
}) => (
  <Link href="/" className="flex items-center gap-3 group">
    <div className="relative">
      <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-110">
        <HandCoins className="h-8 w-8 text-white" />
      </div>
      <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-md text-white font-bold text-sm">
        $
      </div>
    </div>
    <div>
      <span className={`font-bold text-2xl ${titleColor}`}>Jaga Duit</span>
      <div className={`text-sm ${subtitleColor}`}>Asisten Keuangan Cerdas</div>
    </div>
  </Link>
);

const CustomLabel = ({ text, className }: { text: string; className: string }) => (
  <div className={`absolute top-4 right-4 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg ${className}`}>
    {text}
  </div>
);


const FeatureCard = ({ icon, title, description, isPremium = false, customLabel }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string,
  isPremium?: boolean,
  customLabel?: { text: string; className: string; }
}) => (
  <div className="group relative flex flex-col text-left p-6 bg-white/90 backdrop-blur-sm rounded-3xl border border-gray-200/50 shadow-lg hover:shadow-2xl hover:border-gray-300/50 transition-all duration-500 hover:-translate-y-2 h-full">
    {isPremium && <CustomLabel text="Premium" className="bg-gradient-to-r from-purple-500 to-pink-500" />}
    {customLabel && <CustomLabel text={customLabel.text} className={customLabel.className} />}

    <div className="flex items-start gap-4 mb-4">
      <div className={`p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 ${
        isPremium || customLabel
          ? 'bg-gradient-to-br from-purple-100 to-pink-100 group-hover:from-purple-200 group-hover:to-pink-200' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 group-hover:to-indigo-100'
      }`}>
        {icon}
      </div>
      <h4 className="font-bold text-base md:text-lg text-slate-800 group-hover:text-slate-900 transition-colors mt-2">
        {title}
      </h4>
    </div>
    <p className="text-sm md:text-base text-slate-600 leading-relaxed flex-grow group-hover:text-slate-700 transition-colors">
      {description}
    </p>
  </div>
);


const PainPointCard = ({ beforeIcon, beforeText, afterText }: {
  beforeIcon: string;
  beforeText: string;
  afterText: string;
}) => (
  <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
    <div className="flex items-center gap-4 mb-4">
      <span className="text-xs font-bold bg-pink-100 text-pink-700 px-3 py-1 rounded-full flex-shrink-0">Sebelum</span>
      <span className="text-slate-700 flex items-center gap-2">
        <span className="text-xl">{beforeIcon}</span>
        {beforeText}
      </span>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-xs font-bold bg-teal-100 text-teal-700 px-3 py-1 rounded-full flex-shrink-0">Sesudah</span>
      <span className="font-semibold text-slate-800">{afterText}</span>
    </div>
  </div>
);

const AdvantageCard = ({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl border border-gray-200/50 shadow-lg text-center h-full hover:shadow-xl transition-shadow duration-300">
    <div className="inline-block p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
        {icon}
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-600 text-sm">{description}</p>
  </div>
);


export default function LandingClientPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', content: '' });
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const handleInfoClick = (title: string, content: string) => {
    setDialogContent({ title, content });
    setIsInfoDialogOpen(true);
  };

  const legalContent = {
    privacy: `Kebijakan Privasi Anda penting bagi kami. Kami mengumpulkan data seperti email dan nama Anda untuk personalisasi. Data keuangan Anda disimpan dengan aman di server Google dan tidak dibagikan.`,
    terms: `Dengan menggunakan Jaga Duit, Anda setuju untuk tidak menyalahgunakan layanan ini. Layanan disediakan "apa adanya" tanpa jaminan.`,
    about: 'Jaga Duit adalah aplikasi yang lahir dari kebutuhan untuk mengelola keuangan pribadi dengan cara yang simpel, modern, dan cerdas. Kami percaya bahwa setiap orang berhak mencapai kebebasan finansial.',
    contact: 'Untuk dukungan, masukan, atau pertanyaan bisnis, silakan hubungi kami melalui WhatsApp di +62-898-9019-049 atau email ke jagaduitofficial@gmail.com.',
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-cyan-100 to-purple-100 rounded-full blur-3xl opacity-20"></div>
      </div>

      <header className="sticky top-0 z-50 p-4 border-b border-white/20 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo />
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#fitur" className="text-slate-700 hover:text-slate-900 font-medium transition-colors">
              Fitur
            </Link>
            <Link href="#gamifikasi" className="text-slate-700 hover:text-slate-900 font-medium transition-colors">
              Gamifikasi
            </Link>
            <Link href="#fitur-ai" className="text-slate-700 hover:text-slate-900 font-medium transition-colors">
              Fitur AI
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg rounded-2xl px-6">
              <Link href="/login">Masuk atau Daftar</Link>
            </Button>
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <nav className="flex flex-col gap-4 text-center">
              <Link href="#fitur" className="text-slate-700 hover:text-slate-900 font-medium py-2" onClick={() => setIsMenuOpen(false)}>
                Fitur
              </Link>
              <Link href="#gamifikasi" className="text-slate-700 hover:text-slate-900 font-medium py-2" onClick={() => setIsMenuOpen(false)}>
                Gamifikasi
              </Link>
              <Link href="#fitur-ai" className="text-slate-700 hover:text-slate-900 font-medium py-2" onClick={() => setIsMenuOpen(false)}>
                Fitur AI
              </Link>
              <Button asChild className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg rounded-2xl px-6">
                <Link href="/login">Masuk atau Daftar</Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <section className="px-6 pt-8 pb-8 md:pt-12 md:pb-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-3 rounded-full border border-blue-200/50 shadow-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-semibold text-sm">Didukung AI untuk Keuangan Cerdas</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-800 leading-tight">
                Aplikasi Keuangan{" "}
                <span className="bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent">
                  Cerdas
                </span>{" "}
                untuk Masa Depan Anda
              </h1>
              
              <p className="text-base md:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Jaga Duit adalah asisten keuangan pribadi Anda yang didukung AI untuk membantu Anda mencapai setiap tujuan finansial dengan mudah.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center pt-4">
                <Button asChild size="lg" className="text-base md:text-lg py-5 md:py-6 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl group">
                  <Link href="/login" className="flex items-center gap-2">
                    Mulai Gratis Sekarang
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="mt-8 lg:mt-0">
              <div
                className="relative w-full max-w-xl mx-auto cursor-pointer group"
                onClick={() => setLightboxImage('https://portofolio-smoky-five.vercel.app/jg.webp')}
              >
                <Image
                  src="https://portofolio-smoky-five.vercel.app/jg.webp"
                  alt="Jaga Duit App Hero"
                  width={1200}
                  height={750}
                  className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">klik untuk zoom</p>
            </div>

          </div>
        </section>

        <section id="problem-solution" className="px-6 py-20 scroll-mt-20">
           <div className="max-w-4xl mx-auto">
             <div className="text-center mb-16">
               <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                 Familiar Gak?
               </h2>
               <p className="text-base md:text-xl text-slate-600">
                 Masalah keuangan yang sering terjadi, dan bagaimana Jaga Duit menyelesaikannya.
               </p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <PainPointCard beforeIcon="💸" beforeText="Uang hilang, gak tau kemana" afterText="Lacak setiap rupiah dengan mudah" />
                <PainPointCard beforeIcon="📊" beforeText="Budget selalu gagal" afterText="Visual spending yang beneran nempel" />
                <PainPointCard beforeIcon="🤯" beforeText="Aplikasi ribet bikin males" afterText="Setup 30 detik, simple selamanya" />
                <PainPointCard beforeIcon="🤷" beforeText="Data hilang ganti HP" afterText="Tersimpan aman di cloud, ganti HP tetap ada" />
             </div>
           </div>
        </section>

        <section id="why-us" className="px-6 py-20 scroll-mt-20 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                Kenapa Jaga Duit Sangat Ampuh?
              </h2>
              <p className="text-base md:text-xl text-slate-600 max-w-3xl mx-auto">
                Bukan sekadar aplikasi, tapi partner finansial cerdas yang dirancang untuk kesuksesan Anda.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <AdvantageCard 
                icon={<LayoutDashboard className="h-8 w-8 text-blue-600"/>}
                title="Satu Dasbor untuk Segalanya"
                description="Lupakan kerumitan beralih menu. Semua informasi penting tersaji dalam satu dasbor interaktif yang mudah dipahami."
              />
              <AdvantageCard 
                icon={<Cloud className="h-8 w-8 text-green-600"/>}
                title="Data Aman di Cloud"
                description="Kehilangan HP bukan berarti kehilangan data. Semua catatan finansial Anda tersimpan dengan aman menggunakan enkripsi di cloud."
              />
              <AdvantageCard 
                icon={<RefreshCw className="h-8 w-8 text-indigo-600"/>}
                title="Sinkronisasi Otomatis"
                description="Catat di ponsel, analisis di laptop. Data Anda selalu ter-update secara real-time di semua perangkat yang Anda gunakan."
              />
              <AdvantageCard 
                icon={<BrainCircuit className="h-8 w-8 text-purple-600"/>}
                title="Dilengkapi AI Canggih"
                description="AI kami proaktif menganalisis kebiasaan belanja, memberikan rekomendasi, dan mengingatkan jika ada potensi over-budget."
              />
            </div>
          </div>
        </section>
        
        <section id="fitur" className="px-6 py-20 scroll-mt-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                Fitur Inti untuk Semua Pengguna
              </h2>
              <p className="text-base md:text-xl text-slate-600 max-w-3xl mx-auto">
                Semua yang Anda butuhkan untuk memulai perjalanan finansial yang lebih baik, tersedia gratis selamanya.
              </p>
            </div>

            <div className="mb-8 lg:mb-16">
              <div
                className="relative w-full cursor-pointer group"
                onClick={() => setLightboxImage('https://portofolio-smoky-five.vercel.app/jd2.webp')}
              >
                 <Image
                   src="https://portofolio-smoky-five.vercel.app/jd2.webp"
                   alt="Fitur Inti Jaga Duit"
                   width={1920}
                   height={1080}
                   className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                 />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">klik untuk zoom</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard icon={<LayoutGrid className="h-7 w-7 text-blue-600" />} title="Dasbor Interaktif" description="Ringkasan keuangan, grafik pengeluaran, dan perbandingan anggaran vs. realisasi dalam satu tampilan yang indah dan mudah dipahami." />
              <FeatureCard icon={<WalletIcon className="h-7 w-7 text-green-600" />} title="Manajemen Dompet" description="Atur semua sumber dana Anda (tunai, rekening bank, e-wallet) dan catat transfer antar dompet dengan mudah dan akurat." />
              <FeatureCard icon={<PiggyBank className="h-7 w-7 text-pink-600" />} title="Anggaran Fleksibel" description="Buat kategori pengeluaran yang sesuai dengan gaya hidup Anda dan alokasikan dana untuk masing-masing dengan sistem yang adaptif." />
              <FeatureCard icon={<Repeat className="h-7 w-7 text-indigo-600" />} title="Transaksi Berulang" description="Otomatiskan pencatatan untuk transaksi rutin seperti gaji, tagihan bulanan, atau cicilan untuk menghemat waktu Anda." />
              <FeatureCard icon={<BellRing className="h-7 w-7 text-amber-600" />} title="Pengingat Pembayaran" description="Jangan pernah lagi telat bayar tagihan. Dapatkan notifikasi cerdas untuk semua jatuh tempo yang akan datang." />
              <FeatureCard icon={<Target className="h-7 w-7 text-teal-600" />} title="Tujuan Menabung" description="Buat tujuan finansial (dana darurat, liburan, gadget baru) dan lacak progres Anda hingga tercapai dengan visualisasi yang menarik." />
              <FeatureCard icon={<CreditCard className="h-7 w-7 text-red-600" />} title="Manajemen Utang" description="Pantau semua utang Anda, catat setiap pembayaran, dan lihat sisa utang secara real-time dengan strategi pelunasan yang optimal." />
              <FeatureCard icon={<BarChart3 className="h-7 w-7 text-violet-600" />} title="Laporan Visual" description="Pahami ke mana uang Anda pergi dengan grafik dan bagan yang mudah dibaca, interaktif, dan memberikan wawasan mendalam." />
              <FeatureCard icon={<BookMarked className="h-7 w-7 text-cyan-600" />} title="Riwayat & Arsip" description="Akses riwayat lengkap semua transaksi dan periode anggaran yang telah berlalu kapan saja dengan pencarian yang canggih." />
            </div>
          </div>
        </section>

        <section id="gamifikasi" className="px-6 py-20 bg-gradient-to-br from-purple-50 to-pink-50 scroll-mt-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
             <div className="mb-8 lg:mb-0 order-2 lg:order-1">
               <div
                 className="relative w-full cursor-pointer group"
                 onClick={() => setLightboxImage('https://portofolio-smoky-five.vercel.app/jg5.webp')}
               >
                  <Image
                    src="https://portofolio-smoky-five.vercel.app/jg5.webp"
                    alt="Gamifikasi Jaga Duit"
                    width={1920}
                    height={1080}
                    className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                  />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">klik untuk zoom</p>
            </div>
            <div className="order-1 lg:order-2">
              <div className="text-center lg:text-left mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                  Gamifikasi & Personalisasi
                </h2>
                <p className="text-base md:text-xl text-slate-600 max-w-3xl mx-auto lg:mx-0">
                  Mengatur keuangan tidak pernah semenyenangkan ini. Dapatkan hadiah seiring Anda menjadi lebih bijak.
                </p>
              </div>
              <div className="flex flex-col gap-8">
                <FeatureCard icon={<Trophy className="h-7 w-7 text-yellow-500" />} title="Jejak Prestasi" description="Buka 'lencana' penghargaan saat Anda mencapai tonggak finansial, seperti melunasi utang." />
                <FeatureCard icon={<Star className="h-7 w-7 text-orange-500" />} title="Sistem Level & XP" description="Dapatkan Poin Pengalaman (XP) dari setiap aktivitas positif untuk naik level & membuka fitur baru." />
                <FeatureCard icon={<Palette className="h-7 w-7 text-purple-500" />} title="Kustomisasi Tema" description="Personalisasi tampilan aplikasi dengan berbagai tema warna yang bisa dibuka saat naik level." />
              </div>
            </div>
          </div>
        </section>

        <section id="fitur-ai" className="px-6 py-20 scroll-mt-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-3xl mb-4">
                 <Bot className="h-10 w-10 text-purple-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                Buka Kekuatan Penuh dengan AI Cerdas
              </h2>
              <p className="text-base md:text-xl text-slate-600 max-w-3xl mx-auto">
                Tingkatkan manajemen keuangan Anda dengan analisis dan otomatisasi canggih dari fitur Premium kami.
              </p>
            </div>

            <div className="mb-8 lg:mb-16">
              <div
                className="relative w-full cursor-pointer group"
                onClick={() => setLightboxImage('https://portofolio-smoky-five.vercel.app/jg3.webp')}
              >
                  <Image
                    src="https://portofolio-smoky-five.vercel.app/jg3.webp"
                    alt="Fitur AI Jaga Duit"
                    width={1920}
                    height={1080}
                    className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                  />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">klik untuk zoom</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <FeatureCard icon={<Bot className="h-7 w-7 text-purple-600" />} title="Asisten Keuangan Personal" description="Mengobrol dengan chatbot AI untuk mendapatkan jawaban atas pertanyaan keuangan atau meminta tips menabung yang dipersonalisasi." isPremium={true} />
               <FeatureCard 
                 icon={<BarChart3 className="h-7 w-7 text-blue-600" />} 
                 title="Laporan Analisis AI" 
                 description="Dapatkan laporan mendalam tentang aktivitas keuangan Anda, lengkap dengan ringkasan, wawasan, dan rekomendasi yang cerdas." 
                 customLabel={{ text: "Free AI", className: "bg-gradient-to-r from-blue-500 to-green-500" }} 
               />
               <FeatureCard icon={<TrendingUp className="h-7 w-7 text-purple-600" />} title="Peramalan Anggaran AI" description="AI menganalisis pola belanja Anda dan memberikan peringatan dini jika Anda berisiko melebihi anggaran." isPremium={true} />
               <FeatureCard icon={<ScanLine className="h-7 w-7 text-purple-600" />} title="Pindai Struk dengan AI" description="Hemat waktu dengan memfoto struk belanja. AI akan secara otomatis membaca total belanja, nama toko, dan mengkategorikan." isPremium={true} />
               <FeatureCard icon={<Upload className="h-7 w-7 text-purple-600" />} title="Impor Transaksi CSV" description="Unggah mutasi rekening dari e-banking dan biarkan AI mengkategorikan transaksi secara otomatis dengan akurasi tinggi." isPremium={true}/>
               <FeatureCard icon={<CalendarDays className="h-7 w-7 text-purple-600" />} title="Kalender Finansial" description="Visualisasikan semua jadwal keuangan Anda—jatuh tempo, transaksi rutin—dalam satu kalender interaktif yang comprehensive." isPremium={true}/>
               <FeatureCard icon={<Scale className="h-7 w-7 text-purple-600" />} title="Pelacakan Kekayaan Bersih" description="Lacak total aset (properti, investasi) dan utang Anda untuk mendapatkan gambaran menyeluruh kekayaan bersih Anda." isPremium={true}/>
               <FeatureCard icon={<Calculator className="h-7 w-7 text-purple-600" />} title="Kalkulator & Proyeksi" description="Gunakan kalkulator canggih untuk memproyeksikan pertumbuhan investasi atau menyusun strategi pelunasan utang yang optimal." isPremium={true}/>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Siap Mengambil Kendali Keuangan Anda?
            </h2>
            <p className="text-base md:text-xl mb-8 opacity-90">
              Bergabunglah dengan ribuan pengguna yang telah merasakan kebebasan finansial. Mulai perjalanan Anda hari ini, gratis selamanya.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-base md:text-lg py-5 md:py-6 px-8 bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl group">
                <Link href="/login" className="flex items-center gap-2">
                  Daftar Sekarang - Gratis
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 px-6 pt-16 pb-8 bg-slate-950 text-slate-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="lg:col-span-1">
              <div className="mb-6">
                 <Logo titleColor="text-white" subtitleColor="text-slate-300" />
              </div>
              <p className="text-slate-400 max-w-sm text-sm md:text-base">
                Asisten keuangan cerdas yang membantu Anda mencapai kebebasan finansial dengan teknologi AI.
              </p>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h4 className="font-semibold text-white mb-4">Produk</h4>
                <ul className="space-y-3 text-slate-400 text-sm md:text-base">
                  <li><Link href="#fitur" className="hover:text-white transition-colors">Fitur</Link></li>
                  <li><Link href="#fitur-ai" className="hover:text-white transition-colors">Fitur AI</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Download</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Perusahaan</h4>
                <ul className="space-y-3 text-slate-400 text-sm md:text-base">
                  <li><button onClick={() => handleInfoClick('Tentang Kami', legalContent.about)} className="hover:text-white transition-colors text-left">Tentang Kami</button></li>
                  <li><Link href="/investor" className="hover:text-white transition-colors">Investor</Link></li>
                  <li><button onClick={() => handleInfoClick('Karir', 'Saat ini belum ada lowongan tersedia.')} className="hover:text-white transition-colors text-left">Karir</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Dukungan</h4>
                <ul className="space-y-3 text-slate-400 text-sm md:text-base">
                  <li><button onClick={() => setIsSupportDialogOpen(true)} className="hover:text-white transition-colors text-left">Pusat Bantuan</button></li>
                  <li><button onClick={() => handleInfoClick('Hubungi Kami', legalContent.contact)} className="hover:text-white transition-colors text-left">Hubungi Kami</button></li>
                  <li><button onClick={() => handleInfoClick('Status Layanan', 'Semua sistem beroperasi normal.')} className="hover:text-white transition-colors text-left">Status</button></li>
                </ul>
              </div>
               <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-3 text-slate-400 text-sm md:text-base">
                  <li><button onClick={() => handleInfoClick('Kebijakan Privasi', legalContent.privacy)} className="hover:text-white transition-colors">Kebijakan Privasi</button></li>
                  <li><button onClick={() => handleInfoClick('Syarat & Ketentuan', legalContent.terms)} className="hover:text-white transition-colors">Syarat & Ketentuan</button></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex gap-4">
              <Link href="https://www.instagram.com/jagaduit.top/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors"><Instagram className="h-5 w-5" /></Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors"><Facebook className="h-5 w-5" /></Link>
              <Link href="#" className="text-slate-400 hover:text-white transition-colors"><Linkedin className="h-5 w-5" /></Link>
            </div>
            <p className="text-slate-500 text-sm text-center md:text-right">
              &copy; {new Date().getFullYear()} Jaga Duit. Semua Hak Cipta Dilindungi.
            </p>
          </div>
        </div>
      </footer>
      
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            <X size={32} />
          </button>
          <div className="relative w-11/12 h-5/6" onClick={(e) => e.stopPropagation()}>
            <Image 
              src={lightboxImage} 
              alt="Lightbox view" 
              layout="fill" 
              objectFit="contain" 
            />
          </div>
        </div>
      )}

    <SpeedDial mainIcon={<LifeBuoy className="h-6 w-6" />} position="bottom-right">
        <SpeedDialAction label="Dukungan Aplikasi" onClick={() => setIsSupportDialogOpen(true)}>
            <MessageSquare className="h-5 w-5" />
        </SpeedDialAction>
    </SpeedDial>
    
    <SupportDialog
        isOpen={isSupportDialogOpen}
        onOpenChange={setIsSupportDialogOpen}
    />
    
    <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>{dialogContent.title}</DialogTitle>
                <DialogDescription className="pt-4 text-base text-left text-foreground">
                    {dialogContent.content}
                </DialogDescription>
            </DialogHeader>
        </DialogContent>
    </Dialog>

    </div>
  );
}
