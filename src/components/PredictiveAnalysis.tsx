
"use client"

import * as React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, TrendingUp, AlertTriangle, Gem } from "lucide-react"
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
            toast({
                title: "Rentang Tanggal Tidak Valid",
                description: "Silakan pilih rentang tanggal yang valid untuk menjalankan analisis.",
                variant: "destructive"
            })
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
                toast({
                    title: "Error Konfigurasi AI",
                    description: response.error,
                    variant: "destructive"
                });
                return;
            }
            setAnalysis(response);
        } catch (error) {
            console.error("Predictive Analysis Error:", error);
            toast({
                title: "Gagal Membuat Analisis",
                description: "Terjadi kesalahan saat berkomunikasi dengan AI. Silakan coba lagi.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false)
        }
    }
    
    const GenerateButton = () => (
      <div className="relative">
          <Button onClick={handleGenerateAnalysis} disabled={isLoading || !isPremium}>
              {isLoading ? "Sedang Meramal..." : "Jalankan Analisis Prediktif"}
          </Button>
           {!isPremium && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                    <Gem className="h-3 w-3 mr-1"/> Premium
                </Badge>
            )}
      </div>
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-accent" />
                    <CardTitle className="font-headline">Peramalan & Peringatan Anggaran AI</CardTitle>
                </div>
                <CardDescription>Dapatkan prediksi proaktif dari AI apakah Anda akan sesuai anggaran hingga akhir periode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && (
                     <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-secondary/50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">AI sedang meramal masa depan keuangan Anda...</p>
                    </div>
                )}

                {analysis && !isLoading && (
                    <div className="p-4 bg-secondary rounded-lg border space-y-4">
                        <div className="flex items-start gap-3">
                            <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h4 className="font-bold font-headline">{analysis.isHealthy ? "Proyeksi Anda Terlihat Baik!" : "Peringatan Anggaran Terdeteksi"}</h4>
                                <p className="text-sm text-foreground/90 mt-1">{analysis.overallPrediction}</p>
                            </div>
                        </div>

                        {analysis.categoryWarnings.length > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                                {analysis.categoryWarnings.map((warning, index) => (
                                    <Alert key={index} variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>{warning.categoryName}</AlertTitle>
                                        <AlertDescription>
                                            {warning.warningMessage}
                                            <div className="text-xs mt-2 flex justify-between">
                                                <span>Budget: {formatCurrency(warning.budget)}</span>
                                                <span>Proyeksi: {formatCurrency(warning.projectedSpending)}</span>
                                            </div>
                                        </AlertDescription>
                                    </Alert>
                                ))}
                            </div>
                        )}

                    </div>
                )}

                {!isPremium && !analysis && (
                    <div className="p-4 text-center bg-secondary rounded-lg border">
                        <Gem className="mx-auto h-8 w-8 text-primary/50" />
                        <h4 className="font-semibold mt-2">Fitur Premium</h4>
                        <p className="text-sm text-muted-foreground mt-1">Upgrade ke Premium untuk mendapatkan peringatan dini jika Anda akan melebihi anggaran.</p>
                        <Button asChild size="sm" className="mt-4">
                            <Link href="/premium">Upgrade Sekarang</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    Analisis prediktif ini adalah perkiraan berdasarkan data saat ini.
                </p>
                {isPremium ? (
                    <GenerateButton />
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <GenerateButton />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Upgrade ke Premium untuk menggunakan fitur ini.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </CardFooter>
        </Card>
    )
}
