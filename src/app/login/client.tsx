
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Use standard Firebase Authentication for web
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  HandCoins, 
  Loader2, 
  Shield, 
  TrendingUp, 
  Sparkles, 
  Users, 
  Star,
  Coins,
  PiggyBank,
  Terminal,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginClientPage() {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // This effect will redirect the user to the dashboard if they are already logged in.
  useEffect(() => {
    if (!loading && user && isFirebaseConfigured) {
      router.push('/dasbor');
    }
  }, [user, loading, router, isFirebaseConfigured]);

  const handleSignIn = async () => {
    if (!auth || !googleProvider) {
        toast({
            title: 'Konfigurasi Error',
            description: 'Firebase belum terkonfigurasi. Tidak dapat login.',
            variant: 'destructive',
        });
        return;
    }
    setIsLoggingIn(true);
    try {
      // Use the standard Firebase Web SDK for Google sign-in
      await signInWithPopup(auth, googleProvider);

      // The onAuthStateChanged listener in AuthContext will now detect the new user,
      // and the useEffect above will redirect to the dashboard.
      toast({
        title: 'Login Berhasil',
        description: 'Selamat datang! Mengarahkan ke dasbor...',
      });

    } catch (error: any) {
      console.error("Google Sign-In Error: ", error);
      // Provide a helpful error message to the user
      toast({
        title: 'Login Gagal',
        description: 'Terjadi kesalahan saat login. Silakan coba lagi. Error: ' + (error.message || 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isFirebaseConfigured && !loading) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
            <Alert variant="destructive" className="max-w-lg border-2 border-dashed">
                <Terminal className="h-4 w-4" />
                <AlertTitle className="text-xl font-bold font-headline">Konfigurasi Firebase Tidak Lengkap</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                   <p>Aplikasi tidak dapat terhubung ke Firebase karena kunci API atau konfigurasi lainnya tidak ditemukan di environment variables.</p>
                   <p>Untuk menjalankan aplikasi, silakan tambahkan variabel berikut ke environment project Anda:</p>
                   <ul className="list-disc pl-5 font-mono text-xs">
                       <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
                       <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
                       <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                       <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
                       <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
                       <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
                   </ul>
                </AlertDescription>
            </Alert>
        </div>
      )
  }

  // Show a loading screen while auth state is being determined
  if (loading || (user && isFirebaseConfigured)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
             <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the mobile login page UI
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-12 relative overflow-hidden">
      {/* Subtle Money Background - Clean */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Coins className="absolute top-20 right-8 h-6 w-6 text-green-200 animate-pulse opacity-20" />
        <Coins className="absolute bottom-32 left-6 h-6 w-6 text-yellow-200 animate-pulse opacity-15" style={{ animationDelay: '1s' }} />
        <PiggyBank className="absolute top-1/2 right-4 h-5 w-5 text-pink-200 animate-pulse opacity-10" style={{ animationDelay: '2s' }} />
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen space-y-8 relative z-10">
        
        {/* Header with Logo */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-3">
                <div className="relative p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg">
                <HandCoins className="h-12 w-12 text-white" />
                </div>
                <h1 className="font-bold text-5xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight pb-2">
                Jaga Duit
                </h1>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-slate-800">
              Selamat Datang!
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed max-w-sm mx-auto">
              Kelola keuangan Anda dengan cerdas bersama{' '}
              <span className="font-semibold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                Asisten AI
              </span>
            </p>
          </div>
        </div>

        {/* Features Preview Cards */}
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center space-x-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm">
            <div className="relative p-3 bg-blue-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">Analisis Keuangan</p>
              <p className="text-sm text-slate-500">Wawasan mendalam dengan AI</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm">
            <div className="relative p-3 bg-green-100 rounded-xl">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">Keamanan Terjamin</p>
              <p className="text-sm text-slate-500">Enkripsi tingkat bank</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm">
            <div className="relative p-3 bg-purple-100 rounded-xl">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">Smart Insights</p>
              <p className="text-sm text-slate-500">Rekomendasi personal</p>
            </div>
          </div>
        </div>

        {/* Sign In Button */}
        <div className="w-full max-w-sm space-y-3">
          <Button 
            className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl" 
            onClick={handleSignIn} 
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Sedang Masuk...
              </>
            ) : (
              <>
                <svg className="mr-3 h-6 w-6" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 76.2C327.3 113.8 290.5 96 248 96c-88.8 0-160.1 71.9-160.1 160.1s71.3 160.1 160.1 160.1c98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Masuk dengan Google
              </>
            )}
          </Button>

          {/* Learn More Button - Moved Here */}
          <Button asChild variant="outline" className="w-full h-12 text-base font-medium border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 rounded-xl">
            <Link href="/" className="flex items-center justify-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Lihat Semua Fitur</span>
            </Link>
          </Button>

          {/* Security Note */}
          <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Login Aman</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Data Anda dilindungi dengan enkripsi end-to-end dan tidak akan dibagikan kepada pihak ketiga
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex items-center justify-center space-x-8 pt-6">
          <div className="flex items-center space-x-2 text-slate-500">
            <Users className="h-5 w-5" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">10K+</p>
              <p className="text-xs">Target Q3</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-slate-500">
            <Star className="h-5 w-5 text-yellow-500" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">4.8</p>
              <p className="text-xs">Rating</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-slate-500">
            <div className="relative">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">99%</p>
              <p className="text-xs">Kepuasan</p>
            </div>
          </div>
        </div>

        {/* Bottom spacing for safe area */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
