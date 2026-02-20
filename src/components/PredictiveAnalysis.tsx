"use client"

import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, TrendingUp, AlertTriangle, Gem, Zap } from "lucide-react"
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
        <Card className="bg-card-light dark:bg-card-dark rounded-2xl p-6 shadow-lg border border-primary/30 relative overflow-hidden transition-all animate-in fade-in duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full filter blur-2xl -mr-10 -mt-10"></div>
            
            <div className="flex items-start gap-4 relative z-10">
                <div className="p-3 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                    <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1 dark:text-white flex items-center gap-2">
                        Peramalan & AI
                        <Badge className="text-[8px] bg-primary text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Beta</Badge>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Dapatkan prediksi proaktif dari AI apakah Anda akan sesuai anggaran hingga akhir periode.
                    </p>
                </div>
            </div>

            <CardContent className="p-0 mt-6 relative z-10">
                {isLoading && (
                     <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI sedang meramal...</p>
                    </div>
                )}

                {analysis && !isLoading && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-4">
                        <div className="flex items-start gap-3">
                            <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white">{analysis.isHealthy ? "Proyeksi Terlihat Baik!" : "Peringatan Terdeteksi"}</h4>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{analysis.overallPrediction}</p>
                            </div>
                        </div>

                        {analysis.categoryWarnings.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-primary/10">
                                {analysis.categoryWarnings.map((warning, index) => (
                                    <div key={index} className="flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>{warning.categoryName} Berisiko</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!isPremium && !analysis && !isLoading && (
                    <div className="p-4 text-center bg-muted/50 dark:bg-slate-800/50 rounded-xl border border-dashed flex flex-col items-center">
                        <Gem className="h-8 w-8 text-primary/40 mb-2" />
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Fitur Premium</p>
                        <Button asChild size="sm" className="h-8 text-[10px] font-bold rounded-lg px-6">
                            <Link href="/premium">Buka Fitur AI</Link>
                        </Button>
                    </div>
                )}
            </CardContent>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                <p className="text-[10px] text-slate-400 italic">Analisis ini berdasarkan data riwayat transaksi Anda.</p>
                <Button 
                    onClick={handleGenerateAnalysis} 
                    disabled={isLoading || !isPremium}
                    className="bg-primary hover:bg-blue-600 text-white text-xs font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-primary/40 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto h-9"
                >
                    {isLoading ? "Memproses..." : "Jalankan Analisis"}
                </Button>
            </div>
        </Card>
    )
}
