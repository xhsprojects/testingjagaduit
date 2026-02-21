
"use client"

import * as React from "react"
import { formatCurrency } from "@/lib/utils"

interface BudgetChartProps {
    data: {
        name: string;
        spent: number;
        budget: number;
    }[];
}

const COLORS = ["#6366F1", "#F97316", "#14B8A6", "#22C55E", "#EF4444", "#0EA5E9", "#A855F7"];

export default function BudgetChart({ data }: BudgetChartProps) {
  const chartData = data.filter(item => item.spent > 0).map(item => ({
      name: item.name,
      spent: item.spent,
  })).sort((a, b) => b.spent - a.spent);
  
  const totalSpent = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.spent, 0)
  }, [data]);

  if (totalSpent <= 0) {
      return (
          <div className="flex h-[150px] flex-col items-center justify-center text-slate-400 text-xs italic">
              <p>Belum ada data pengeluaran.</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
        {/* Horizontal Progress Bar */}
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            {chartData.map((item, index) => (
                <div 
                    key={item.name}
                    className="h-full transition-all duration-1000"
                    style={{ 
                        width: `${(item.spent / totalSpent) * 100}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                    }}
                />
            ))}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            {chartData.slice(0, 6).map((item, index) => {
                const percentage = ((item.spent / totalSpent) * 100).toFixed(0);
                return (
                    <div key={item.name} className="flex justify-between items-center group">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></span>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{item.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{percentage}%</span>
                    </div>
                )
            })}
        </div>
    </div>
  )
}
