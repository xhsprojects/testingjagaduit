"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

interface BudgetChartProps {
    data: {
        name: string;
        spent: number;
        budget: number;
    }[];
}

const COLORS = ["#4F46E5", "#F97316", "#14B8A6", "#22C55E", "#EF4444", "#0EA5E9", "#A855F7"];

export default function BudgetChart({ data }: BudgetChartProps) {
  const chartData = data.filter(item => item.spent > 0).map(item => ({
      name: item.name,
      spent: item.spent,
  }));
  
  const totalSpent = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.spent, 0)
  }, [data]);

  const chartConfig = React.useMemo(() => {
    const config: any = {};
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  if (totalSpent <= 0) {
      return (
          <div className="flex h-[200px] flex-col items-center justify-center text-slate-400 text-sm italic">
              <p>Belum ada data pengeluaran.</p>
          </div>
      );
  }

  return (
    <div className="flex flex-row items-center gap-6">
        <div className="relative w-32 h-32 flex-shrink-0">
            <ChartContainer
                config={chartConfig}
                className="w-full h-full"
            >
                <PieChart>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={chartData}
                        dataKey="spent"
                        nameKey="name"
                        innerRadius="65%"
                        outerRadius="100%"
                        strokeWidth={0}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ChartContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-medium text-slate-400">Total</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">100%</span>
            </div>
        </div>
        <div className="flex-1 space-y-3">
            {chartData.slice(0, 4).map((item, index) => {
                const percentage = ((item.spent / totalSpent) * 100).toFixed(0);
                return (
                    <div key={item.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <span 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: COLORS[index % COLORS.length], boxShadow: `0 0 8px ${COLORS[index % COLORS.length]}80` }}
                            ></span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{percentage}%</span>
                    </div>
                )
            })}
        </div>
    </div>
  )
}
