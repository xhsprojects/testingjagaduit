'use client';

import { useMemo } from 'react';
import { useAppData } from '@/contexts/app-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, XAxis, YAxis, Tooltip, Bar, ResponsiveContainer, Legend } from 'recharts';

export function Reports() {
  const { transactions, profile } = useAppData();

  const spendingByCategory = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const categoryMap = new Map<string, number>();

    expenses.forEach((expense) => {
      const currentAmount = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, currentAmount + expense.amount);
    });
    
    return Array.from(categoryMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a,b) => b.amount - a.amount);
  }, [transactions]);
  
  const formatCurrency = (value: number) => `${profile.currency}${value.toFixed(2)}`;

  return (
    <div className="flex-1 space-y-4 p-2 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Spending Reports</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>
            Here's a breakdown of your expenses by category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {spendingByCategory.length > 0 ? (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingByCategory} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}}/>
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    formatter={(value: number) => [formatCurrency(value), 'Spent']}
                    />
                  <Legend />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" name="Spending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No expense data available. Add some transactions to see your spending report.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
