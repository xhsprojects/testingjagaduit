"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview This component previously handled FCM push notification setup.
 * Push notifications to devices have been removed to prioritize in-app notifications.
 * This component is now inert but kept for potential future internal signaling.
 */
export default function NotificationHandler() {
  const { user, idToken, notifications } = useAuth();
  const { toast } = useToast();

  // Show a toast only for very important new unread notifications that arrive while the user is active
  useEffect(() => {
    if (!user || !notifications || notifications.length === 0) return;

    const latestNotif = notifications[0];
    const isNew = latestNotif.createdAt && (Date.now() - latestNotif.createdAt.toDate().getTime() < 10000); // Created in last 10s

    if (!latestNotif.isRead && isNew) {
        toast({
            title: latestNotif.title,
            description: latestNotif.body,
        });
    }
  }, [notifications, user, toast]);

  return null; 
}
