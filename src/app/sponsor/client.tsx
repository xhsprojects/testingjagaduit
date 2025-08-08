
"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { 
  HandCoins, 
  ArrowRight,
  Users,
  BarChart3,
  Mail,
  HeartHandshake,
  Megaphone,
  Newspaper,
  CalendarCheck
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

const OpportunityCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl border border-gray-200/50 shadow-lg text-left h-full hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    </div>
);

export default function SponsorClientPage() {
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
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-green-50">
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
                        <HeartHandshake className="h-5 w-5 text-green-700" />
                        <span className="text-green-800 font-semibold text-sm">Peluang Kemitraan</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-800 leading-tight">
                        Bermitra dengan Jaga Duit dan Jangkau Audiens yang Tepat
                    </h1>
                    <p className="mt-6 text-base md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Jaga Duit adalah platform yang berkembang pesat bagi individu yang proaktif secara finansial. Jadilah sponsor kami dan hubungkan merek Anda dengan komunitas yang peduli akan masa depan keuangan mereka.
                    </p>
                    <div className="mt-10">
                        <Button asChild size="lg" className="text-base md:text-lg py-5 md:py-6 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl group">
                            <a href="mailto:jagaduitofficial@gmail.com?subject=Peluang Sponsor Jaga Duit" className="flex items-center gap-2">
                                Hubungi Tim Kemitraan
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
                            Mengapa Bermitra dengan Kami?
                        </h2>
                        <p className="text-base md:text-xl text-slate-600 max-w-3xl mx-auto">
                            Jangkau audiens yang sangat bertarget dan terlibat aktif dalam meningkatkan kesehatan finansial mereka.
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
                            icon={<BarChart3 className="h-8 w-8 text-green-600" />}
                            value="75%"
                            label="Keterlibatan Pengguna Aktif (est.)"
                            colorClass="bg-green-100"
                        />
                         <StatCard 
                            icon={<Users className="h-8 w-8 text-red-600" />}
                            value="22-40 thn"
                            label="Demografi Usia Inti"
                            colorClass="bg-red-100"
                        />
                    </div>
                </div>
            </section>
            
            <section className="px-6 py-20">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                         <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                           Peluang Kemitraan
                         </h2>
                         <p className="text-base md:text-xl text-slate-600 max-w-3xl mx-auto">
                           Kami menawarkan berbagai cara untuk berkolaborasi yang dapat disesuaikan dengan tujuan merek Anda.
                         </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <OpportunityCard 
                            icon={<Megaphone className="h-7 w-7 text-blue-600"/>}
                            title="Penempatan Merek & Logo"
                            description="Tampilkan merek Anda secara strategis di dalam aplikasi, seperti pada halaman pemuatan, dasbor, atau bagian fitur tertentu untuk meningkatkan visibilitas."
                        />
                        <OpportunityCard 
                            icon={<Newspaper className="h-7 w-7 text-indigo-600"/>}
                            title="Konten Bersponsor"
                            description="Integrasikan merek Anda melalui konten edukatif yang relevan, seperti artikel tips keuangan atau webinar yang disponsori, yang memberikan nilai tambah bagi pengguna kami."
                        />
                        <OpportunityCard 
                            icon={<HeartHandshake className="h-7 w-7 text-green-600"/>}
                            title="Kemitraan Fitur"
                            description="Berkolaborasi dalam pengembangan fitur baru yang sejalan dengan produk atau layanan Anda, menciptakan integrasi yang mendalam dan bermanfaat bagi kedua pihak."
                        />
                        <OpportunityCard 
                            icon={<CalendarCheck className="h-7 w-7 text-red-600"/>}
                            title="Sponsor Acara Komunitas"
                            description="Dukung acara online atau offline kami yang berfokus pada literasi keuangan, dan posisikan merek Anda sebagai pemimpin dalam pemberdayaan finansial."
                        />
                    </div>
                </div>
            </section>
            
            <section className="px-6 py-20 bg-slate-950 text-white">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Mari Berkolaborasi untuk Masa Depan Finansial yang Lebih Baik
                </h2>
                <p className="text-base md:text-xl mb-8 opacity-90">
                  Jika merek Anda memiliki visi yang sama untuk meningkatkan literasi dan kesejahteraan finansial, kami ingin mendengar dari Anda. Mari diskusikan bagaimana kita bisa tumbuh bersama.
                </p>
                <Button asChild size="lg" className="text-base md:text-lg py-5 md:py-6 px-8 bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl group">
                  <a href="mailto:jagaduitofficial@gmail.com?subject=Peluang Sponsor Jaga Duit" className="flex items-center gap-2">
                    Diskusikan Kemitraan
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
              </div>
            </section>
        </main>
    </div>
  );
}
