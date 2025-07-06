'use client';

import { useMemo, useState } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { getSmartSavingTips } from '@/ai/flows/smart-savings-tips';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, TrendingUp, TrendingDown, Target, Loader2, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

export function Dashboard() {
  const { transactions, goals, profile } = useAppData();
  const [insights, setInsights] = useState<{ savingTips: string[], goalStatusUpdates: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { totalIncome, totalExpenses, balance } = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return { totalIncome: income, totalExpenses: expenses, balance: income - expenses };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  const handleGetInsights = async () => {
    setIsLoading(true);
    setInsights(null);
    try {
      const formattedGoals = goals.map(g => ({
        goalName: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount
      }));
      
      const formattedTransactions = transactions.map(t => ({
          category: t.category,
          amount: t.amount,
          date: t.date,
      }));

      const incomeTransactions = transactions.filter(t => t.type === 'income').map(t => ({...t}));
      const expenseTransactions = transactions.filter(t => t.type === 'expense').map(t => ({...t}));

      const result = await getSmartSavingTips({
        income: incomeTransactions,
        expenses: expenseTransactions,
        financialGoals: formattedGoals,
      });
      setInsights(result);
    } catch (error) {
      console.error('Failed to get insights:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch AI-powered insights. Please try again later.',
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
        <h2 className="text-3xl font-bold tracking-tight">Welcome back, {profile.name}!</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals.length}</div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
             {recentTransactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                            <div className="font-medium">{t.category}</div>
                            <div className={`text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type}</div>
                        </TableCell>
                        <TableCell>{format(new Date(t.date), 'PPP')}</TableCell>
                        <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No transactions yet. Add one to get started!</p>
              )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Goals Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length > 0 ? (
              goals.map((goal) => (
                <div key={goal.id}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <Progress value={(goal.currentAmount / goal.targetAmount) * 100} />
                </div>
              ))
            ) : (
                <p className="text-sm text-muted-foreground">No goals defined. Set a goal to track your progress.</p>
            )}
          </CardContent>
        </Card>
      </div>
       <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <CardTitle className="flex items-center gap-2"><Lightbulb className="text-accent-foreground" /> Smart Savings Tips</CardTitle>
                    <CardDescription>Get AI-powered advice to improve your finances.</CardDescription>
                </div>
                <Button onClick={handleGetInsights} disabled={isLoading || transactions.length < 3}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Generating...' : 'Get Tips'}
                </Button>
            </div>
            {transactions.length < 3 && <p className="text-sm text-muted-foreground mt-2">Add at least 3 transactions to enable AI insights.</p>}
          </CardHeader>
          {insights && (
            <CardContent>
                <div className="space-y-4">
                    {insights.savingTips.length > 0 && <Alert>
                        <AlertTitle>Savings Tips</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-5 space-y-1">
                                {insights.savingTips.map((tip, index) => <li key={index}>{tip}</li>)}
                            </ul>
                        </AlertDescription>
                    </Alert>}
                     {insights.goalStatusUpdates.length > 0 && <Alert>
                        <AlertTitle>Goal Status Updates</AlertTitle>
                        <AlertDescription>
                            <ul className="space-y-2">
                                {insights.goalStatusUpdates.map((update, index) => (
                                <li key={index}>
                                    <span className="font-semibold">{update.goalName}:</span> {update.status}
                                </li>))}
                            </ul>
                        </AlertDescription>
                    </Alert>}
                </div>
            </CardContent>
          )}
        </Card>
    </div>
  );
}
