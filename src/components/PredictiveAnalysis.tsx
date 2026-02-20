
"use client"

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, TrendingUp, AlertTriangle, Gem, Zap } from "lucide-react"
import type { Category, Expense } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { generatePredictiveAnalysis, type PredictiveAnalysisOutput } from '@/ai/flows/predictive-analysis-flow'
import { formatCurrency } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
        <Card className="rounded-2xl p-6 shadow-lg border-primary/30 relative overflow-hidden bg-card transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-2xl -mr-10 -mt-10"></div>
            
            <div className="flex items-start gap-4 relative z-10 mb-6">
                <div className="p-3 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                    <Zap className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        Peramalan & AI
                        <Badge className="text-[8px] h-4 bg-primary text-white font-bold uppercase tracking-widest px-1.5">Beta</Badge>
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed mt-1">
                        Dapatkan prediksi proaktif dari AI apakah Anda akan sesuai anggaran hingga akhir periode.
                    </p>
                </div>
            </div>

            <CardContent className="p-0 space-y-4 relative z-10">
                {isLoading && (
                     <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-muted/50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">AI sedang meramal...</p>
                    </div>
                )}

                {analysis && !isLoading && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-4">
                        <div className="flex items-start gap-3">
                            <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-foreground">{analysis.isHealthy ? "Proyeksi Anda Terlihat Baik!" : "Peringatan Terdeteksi"}</h4>
                                <p className="text-xs font-medium text-muted-foreground mt-1 leading-relaxed">{analysis.overallPrediction}</p>
                            </div>
                        </div>

                        {analysis.categoryWarnings.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-primary/10">
                                {analysis.categoryWarnings.map((warning, index) => (
                                    <div key={index} className="flex items-center gap-2 text-[10px] font-bold text-destructive uppercase">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>{warning.categoryName}: {warning.warningMessage}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!isPremium && !analysis && !isLoading && (
                    <div className="p-4 text-center bg-muted/50 rounded-xl border border-dashed flex flex-col items-center">
                        <Gem className="h-8 w-8 text-primary/40 mb-2" />
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Fitur Premium</p>
                        <Button asChild size="sm" className="h-8 text-[10px] font-extrabold rounded-lg">
                            <Link href="/premium">Buka Fitur AI</Link>
                        </Button>
                    </div>
                )}
            </CardContent>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 pt-4 border-t border-border/50">
                <p className="text-[9px] text-muted-foreground font-bold italic uppercase tracking-tighter">Berdasarkan data saat ini.</p>
                <Button 
                    onClick={handleGenerateAnalysis} 
                    disabled={isLoading || !isPremium}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-extrabold py-2 px-6 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 w-full sm:w-auto h-9"
                >
                    {isLoading ? "Memproses..." : "Jalankan Analisis"}
                </Button>
            </div>
        </Card>
    )
}
