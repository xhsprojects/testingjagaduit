
"use client"

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, TrendingUp, AlertTriangle, Gem, ArrowRight, BrainCircuit } from "lucide-react"
import type { Category, Expense } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { generatePredictiveAnalysis, type PredictiveAnalysisOutput } from '@/ai/flows/predictive-analysis-flow'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'

interface PredictiveAnalysisProps {
  expenses: Expense[]
  categories: Category[]
  dateRange: { from: Date, to: Date } | undefined
}

export default function PredictiveAnalysis({ expenses, categories, dateRange }: PredictiveAnalysisProps) {
    const { isPremium } = useAuth();
    const [isLoading, setIsLoading] = React.useState(false)
    const [analysis, setAnalysis] = React.useState<PredictiveAnalysisOutput | null>(null)
    const { toast } = useToast()

    const handleGenerateAnalysis = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            toast({ title: "Rentang Tanggal Tidak Valid", variant: "destructive" });
            return;
        }

        setIsLoading(true)
        setAnalysis(null)
        try {
            const response = await generatePredictiveAnalysis({
                expenses,
                categories,
                periodStart: dateRange.from,
                periodEnd: dateRange.to
            });
            if ('error' in response) {
                toast({ title: "Error AI", description: response.error, variant: "destructive" });
            } else {
                setAnalysis(response);
            }
        } catch (error) {
            console.error("Predictive Analysis Error:", error);
            toast({ title: "Gagal", variant: "destructive" });
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <section className="relative group cursor-pointer animate-in fade-in duration-700">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>
            
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-[2rem] p-6 text-white overflow-hidden shadow-xl border border-slate-700/50 dark:border-slate-700">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="h-24 w-24 text-primary" />
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm tracking-widest uppercase">Peramalan & AI</h3>
                        <Badge className="bg-primary/20 text-primary text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-primary/30">BETA</Badge>
                    </div>
                </div>

                <div className="min-h-[80px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">AI sedang meramal...</p>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                            <div className="flex items-start gap-3">
                                <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{analysis.isHealthy ? "Proyeksi Baik" : "Peringatan"}</h4>
                                    <p className="text-[11px] font-medium text-slate-400 mt-1 leading-relaxed">{analysis.overallPrediction}</p>
                                </div>
                            </div>
                            {analysis.categoryWarnings.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {analysis.categoryWarnings.map((w, i) => (
                                        <div key={i} className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-1">
                                            <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                                            <span className="text-[8px] font-extrabold text-red-400 uppercase">{w.categoryName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-[11px] leading-relaxed mb-6 max-w-[90%]">
                            Dapatkan prediksi proaktif dari AI apakah pengeluaran Anda akan tetap sesuai anggaran hingga akhir bulan ini.
                        </p>
                    )}
                </div>

                <div className="mt-6 flex flex-col gap-4 relative z-10">
                    {!isPremium ? (
                        <Button asChild size="sm" className="w-full bg-white text-slate-900 hover:bg-slate-100 text-[10px] font-bold uppercase tracking-widest h-10 rounded-xl">
                            <Link href="/premium">Buka Fitur Premium <Gem className="ml-2 h-3 w-3" /></Link>
                        </Button>
                    ) : (
                        <button 
                            onClick={handleGenerateAnalysis}
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-white text-[10px] font-extrabold py-3 rounded-xl transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                        >
                            <span>Jalankan Analisis</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <p className="text-[8px] text-slate-500 font-bold uppercase text-center tracking-widest italic opacity-60">Analisis berdasarkan riwayat transaksi saat ini</p>
                </div>
            </div>
        </section>
    )
}
