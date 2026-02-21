"use client"

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Bot, Loader2, Sparkles, TrendingUp, Volume2, Gem, ArrowRight } from "lucide-react"
import type { Category, Expense, Income } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { generateFinancialReport, type FinancialReportOutput } from '@/ai/flows/financial-report-flow'
import { formatCurrency, cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { awardAchievement } from '@/lib/achievements-manager'
import { generateReportAudio } from '@/ai/flows/audio-report-flow'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface FinancialReportProps {
  expenses: Expense[]
  categories: Category[]
  baseBudget: number
  additionalIncomes: Income[]
  periodLabel: string
}

export default function FinancialReport({ expenses, categories, baseBudget, additionalIncomes, periodLabel }: FinancialReportProps) {
    const { user, achievements, idToken, isPremium } = useAuth();
    const [isLoading, setIsLoading] = React.useState(false)
    const [report, setReport] = React.useState<FinancialReportOutput | null>(null)
    const [isAudioLoading, setIsAudioLoading] = React.useState(false);
    const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
    const { toast } = useToast()

    const handleGenerateReport = async () => {
        if (expenses.length === 0 && additionalIncomes.length === 0) {
            toast({
                title: "Data Tidak Cukup",
                description: "Anda perlu memiliki transaksi untuk membuat laporan.",
                variant: "destructive"
            })
            return;
        }

        setIsLoading(true)
        setReport(null)
        setAudioUrl(null);
        try {
            const response = await generateFinancialReport({
                expenses,
                categories,
                baseBudget,
                additionalIncomes,
                periodLabel
            });
            if ('error' in response) {
                toast({ title: "Error AI", description: response.error, variant: "destructive" });
                return;
            }
            setReport(response);
            if (user && idToken) {
                await awardAchievement(user.uid, 'ai-consultant', achievements, idToken);
            }
        } catch (error) {
            console.error("Financial Report Error:", error);
            toast({ title: "Gagal Membuat Laporan", variant: "destructive" });
        } finally {
            setIsLoading(false)
        }
    }
    
    const handleListenToSummary = async () => {
        if (!report || !isPremium) return;
        setIsAudioLoading(true);
        setAudioUrl(null);
        try {
            const response = await generateReportAudio({ text: report.summary });
            if ('error' in response) {
                toast({ title: "Error Audio", description: response.error, variant: "destructive" });
            } else {
                setAudioUrl(response.audioDataUri);
            }
        } catch (error) {
            console.error("Audio generation error:", error);
            toast({ title: "Gagal Membuat Audio", variant: "destructive" });
        } finally {
            setIsAudioLoading(false);
        }
    }

    return (
        <Card className="bg-slate-900 dark:bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-900/20 border-none relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
                <BarChart3 className="h-24 w-24 text-white" />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30">
                        <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-widest uppercase">Analisis AI Jaga</h3>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/20 text-primary text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-primary/30">PREMIUM</Badge>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{periodLabel}</span>
                        </div>
                    </div>
                </div>

                <div className="min-h-[100px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI sedang berpikir...</p>
                        </div>
                    ) : report ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div>
                                <h4 className="text-lg font-black tracking-tight mb-2 text-primary">{report.title}</h4>
                                <p className="text-sm font-medium text-slate-300 leading-relaxed">{report.summary}</p>
                            </div>

                            {audioUrl && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <audio controls className="w-full h-8">
                                        <source src={audioUrl} type="audio/wav" />
                                    </audio>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wawasan Penting</h5>
                                <div className="grid gap-2">
                                    {report.insights.map((insight, idx) => (
                                        <div key={idx} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium text-slate-200">{insight}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategori Terboros</p>
                                    <p className="text-sm font-bold uppercase">{report.topSpending.categoryName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-rose-400 tabular-nums">{formatCurrency(report.topSpending.amount)}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{report.topSpending.percentage}% dari total</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8 max-w-[90%]">
                            Gunakan asisten AI untuk menganalisis data transaksi Anda dan dapatkan saran cerdas untuk menghemat lebih banyak uang.
                        </p>
                    )}
                </div>

                <div className="mt-8 flex flex-col gap-4">
                    {!isPremium ? (
                        <Button asChild size="lg" className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-[0.2em] text-xs h-14 rounded-2xl">
                            <Link href="/premium">Buka Fitur Premium <Gem className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button 
                                onClick={handleGenerateReport} 
                                disabled={isLoading}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-xs h-14 rounded-2xl shadow-lg shadow-primary/20"
                            >
                                {report ? "Ulangi Analisis" : "Buat Laporan AI"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            {report && (
                                <Button 
                                    variant="outline" 
                                    onClick={handleListenToSummary} 
                                    disabled={isAudioLoading}
                                    className="w-14 h-14 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10"
                                >
                                    {isAudioLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Volume2 className="h-5 w-5" />}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}
