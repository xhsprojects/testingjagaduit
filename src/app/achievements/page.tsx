
"use client"

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { allBadges, LEVEL_THRESHOLDS } from '@/lib/achievements';
import { updateUserTheme, updateUserCustomThemeColor } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, Trophy, Check, Palette, Loader2, Star } from 'lucide-react';
import { iconMap } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const themes = [
    { name: 'Default', id: 'default', colors: ['bg-primary', 'bg-secondary', 'bg-accent'], requiredLevel: 1 },
    { name: 'Forest', id: 'forest', colors: ['bg-[#558B6E]', 'bg-[#DCE5E1]', 'bg-[#6EE3B4]'], requiredLevel: 3 },
    { name: 'Sunset', id: 'sunset', colors: ['bg-[#F27830]', 'bg-[#FBE9DE]', 'bg-[#E64B5E]'], requiredLevel: 5 },
    { name: 'Ocean', id: 'ocean', colors: ['bg-[#3b82f6]', 'bg-[#dbeafe]', 'bg-[#34d399]'], requiredLevel: 8 },
    { name: 'Midnight', id: 'midnight', colors: ['bg-[#8b5cf6]', 'bg-[#4c1d95]', 'bg-[#ec4899]'], requiredLevel: 15 },
    { name: 'Sakura', id: 'sakura', colors: ['bg-[#f472b6]', 'bg-[#fce7f3]', 'bg-[#a78bfa]'], requiredLevel: 22 },
    { name: 'Cosmic', id: 'cosmic', colors: ['bg-[#6366f1]', 'bg-[#e0e7ff]', 'bg-[#a5b4fc]'], requiredLevel: 26 },
    { name: 'Gold', id: 'gold', colors: ['bg-[#e6b800]', 'bg-[#fdf8e6]', 'bg-[#f5a623]'], requiredLevel: 28 },
];

const CUSTOM_THEME_UNLOCK_LEVEL = 30;

const LevelProgressCard = ({ xp, level }: { xp: number; level: number }) => {
    const currentLevelXpStart = LEVEL_THRESHOLDS[level - 1] ?? 0;
    const nextLevelXpTarget = LEVEL_THRESHOLDS[level] ?? (currentLevelXpStart + 100);
    const xpIntoCurrentLevel = xp - currentLevelXpStart;
    const xpForNextLevel = nextLevelXpTarget - currentLevelXpStart;
    const progress = xpForNextLevel > 0 ? (xpIntoCurrentLevel / xpForNextLevel) * 100 : 100;
    const xpToNextLevel = nextLevelXpTarget - xp;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Level Anda</CardTitle>
                <CardDescription>Dapatkan Poin Pengalaman (XP) dengan mencatat transaksi dan meraih prestasi untuk naik level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                    <p className="text-3xl font-bold font-headline text-primary">Level {level}</p>
                    <p className="text-sm font-semibold">Total: {xp.toLocaleString()} XP</p>
                </div>
                <Progress value={progress} />
                <div className="text-center text-xs text-muted-foreground">
                    <span>{xpToNextLevel > 0 ? `${xpToNextLevel.toLocaleString()} XP lagi menuju Level ${level + 1}` : 'Level Maksimal Tercapai!'}</span>
                </div>
            </CardContent>
        </Card>
    );
};

const CustomThemeSelector = ({ idToken, customThemeColor: initialColor, userLevel }: { idToken: string | null, customThemeColor: string | null, userLevel: number }) => {
    const { toast } = useToast();
    const [color, setColor] = React.useState(initialColor || '#3b82f6');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const isUnlocked = userLevel >= CUSTOM_THEME_UNLOCK_LEVEL;

    React.useEffect(() => {
        setColor(initialColor || '#3b82f6');
    }, [initialColor]);

    const handleSave = async () => {
        if (!idToken || !isUnlocked) return;
        setIsSubmitting(true);
        const result = await updateUserCustomThemeColor(color, idToken);
        if (result.success) {
            toast({ title: 'Warna Diperbarui!', description: 'Warna tema kustom Anda telah disimpan.' });
        } else {
            toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    return (
        <Card className="relative">
             <CardHeader>
                <CardTitle className="font-headline flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        Warna Kustom
                    </span>
                    <Badge variant="destructive">Terbatas</Badge>
                </CardTitle>
                <CardDescription>Eksklusif Level {CUSTOM_THEME_UNLOCK_LEVEL}: Atur warna primer aplikasi sesuai keinginan Anda.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                     <div className="relative">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-16 h-10 p-0 border-none rounded-md cursor-pointer bg-card appearance-none"
                            style={{'WebkitAppearance': 'none'} as React.CSSProperties}
                        />
                     </div>
                     <div className="flex-1 p-2 rounded-md bg-secondary">
                        <p className="font-mono text-sm uppercase font-semibold text-center tracking-widest">{color}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSave} disabled={isSubmitting || !isUnlocked} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Terapkan Warna Kustom
                </Button>
            </CardFooter>

            {!isUnlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-md p-1 text-center">
                    <Lock className="h-8 w-8 text-muted-foreground"/>
                    <p className="text-lg font-semibold text-muted-foreground mt-2">Terkunci</p>
                    <p className="text-sm text-muted-foreground">Tersedia di Level {CUSTOM_THEME_UNLOCK_LEVEL}</p>
                </div>
            )}
        </Card>
    );
};

const ThemeSelector = ({ currentTheme, idToken, userLevel }: { currentTheme: string, idToken: string | null, userLevel: number }) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState<string | null>(null);
    const isCustomActive = currentTheme === 'custom';

    const handleThemeChange = async (themeId: string) => {
        if (!idToken || currentTheme === themeId) return;
        setIsSubmitting(themeId);
        try {
            const result = await updateUserTheme(themeId, idToken);
            if (result.success) {
                toast({ title: 'Sukses', description: 'Tema berhasil diubah.' });
            } else {
                toast({ title: 'Gagal', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Terjadi kesalahan saat mengubah tema.', variant: 'destructive' });
        } finally {
            setIsSubmitting(null);
        }
    }

    return (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><Palette/> Kustomisasi Tampilan</CardTitle>
                <CardDescription>Personalisasi tampilan aplikasi. Buka tema baru dengan menaikkan level Anda!</CardDescription>
            </CardHeader>
            <CardContent>
                {isCustomActive && (
                    <Alert className="mb-4">
                        <Palette className="h-4 w-4"/>
                        <AlertTitle>Mode Kustom Aktif</AlertTitle>
                        <AlertDescription>
                            Pilih tema di bawah untuk kembali ke setelan default.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {themes.map(theme => {
                        const isUnlocked = userLevel >= theme.requiredLevel;
                        const isSelected = !isCustomActive && currentTheme === theme.id;
                        return (
                            <div key={theme.id} className="relative">
                                <Button
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="h-auto w-full flex-col gap-2 p-4"
                                    onClick={() => handleThemeChange(theme.id)}
                                    disabled={!!isSubmitting || !isUnlocked}
                                >
                                    {isSubmitting === theme.id ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                        <div className="flex items-center gap-2">
                                            {theme.colors.map((color, index) => (
                                                <div key={index} className={cn("h-5 w-5 rounded-full border", color)} />
                                            ))}
                                        </div>
                                    )}
                                    <span className={cn("w-full text-center", !isUnlocked && "invisible")}>{theme.name}</span>
                                </Button>
                                {!isUnlocked && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-md p-1 text-center">
                                        <Lock className="h-5 w-5 text-muted-foreground"/>
                                        <p className="text-sm font-semibold text-muted-foreground mt-1">{theme.name}</p>
                                        <p className="text-xs text-muted-foreground">Level {theme.requiredLevel}</p>
                                    </div>
                                )}
                                {isSelected && <Check className="absolute top-2 right-2 h-4 w-4 text-primary-foreground" />}
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default function AchievementsPage() {
    const { user, loading, achievements, xp, level, theme, customThemeColor, idToken } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);
    
    const unlockedBadgeIds = React.useMemo(() => new Set(achievements.map(a => a.badgeId)), [achievements]);
    const achievementsMap = React.useMemo(() => new Map(achievements.map(a => [a.badgeId, a])), [achievements]);

    if (loading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-secondary">
                <div className="text-lg font-semibold text-primary">Memuat Prestasi...</div>
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 pb-16">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <h1 className="font-headline text-xl font-bold text-foreground">
                        Jejak Prestasi Anda
                    </h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <LevelProgressCard xp={xp} level={level} />
                   <ThemeSelector currentTheme={theme} idToken={idToken} userLevel={level} />
                   <CustomThemeSelector idToken={idToken} customThemeColor={customThemeColor} userLevel={level} />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Lencana Anda</CardTitle>
                        <CardDescription>Kumpulkan semua lencana dengan mencapai tonggak finansial.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {allBadges.map(badge => {
                            const isUnlocked = unlockedBadgeIds.has(badge.id);
                            const achievement = achievementsMap.get(badge.id);
                            const Icon = iconMap[badge.icon];
                            
                            return (
                                <Card key={badge.id} className={cn("flex flex-col text-center items-center transition-all p-4", !isUnlocked && "bg-secondary/50 text-muted-foreground")}>
                                    <CardHeader className="p-0 pb-4">
                                        <div className={cn("mx-auto flex h-20 w-20 items-center justify-center rounded-full transition-colors", isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/50")}>
                                            {isUnlocked ? <Icon className="h-10 w-10" /> : <Lock className="h-10 w-10" />}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow p-0">
                                        <CardTitle className={cn("font-headline text-lg", isUnlocked ? "text-foreground" : "text-muted-foreground")}>
                                            {badge.isSecret && !isUnlocked ? 'Prestasi Rahasia' : badge.name}
                                        </CardTitle>
                                        <p className="text-sm mt-1">
                                            {badge.isSecret && !isUnlocked ? 'Teruslah berusaha untuk membukanya!' : badge.description}
                                        </p>
                                        {isUnlocked && achievement?.unlockedAt && (
                                            <p className="text-xs text-primary font-semibold mt-2">
                                                Diraih pada {format(new Date(achievement.unlockedAt.seconds * 1000), "d MMMM yyyy", { locale: idLocale })}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
