
"use client"

import * as React from 'react';
import type { SavingGoal, Expense } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { PlusCircle, Target, Pencil, Trash2, MinusCircle, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { awardAchievement } from '@/lib/achievements-manager';

interface SavingGoalsTrackerProps {
    goals: SavingGoal[];
    expenses: Expense[];
    onUpdateGoals: (goals: SavingGoal[]) => Promise<void>;
    onEditGoal: (goal: SavingGoal) => void;
    onGoalClick: (goal: SavingGoal) => void;
}

export default function SavingGoalsTracker({ goals, expenses, onUpdateGoals, onEditGoal, onGoalClick }: SavingGoalsTrackerProps) {
    const { user, achievements, idToken } = useAuth();
    const [goalToDelete, setGoalToDelete] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    const calculateGoalProgress = React.useCallback((goalId: string) => {
        return expenses
            .filter(e => e.savingGoalId === goalId)
            .reduce((sum, e) => sum + (e.baseAmount || e.amount), 0);
    }, [expenses]);

    React.useEffect(() => {
        if (!user) return;
        goals.forEach(goal => {
            const currentAmount = calculateGoalProgress(goal.id);
            if (currentAmount >= goal.targetAmount) {
                awardAchievement(user.uid, 'goal-conqueror', achievements, idToken);
            }
        });
    }, [goals, calculateGoalProgress, user, achievements, idToken]);

    const handleDeleteRequest = (goalId: string) => {
        setGoalToDelete(goalId);
    };

    const confirmDelete = async () => {
        if (!goalToDelete) return;
        setIsSubmitting(true);
        const updatedGoals = goals.filter(g => g.id !== goalToDelete);
        await onUpdateGoals(updatedGoals);
        toast({ title: "Sukses", description: "Tujuan berhasil dihapus." });
        setGoalToDelete(null);
        setIsSubmitting(false);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Progres Tujuan Anda</CardTitle>
                    <CardDescription>Lacak progres tabungan Anda. Klik kartu untuk melihat detail dan riwayat.</CardDescription>
                </CardHeader>
                <CardContent>
                    {goals.length > 0 ? (
                        <div className="space-y-4">
                            {goals.map(goal => {
                                const currentAmount = calculateGoalProgress(goal.id);
                                const progress = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
                                return (
                                    <div 
                                        key={goal.id}
                                        onClick={() => onGoalClick(goal)}
                                        className="border p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-background cursor-pointer hover:bg-secondary transition-colors"
                                    >
                                        <div className="flex-grow w-full">
                                            <div className="flex justify-between items-center mb-2 w-full">
                                                <p className="font-bold font-headline text-lg truncate" title={goal.name}>{goal.name}</p>
                                                <div className="flex items-center gap-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditGoal(goal)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(goal.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Progress value={progress} className="h-3"/>
                                            <div className="flex justify-between text-sm mt-1.5">
                                                <span className="font-semibold text-primary">{formatCurrency(currentAmount)}</span>
                                                <span className="text-muted-foreground">dari {formatCurrency(goal.targetAmount)}</span>
                                            </div>
                                            <p className="text-right text-sm font-bold text-muted-foreground mt-1">{progress.toFixed(1)}% tercapai</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <p>Anda belum memiliki tujuan menabung.</p>
                            <p className="text-sm">Gunakan tombol (+) di pojok kanan bawah untuk memulai.</p>
                        </div>
                    )}
                </CardContent>
                 {goals.length > 0 && (
                    <CardFooter>
                        <p className="text-xs text-muted-foreground">
                            * Progres dihitung berdasarkan alokasi dana ke masing-masing tujuan.
                        </p>
                    </CardFooter>
                )}
            </Card>

            <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus tujuan menabung secara permanen.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setGoalToDelete(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    
