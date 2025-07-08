
"use client"

import * as React from 'react';
import type { SavingGoal, Expense } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Target, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { awardAchievement } from '@/lib/achievements-manager';

interface SavingGoalsTrackerProps {
    goals: SavingGoal[];
    expenses: Expense[];
    onGoalClick: (goal: SavingGoal) => void;
}

export default function SavingGoalsTracker({ goals, expenses, onGoalClick }: SavingGoalsTrackerProps) {
    const { user, achievements, idToken } = useAuth();
    
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

    return (
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
                                    className="border p-4 rounded-lg flex items-center gap-4 bg-background cursor-pointer hover:bg-secondary transition-colors"
                                >
                                    <Target className="h-8 w-8 text-primary flex-shrink-0" />
                                    <div className="flex-grow w-full">
                                        <div className="flex justify-between items-center mb-2 w-full">
                                            <p className="font-bold font-headline text-lg truncate" title={goal.name}>{goal.name}</p>
                                        </div>
                                        <Progress value={progress} className="h-3"/>
                                        <div className="flex justify-between text-sm mt-1.5">
                                            <span className="font-semibold text-primary">{formatCurrency(currentAmount)}</span>
                                            <span className="text-muted-foreground">dari {formatCurrency(goal.targetAmount)}</span>
                                        </div>
                                        <p className="text-right text-sm font-bold text-muted-foreground mt-1">{progress.toFixed(1)}% tercapai</p>
                                    </div>
                                    <ChevronRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
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
    );
}

    