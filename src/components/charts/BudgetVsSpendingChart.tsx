
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"

interface BudgetVsSpendingChartProps {
    data: {
        name: string;
        spent: number;
        budget: number;
    }[];
}

const chartConfig = {
  budget: {
    label: "Anggaran",
    color: "hsl(var(--secondary))",
  },
  spent: {
    label: "Realisasi",
    color: "hsl(var(--primary))",
  },
}

export default function BudgetVsSpendingChart({ data }: BudgetVsSpendingChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Anggaran vs. Realisasi</CardTitle>
        <CardDescription>Perbandingan alokasi anggaran dan realisasi pengeluaran per kategori.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            layout="vertical"
            margin={{
              left: 20,
              right: 20,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 15)}
              className="text-xs"
            />
            <XAxis dataKey="budget" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent
                formatter={(value, name) => (
                    <div className="flex flex-col">
                        <span className="text-xs">{name === 'spent' ? 'Realisasi' : 'Anggaran'}</span>
                        <span>{formatCurrency(value as number)}</span>
                    </div>
                )}
              />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="budget" layout="vertical" radius={4} fill="var(--color-budget)" />
            <Bar dataKey="spent" layout="vertical" radius={4} fill="var(--color-spent)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
