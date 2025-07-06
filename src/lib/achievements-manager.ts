
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { allBadges } from './achievements';
import type { UserAchievement } from './types';
import { toast } from '@/hooks/use-toast';
import { awardUserXp } from '@/app/achievements/actions';

/**
 * Awards an achievement to a user if they haven't unlocked it already.
 * It writes the achievement to Firestore, awards XP, and shows toast notifications.
 * @param userId The ID of the user.
 * @param badgeId The ID of the badge to award.
 * @param currentAchievements The user's current list of achievements.
 * @param idToken The user's Firebase ID token for authentication.
 */
export const awardAchievement = async (
  userId: string,
  badgeId: string,
  currentAchievements: UserAchievement[],
  idToken: string | null
): Promise<void> => {
  const isAlreadyUnlocked = currentAchievements.some(a => a.badgeId === badgeId);
  if (isAlreadyUnlocked) {
    return;
  }

  const badge = allBadges.find(b => b.id === badgeId);
  if (!badge) {
    console.error(`Badge with id ${badgeId} not found.`);
    return;
  }

  const newAchievement = {
    badgeId,
    unlockedAt: serverTimestamp(),
  };
  
  try {
    const achievementDocRef = doc(db, 'users', userId, 'achievements', badgeId);
    await setDoc(achievementDocRef, newAchievement);
    
    toast({
      title: '🏆 Prestasi Terbuka!',
      description: `Anda mendapatkan lencana: ${badge.name}`,
    });
    
    if (!idToken) {
        console.warn("Cannot award XP because ID token is not available.");
        toast({
            title: "Gagal Sinkronisasi XP",
            description: "Sesi Anda tidak valid. Silakan muat ulang halaman.",
            variant: "destructive"
        });
        return;
    }

    // Award XP for the achievement and check for level up
    const xpResult = await awardUserXp(150, idToken);
    
    if (xpResult.success) {
        if (xpResult.leveledUp) {
            toast({
              title: '🎉 Naik Level!',
              description: `Selamat! Anda telah mencapai Level ${xpResult.newLevel}. Tema baru mungkin terbuka!`,
            });
        }
    } else {
        // If awarding XP fails, show a toast to the user
        toast({
            title: "Gagal Sinkronisasi XP",
            description: xpResult.message,
            variant: "destructive"
        });
    }

  } catch (error: any) {
    console.error(`Failed to award achievement '${badgeId}':`, error);
    toast({
        title: "Error Prestasi",
        description: `Gagal menyimpan prestasi: ${error.message}`,
        variant: "destructive"
    });
  }
};
