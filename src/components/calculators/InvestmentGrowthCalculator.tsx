
"use client"

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ComposedChart, Bar, Area } from "recharts";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  initialAmount: z.coerce.number().min(0, "Modal awal tidak boleh negatif."),
  monthlyDeposit: z.coerce.number().min(0, "Setoran bulanan tidak boleh negatif."),
  annualRate: z.coerce.number().min(0, "Imbal hasil tidak boleh negatif."),
  years: z.coerce.number().positive("Jangka waktu harus lebih dari 0 tahun."),
});

type FormValues = z.infer<typeof formSchema>;
type ChartData = {
    year: number;
    totalBalance: number;
    totalContribution: number;
    interestEarned: number;
}[];

export default function InvestmentGrowthCalculator() {
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [results, setResults] = React.useState<{ chartData: ChartData; finalBalance: number; totalContribution: number; totalInterest: number } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      initialAmount: 1000000,
      monthlyDeposit: 500000,
      annualRate: 7,
      years: 10,
    },
  });

  const handleSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResults(null);
    
    // Simulate a short delay to show loading state
    setTimeout(() => {
        const { initialAmount, monthlyDeposit, annualRate, years } = data;
        const monthlyRate = annualRate / 100 / 12;
        const chartData: ChartData = [];
        let currentBalance = initialAmount;
        let totalContribution = initialAmount;

        chartData.push({
            year: 0,
            totalBalance: initialAmount,
            totalContribution: initialAmount,
            interestEarned: 0
        });

        for (let year = 1; year <= years; year++) {
            for (let month = 1; month <= 12; month++) {
                currentBalance += monthlyDeposit;
                currentBalance *= (1 + monthlyRate);
                totalContribution += monthlyDeposit;
            }
            chartData.push({
                year: year,
                totalBalance: Math.round(currentBalance),
                totalContribution: totalContribution,
                interestEarned: Math.round(currentBalance - totalContribution),
            });
        }
        
        const finalBalance = Math.round(currentBalance);
        const totalInterest = finalBalance - totalContribution;
        setResults({ chartData, finalBalance, totalContribution, totalInterest });
        setIsCalculating(false);
    }, 500);
  };

  const chartConfig = {
      totalBalance: {
          label: "Total Saldo",
          color: "hsl(var(--primary))",
      },
      totalContribution: {
          label: "Total Setoran",
          color: "hsl(var(--secondary-foreground))",
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Kalkulator Investasi</CardTitle>
                    <CardDescription>Masukkan detail rencana investasi Anda untuk melihat proyeksi pertumbuhannya.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="initialAmount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Modal Awal (Rp)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="text" 
                                        inputMode="numeric"
                                        placeholder="1.000.000" 
                                        value={field.value > 0 ? formatCurrency(field.value) : ""}
                                        onChange={(e) => {
                                            const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                            field.onChange(numericValue);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="monthlyDeposit"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Setoran per Bulan (Rp)</FormLabel>
                                <FormControl>
                                     <Input 
                                        type="text" 
                                        inputMode="numeric"
                                        placeholder="500.000" 
                                        value={field.value > 0 ? formatCurrency(field.value) : ""}
                                        onChange={(e) => {
                                            const numericValue = Number(e.target.value.replace(/[^0-9]/g, ''));
                                            field.onChange(numericValue);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="annualRate"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Estimasi Imbal Hasil (% per Tahun)</FormLabel>
                                <FormControl>
                                    <Input type="number" inputMode="decimal" step="0.1" placeholder="7" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="years"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Jangka Waktu (Tahun)</FormLabel>
                                <FormControl>
                                    <Input type="number" inputMode="decimal" placeholder="10" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isCalculating}>
                           {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Hitung Proyeksi
                        </Button>
                    </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Hasil Proyeksi</CardTitle>
                    <CardDescription>Visualisasi pertumbuhan investasi Anda dari waktu ke waktu.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isCalculating && (
                         <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-dashed bg-secondary/50">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    {!results && !isCalculating && (
                        <div className="flex h-[400px] w-full items-center justify-center rounded-lg border border-dashed bg-secondary/50">
                            <p className="text-muted-foreground">Hasil proyeksi akan muncul di sini.</p>
                        </div>
                    )}
                    {results && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-secondary rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Saldo Akhir</p>
                                    <p className="text-2xl font-bold text-primary">{formatCurrency(results.finalBalance)}</p>
                                </div>
                                 <div className="p-4 bg-secondary rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Setoran Anda</p>
                                    <p className="text-2xl font-bold">{formatCurrency(results.totalContribution)}</p>
                                </div>
                                 <div className="p-4 bg-secondary rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Imbal Hasil</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(results.totalInterest)}</p>
                                </div>
                            </div>
                            <ChartContainer config={chartConfig} className="w-full h-[300px]">
                                <ComposedChart data={results.chartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} unit=" thn" />
                                    <YAxis tickFormatter={(value) => formatCurrency(value as number).replace('Rp', '')} width={80} tickLine={false} axisLine={false} />
                                    <ChartTooltip
                                        content={<ChartTooltipContent
                                            formatter={(value, name) => (
                                                <div className="flex flex-col">
                                                    <span>{formatCurrency(value as number)}</span>
                                                </div>
                                            )}
                                        />}
                                    />
                                    <Area type="monotone" dataKey="totalBalance" fill="var(--color-totalBalance)" fillOpacity={0.4} stroke="var(--color-totalBalance)" stackId="a" />
                                    <Bar dataKey="totalContribution" fill="var(--color-totalContribution)" stackId="a" radius={[4, 4, 0, 0]} />
                                </ComposedChart>
                            </ChartContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
