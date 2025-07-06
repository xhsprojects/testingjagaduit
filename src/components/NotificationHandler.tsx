
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
      // 1. Request permission from the user
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('User denied notification permission.');
        return;
      }
        
      // 2. Get the VAPID key from environment variables
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

      // 3. Ensure the service worker is ready and get the registration
      const registration = await navigator.serviceWorker.ready;

      // 4. Send Firebase config to the active service worker
      // This is more reliable than using navigator.serviceWorker.controller
      if (registration.active) {
        const firebaseConfig = messaging.app.options;
        registration.active.postMessage({
          type: 'SET_FIREBASE_CONFIG',
          config: firebaseConfig,
        });
      }

      // 5. Get the FCM token using the registration
      const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      
      // 6. Save the token to Firestore for this user
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
  }, [user, idToken, toast, messaging]);

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
