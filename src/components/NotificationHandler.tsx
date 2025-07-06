
"use client";

import { useEffect, useCallback } from 'react';
import { messaging } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { saveNotificationToken } from '@/app/notifications/actions';

export default function NotificationHandler() {
  const { user, idToken } = useAuth();
  const { toast } = useToast();

  const requestPermissionAndSaveToken = useCallback(async () => {
    // Ensure all dependencies are available and we are in a browser context
    if (!messaging || !user || !idToken || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('User denied notification permission.');
        return;
      }
        
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
          console.error('VAPID key not found in environment variables.');
          toast({
              title: "Konfigurasi Notifikasi Error",
              description: "Kunci VAPID untuk notifikasi web tidak ditemukan.",
              variant: "destructive"
          });
          return;
      }

      // The service worker is now self-sufficient, we just need to get the token.
      const currentToken = await getToken(messaging, { vapidKey });
      
      if (currentToken) {
        await saveNotificationToken(idToken, currentToken);
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }

    } catch (err) {
      console.error('An error occurred while setting up notifications: ', err);
      toast({
        title: "Gagal Mengaktifkan Notifikasi",
        description: "Terjadi kesalahan. Coba muat ulang halaman atau periksa setelan browser Anda.",
        variant: "destructive"
      });
    }
  }, [user, idToken, toast]);

  // Run the setup process when the user logs in
  useEffect(() => {
    if (user && idToken) {
      requestPermissionAndSaveToken();
    }
  }, [user, idToken, requestPermissionAndSaveToken]);

  // Listen for messages when the app is in the foreground
  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received. ', payload);
      const { title, body } = payload.notification || {};
      
      // Show a toast notification for foreground messages
      if (title && body) {
          toast({
            title: title,
            description: body,
          });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [toast]);

  return null; // This component does not render anything.
}
