
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const InstallPwaPrompt: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    // Check if it's not already in standalone mode
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

    if (isIosDevice && !isInStandaloneMode) {
      setIsIos(true);
      setIsVisible(true);
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    setIsVisible(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };
  
  // Don't show if not visible or if it's already installed.
  if (!isVisible) return null;
  if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) return null;
  

  const renderContent = () => {
    if (isIos && !installPrompt) {
      // iOS specific instructions
      return (
        <div className="flex items-center gap-3">
            <img src="/icons/icon-192x192.png" alt="Jaga Duit Logo" className="h-12 w-12" />
            <div className="flex-grow">
                <h3 className="font-bold">Instal Aplikasi Jaga Duit</h3>
                <p className="text-sm text-muted-foreground">
                    Tekan tombol Bagikan <Share className="inline-block h-3 w-3" /> lalu pilih "Tambah ke Layar Utama".
                </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleDismiss}>
                <X className="h-4 w-4"/>
                <span className="sr-only">Tutup</span>
            </Button>
        </div>
      )
    }

    if (installPrompt) {
      // Android/Desktop prompt
      return (
        <div className="flex items-center gap-4">
            <img src="/icons/icon-192x192.png" alt="Jaga Duit Logo" className="h-12 w-12" />
            <div className="flex-grow">
                <h3 className="font-bold">Instal Aplikasi Jaga Duit</h3>
                <p className="text-sm text-muted-foreground">Dapatkan akses lebih cepat dan pengalaman terbaik.</p>
            </div>
             <Button size="sm" onClick={handleInstallClick}>
                <Download className="mr-2 h-4 w-4"/>
                Instal
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
                <X className="h-4 w-4"/>
                <span className="sr-only">Tutup</span>
            </Button>
        </div>
      )
    }

    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Card className="p-4 shadow-lg animate-in slide-in-from-bottom-10 duration-500">
        {renderContent()}
      </Card>
    </div>
  );
};

export default InstallPwaPrompt;
