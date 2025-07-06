
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
    if (!messaging || !user || !idToken || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.error('VAPID key not found in environment variables.');
            toast({
                title: "Konfigurasi Notifikasi Error",
                description: "VAPID key untuk notifikasi web tidak ditemukan.",
                variant: "destructive"
            });
            return;
        }

        // Ensure the service worker is ready before getting the token
        const registration = await navigator.serviceWorker.ready;
        const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        
        if (currentToken) {
          await saveNotificationToken(idToken, currentToken);
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      }
    } catch (err) {
      console.error('An error occurred while retrieving token. ', err);
    }
  }, [user, idToken, toast]);

  useEffect(() => {
    // We only need to request permission once the user is logged in.
    if (user) {
      requestPermissionAndSaveToken();
    }
  }, [user, requestPermissionAndSaveToken]);

  useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received. ', payload);
      const { title, body } = payload.notification || {};
      
      // When the app is in the foreground, we manually create a notification
      // so the user sees it, which mimics the background behavior.
      if (title && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body: body,
            icon: '/icons/icon-192x192.png',
            data: {
                url: payload.fcmOptions?.link || payload.data?.link || '/'
            }
          });
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null; // This component does not render anything.
}
