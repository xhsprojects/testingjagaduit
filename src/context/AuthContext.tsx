// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, getIdToken } from 'firebase/auth';
import { auth, db, isFirebaseInitialized } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, onSnapshot, DocumentData, collection, query, orderBy } from 'firebase/firestore';
import type { UserAchievement, AppNotification, Reminder } from '@/lib/types';
import { awardUserXp } from '@/app/achievements/actions';
import { useToast } from '@/hooks/use-toast';
import { getMaintenanceStatus } from '@/app/admin/actions';

const ADMIN_UID = 'qyHqNRWBVaXEZjo1don6p0reXXH3';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  idToken: string | null;
  premiumExpiresAt: Date | null;
  achievements: UserAchievement[];
  notifications: AppNotification[];
  reminders: Reminder[];
  xp: number;
  level: number;
  theme: string;
  customThemeColor: string | null;
  isMaintenanceMode: boolean;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true, 
    isPremium: false,
    isAdmin: false,
    idToken: null,
    premiumExpiresAt: null,
    achievements: [],
    notifications: [],
    reminders: [],
    xp: 0,
    level: 1,
    theme: 'default',
    customThemeColor: null,
    isMaintenanceMode: false,
    isFirebaseConfigured: isFirebaseInitialized,
});

const convertTimestamps = (data: any): any => {
  if (!data) return data;

  if (data?.toDate) {
    return data.toDate();
  }

  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }

  if (typeof data === 'object' && data !== null && !data._seconds) {
    const newObj: { [key: string]: any } = {};
    for (const key of Object.keys(data)) {
      newObj[key] = convertTimestamps(data[key]);
    }
    return newObj;
  }
  
  return data;
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<Date | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [theme, setTheme] = useState('default');
  const [customThemeColor, setCustomThemeColor] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [hasXpReconciled, setHasXpReconciled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const status = await getMaintenanceStatus();
        setIsMaintenanceMode(status);
      } catch (error) {
        console.error("AuthContext: Failed to get maintenance status from server action:", error);
        setIsMaintenanceMode(false);
      }
    };
    if (isFirebaseInitialized) {
        checkMaintenance();
    }
  }, []);

  const handleUserSnapshot = useCallback((docSnap: DocumentData) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        const expiry = data.premiumExpiresAt?.toDate() || null;
        setPremiumExpiresAt(expiry);
        setIsPremium(expiry ? expiry > new Date() : false);
        setXp(data.xp || 0);
        setLevel(data.level || 1);
        setTheme(data.theme || 'default');
        setCustomThemeColor(data.customThemeColor || null);
    } else if (auth?.currentUser && db) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        setDoc(userDocRef, {
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName,
            photoURL: auth.currentUser.photoURL,
            lastLogin: serverTimestamp(),
            createdAt: serverTimestamp(),
            premiumExpiresAt: null,
            xp: 0,
            level: 1,
            theme: 'default',
            customThemeColor: null,
        }, { merge: true }).catch(error => console.error("Error setting user document:", error));
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseInitialized || !auth || !db) {
        setLoading(false);
        return;
    }

    let userUnsubscribe: (() => void) | null = null;
    let achievementsUnsubscribe: (() => void) | null = null;
    let notificationsUnsubscribe: (() => void) | null = null;
    let remindersUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (userUnsubscribe) userUnsubscribe();
      if (achievementsUnsubscribe) achievementsUnsubscribe();
      if (notificationsUnsubscribe) notificationsUnsubscribe();
      if (remindersUnsubscribe) remindersUnsubscribe();
      userUnsubscribe = null;
      achievementsUnsubscribe = null;
      notificationsUnsubscribe = null;
      remindersUnsubscribe = null;

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        userUnsubscribe = onSnapshot(userDocRef, handleUserSnapshot);
        
        const achievementsQuery = query(collection(db, 'users', user.uid, 'achievements'));
        achievementsUnsubscribe = onSnapshot(achievementsQuery, (snapshot) => {
          const userAchievements = snapshot.docs.map(doc => doc.data() as UserAchievement);
          setAchievements(userAchievements);
        });

        const notificationsQuery = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'));
        notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
             const notificationsData = snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() }) as AppNotification);
             setNotifications(notificationsData);
        });
        
        const remindersQuery = query(collection(db, 'users', user.uid, 'reminders'));
        remindersUnsubscribe = onSnapshot(remindersQuery, (snapshot) => {
          const userReminders = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Reminder);
          setReminders(userReminders);
        });

        setUser(user);
        setIsAdmin(user.uid === ADMIN_UID);
        try {
            const token = await getIdToken(user);
            setIdToken(token);
        } catch (error) {
            console.error("Error getting ID token:", error);
        }
      } else {
        setUser(null);
        setIsPremium(false);
        setPremiumExpiresAt(null);
        setIsAdmin(false);
        setIdToken(null);
        setAchievements([]);
        setNotifications([]);
        setReminders([]);
        setXp(0);
        setLevel(1);
        setTheme('default');
        setCustomThemeColor(null);
        setHasXpReconciled(false);
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (userUnsubscribe) userUnsubscribe();
      if (achievementsUnsubscribe) achievementsUnsubscribe();
      if (notificationsUnsubscribe) notificationsUnsubscribe();
      if (remindersUnsubscribe) remindersUnsubscribe();
    };
  }, [handleUserSnapshot]);

  useEffect(() => {
      if (!isFirebaseInitialized || !auth) return;
      const getFreshToken = async () => {
        if (auth.currentUser) {
            try {
                const token = await getIdToken(auth.currentUser, true);
                setIdToken(token);
            } catch (error) {
                console.error("Error refreshing token:", error);
            }
        }
      }
      const interval = setInterval(getFreshToken, 15 * 60 * 1000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isFirebaseInitialized) return;

    const reconcileXp = async () => {
      if (user && idToken && achievements.length > 0 && !loading && !hasXpReconciled) {
        const xpFromAchievements = achievements.length * 150; // Use new XP value
        
        const currentXp = xp;

        if (currentXp < xpFromAchievements) {
          const missingXp = xpFromAchievements - currentXp;
          console.log(`Reconciling XP. User has ${currentXp}, but should have at least ${xpFromAchievements} from achievements. Awarding ${missingXp} XP.`);
          
          try {
            const result = await awardUserXp(missingXp, idToken);
            if (result.success) {
              toast({ title: "Sinkronisasi Poin Selesai", description: `Anda menerima ${missingXp} XP dari penyesuaian sistem prestasi.` });
              if (result.leveledUp) {
                toast({ title: '🎉 Naik Level!', description: `Selamat! Anda telah mencapai Level ${result.newLevel}. Tema baru mungkin terbuka!` });
              }
            } else {
              console.error("XP reconciliation failed:", result.message);
            }
          } catch (error) {
            console.error("Error during XP reconciliation:", error);
          }
        }
        setHasXpReconciled(true);
      }
    };

    reconcileXp();
  }, [user, idToken, achievements, xp, loading, hasXpReconciled, toast]);

  const contextValue = { user, loading, isPremium, isAdmin, idToken, premiumExpiresAt, achievements, notifications, reminders, xp, level, theme, customThemeColor, isMaintenanceMode, isFirebaseConfigured: isFirebaseInitialized };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
