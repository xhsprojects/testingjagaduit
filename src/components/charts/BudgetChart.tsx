
"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

interface BudgetChartProps {
    data: {
        name: string;
        spent: number;
        budget: number;
    }[];
}

const chartConfigBase = {
  spent: {
    label: "Dibelanjakan",
  },
}

const COLORS = ["#3DA3FF", "#735CDD", "#FFB45A", "#4CAF50", "#FF6B6B", "#3DDBD9", "#A855F7"];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) {
        return null;
    }

    return (
        <text
            x={x}
            y={y}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-xs font-semibold"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};


export default function BudgetChart({ data }: BudgetChartProps) {
  const chartData = data.filter(item => item.spent > 0).map(item => ({
      name: item.name,
      spent: item.spent,
      fill: `var(--color-${item.name.replace(/\s+/g, '-')})`
  }));
  
  const totalSpent = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.spent, 0)
  }, [data]);

  const shouldShowScrollNote = chartData.length > 5;
  
  const chartConfig = React.useMemo(() => {
    const config = { ...chartConfigBase };
    chartData.forEach((item, index) => {
      (config as any)[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  if (totalSpent <= 0) {
      return (
          <div className="flex h-[350px] flex-col items-center justify-center text-muted-foreground">
              <p>Belum ada data.</p>
              <p className="text-sm">Grafik akan muncul di sini setelah ada transaksi.</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center">
        <ChartContainer
            config={chartConfig}
            className="w-full h-[350px]"
        >
            <PieChart>
            <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent nameKey="name" formatter={(value) => formatCurrency(value as number)}/>}
            />
            <Pie
                data={chartData}
                dataKey="spent"
                nameKey="name"
                innerRadius="50%"
                outerRadius="80%"
                strokeWidth={2}
                labelLine={false}
                label={renderCustomizedLabel}
            >
                <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-lg sm:text-xl font-headline font-bold"
                >
                {formatCurrency(totalSpent)}
                </text>
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                wrapperStyle={{
                paddingTop: '20px',
                }}
            />
            </PieChart>
        </ChartContainer>
        {shouldShowScrollNote && (
        <p className="text-xs text-muted-foreground pt-2">
            Geser legenda di atas untuk melihat semua kategori.
        </p>
        )}
    </div>
  )
}
