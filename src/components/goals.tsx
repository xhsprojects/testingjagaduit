'use client';

import { useState } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Target, Trash2, Lightbulb, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getGoalStatusInsights } from '@/ai/flows/goal-status-insights';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required.'),
  targetAmount: z.coerce.number().min(1, 'Target amount must be positive.'),
  currentAmount: z.coerce.number().min(0, 'Current amount cannot be negative.'),
  deadline: z.string().min(1, 'Deadline is required.'),
});

type GoalFormData = z.infer<typeof goalSchema>;

export function Goals() {
  const { goals, setGoals, profile, transactions } = useAppData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [insights, setInsights] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
        currentAmount: 0,
        deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    }
  });

  const onSubmit = (data: GoalFormData) => {
    const newGoal = {
      id: crypto.randomUUID(),
      ...data,
    };
    setGoals([...goals, newGoal]);
    reset();
    setIsDialogOpen(false);
    toast({
        title: "Success",
        description: "Goal added successfully.",
    });
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    toast({
        title: "Success",
        description: "Goal deleted.",
    });
  };

  const handleGetInsights = async () => {
    setIsLoading(true);
    setInsights(null);
    try {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'expense').map(t => ({category: t.category, amount: t.amount}));
        
        const result = await getGoalStatusInsights({ goals, income, expenses });
        setInsights(result.insights);
    } catch (error) {
      console.error('Failed to get insights:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch AI-powered insights for goals. Please try again.',
      });
    }
    setIsLoading(false);
  };
  
  const formatCurrency = (amount: number) => {
    return `${profile.currency}${amount.toFixed(2)}`;
  };

  return (
    <div className="flex-1 space-y-4 p-2 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Financial Goals</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Goal</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set a New Goal</DialogTitle>
              <DialogDescription>Define your financial target and track your progress.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Goal Name</Label>
                    <Input id="name" {...register('name')} />
                    {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="targetAmount">Target Amount</Label>
                    <Input id="targetAmount" type="number" step="1" {...register('targetAmount')} />
                    {errors.targetAmount && <p className="text-red-500 text-sm">{errors.targetAmount.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="currentAmount">Current Amount</Label>
                    <Input id="currentAmount" type="number" step="1" {...register('currentAmount')} />
                    {errors.currentAmount && <p className="text-red-500 text-sm">{errors.currentAmount.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" {...register('deadline')} />
                    {errors.deadline && <p className="text-red-500 text-sm">{errors.deadline.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Goal</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

       <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <CardTitle className="flex items-center gap-2"><Lightbulb className="text-accent-foreground" /> Goal Status Insights</CardTitle>
                    <CardDescription>Get AI analysis on your goal progress.</CardDescription>
                </div>
                <Button onClick={handleGetInsights} disabled={isLoading || goals.length === 0}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Analyzing...' : 'Get Insights'}
                </Button>
            </div>
             {goals.length === 0 && <p className="text-sm text-muted-foreground mt-2">Add a goal to enable AI insights.</p>}
          </CardHeader>
          {insights && (
            <CardContent>
                <Alert>
                    <AlertTitle>AI-Powered Goal Analysis</AlertTitle>
                    <AlertDescription>
                        <ul className="space-y-3 mt-2">
                            {insights.map((insight, index) => (
                                <li key={index} className="border-b pb-2 last:border-b-0">
                                    <p><strong className="font-semibold">{insight.goalName}:</strong> {insight.status}</p>
                                    <p className="text-muted-foreground text-sm mt-1"><strong>Suggestion:</strong> {insight.suggestions}</p>
                                </li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            </CardContent>
          )}
        </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map(goal => (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Target className="text-primary"/>{goal.name}</CardTitle>
                    <CardDescription>Deadline: {goal.deadline}</CardDescription>
                  </div>
                   <Button variant="ghost" size="icon" onClick={() => deleteGoal(goal.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                   </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={(goal.currentAmount / goal.targetAmount) * 100} />
                <div className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{formatCurrency(goal.currentAmount)}</span> of {formatCurrency(goal.targetAmount)}
                </div>
              </div>
            </CardContent>
            <CardFooter>
                 <p className="text-sm text-green-600 font-medium">
                    {(((goal.currentAmount / goal.targetAmount) * 100)).toFixed(1)}% completed
                 </p>
            </CardFooter>
          </Card>
        ))}
      </div>
       {goals.length === 0 && <p className="text-center text-muted-foreground py-10">You haven't set any goals yet.</p>}
    </div>
  );
}
