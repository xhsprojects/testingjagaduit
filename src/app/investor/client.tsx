
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { 
  HandCoins, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Target,
  Users,
  Lightbulb,
  Rocket,
  BarChart3,
  Mail
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const Logo = () => (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="relative">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-110">
          <HandCoins className="h-8 w-8 text-white" />
        </div>
      </div>
      <div>
        <span className={`font-bold text-2xl text-slate-800`}>Jaga Duit</span>
        <div className={`text-sm text-slate-600`}>Asisten Keuangan Cerdas</div>
      </div>
    </Link>
  );

const StatCard = ({ icon, value, label, colorClass }: { icon: React.ReactNode, value: string, label: string, colorClass: string }) => (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg text-center">
        <div className={`inline-block p-3 rounded-xl mb-3 ${colorClass}`}>
            {icon}
        </div>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-600">{label}</p>
    </div>
);

export default function InvestorClientPage() {
  const { user } = useAuth();
  const [totalUsers, setTotalUsers] = React.useState<number | null>(null);

  React.useEffect(() => {
    const fetchTotalUsers = async () => {
        try {
            const usersCollection = collection(db, 'users');
            const userSnapshot = await getDocs(usersCollection);
            setTotalUsers(userSnapshot.size);
        } catch (error) {
            console.error("Error fetching total users:", error);
            setTotalUsers(0);
        }
    };
    fetchTotalUsers();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <header className="sticky top-0 z-50 p-4 border-b border-white/20 bg-white/80 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Logo />
                <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg rounded-2xl px-6">
                    <Link href="/login">
                        {user ? "Masuk ke Dasbor" : "Login"}
                    </Link>
                </Button>
            </div>
        </header>

        <main className="relative z-10">
            <section className="px-6 pt-16 pb-20 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-blue-100 px-6 py-3 rounded-full border border-green-200/50 shadow-lg mb-6">
                        <Rocket className="h-5 w-5 text-green-700" />
                        <span className="text-green-800 font-semibold text-sm">Peluang Investasi</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-800 leading-tight">
                        Bergabunglah dengan Misi Kami untuk Merevolusi Keuangan Pribadi di Asia Tenggara
                    </h1>
                    <p className="mt-6 text-base md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Jaga Duit lebih dari sekadar aplikasi; ini adalah gerakan untuk memberdayakan individu dengan alat AI canggih untuk mencapai kebebasan finansial. Kami mencari mitra investor untuk mengakselerasi pertumbuhan kami.
                    </p>
                    <div className="mt-10">
                        <Button asChild size="lg" className="text-base md:text-lg py-5 md:py-6 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl group">
                            <a href="mailto:jagaduitofficial@gmail.com?subject=Peluang Investasi Jaga Duit" className="flex items-center gap-2">
                                Hubungi Kami
                                <Mail className="h-5 w-5" />
                            </a>
                        </Button>
                    </div>
                </div>
            </section>
            
            <section className="px-6 py-20 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                            Traction & Potential
                        </h2>
                        <p className="text-base md:text-xl text-slate-600 max-w-3xl mx-auto">
                            Kami sedang dalam lintasan pertumbuhan yang kuat dengan metrik yang menjanjikan.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <StatCard 
                            icon={<Users className="h-8 w-8 text-blue-600" />}
                            value={totalUsers !== null ? `~${totalUsers.toLocaleString()}` : "..."}
                            label="Pengguna Terdaftar"
                            colorClass="bg-blue-100"
                        />
                        <StatCard 
                            icon={<TrendingUp className="h-8 w-8 text-green-600" />}
                            value="25% MoM"
                            label="Pertumbuhan Pengguna (est.)"
                            colorClass="bg-green-100"
                        />
                         <StatCard 
                            icon={<Target className="h-8 w-8 text-red-600" />}
                            value="$500M+"
                            label="Target Pasar (Indonesia)"
                            colorClass="bg-red-100"
                        />
                    </div>
                </div>
            </section>
            
            <section className="px-6 py-20">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="mb-8">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                                Visi Kami: Beyond Budgeting
                            </h2>
                            <p className="text-lg text-slate-600">
                                Kami tidak hanya membangun aplikasi budget. Kami membangun ekosistem finansial cerdas yang mengintegrasikan tabungan, investasi, dan perencanaan kekayaan dengan mulus, didukung oleh AI yang proaktif dan dipersonalisasi.
                            </p>
                        </div>
                        <ul className="space-y-6">
                            <li className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-xl border shadow-sm"><Lightbulb className="h-6 w-6 text-yellow-500" /></div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Hiper-Personalisasi</h4>
                                    <p className="text-slate-600">AI yang belajar dari setiap pengguna untuk memberikan saran yang relevan dan tepat waktu.</p>
                                </div>
                            </li>
                             <li className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-xl border shadow-sm"><ShieldCheck className="h-6 w-6 text-green-600" /></div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Ekosistem Terintegrasi</h4>
                                    <p className="text-slate-600">Menghubungkan Jaga Duit dengan produk investasi dan perbankan untuk otomatisasi penuh.</p>
                                </div>
                            </li>
                             <li className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-xl border shadow-sm"><BarChart3 className="h-6 w-6 text-indigo-600" /></div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Literasi Finansial</h4>
                                    <p className="text-slate-600">Menjadi platform edukasi utama yang meningkatkan kecerdasan finansial pengguna.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                     <div className="mt-8 lg:mt-0">
                        <Image
                            src="https://portofolio-smoky-five.vercel.app/jg3.webp"
                            alt="Jaga Duit App Vision"
                            width={1200}
                            height={750}
                            className="w-full h-auto rounded-3xl shadow-2xl"
                        />
                    </div>
                </div>
            </section>
            
            <section className="px-6 py-20 bg-slate-950 text-white">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Jadilah Bagian dari Perjalanan Ini
                </h2>
                <p className="text-base md:text-xl mb-8 opacity-90">
                  Kami mencari mitra yang memiliki visi yang sama untuk memberdayakan masa depan finansial jutaan orang. Jika Anda tertarik untuk berdiskusi lebih lanjut tentang peluang investasi, kami ingin mendengar dari Anda.
                </p>
                <Button asChild size="lg" className="text-base md:text-lg py-5 md:py-6 px-8 bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl group">
                  <a href="mailto:jagaduitofficial@gmail.com?subject=Peluang Investasi Jaga Duit" className="flex items-center gap-2">
                    Kontak Tim Kami
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
              </div>
            </section>
        </main>
    </div>
  );
}
