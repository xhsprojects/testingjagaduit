
"use client"

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Bot, Loader2, Sparkles, TrendingUp, Volume2, Gem } from "lucide-react"
import type { Category, Expense, Income } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { generateFinancialReport, type FinancialReportOutput } from '@/ai/flows/financial-report-flow'
import { formatCurrency } from '@/lib/utils'
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
                description: "Anda perlu memiliki setidaknya satu transaksi di periode ini untuk membuat laporan.",
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
                toast({
                    title: "Error Konfigurasi AI",
                    description: response.error,
                    variant: "destructive"
                });
                return;
            }
            setReport(response);
            if (user && idToken) {
                await awardAchievement(user.uid, 'ai-consultant', achievements, idToken);
            }
        } catch (error) {
            console.error("Financial Report Error:", error);
            toast({
                title: "Gagal Membuat Laporan",
                description: "Terjadi kesalahan saat berkomunikasi dengan AI. Silakan coba lagi.",
                variant: "destructive"
            });
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
                toast({
                    title: "Error Membuat Audio",
                    description: response.error,
                    variant: "destructive"
                });
            } else {
                setAudioUrl(response.audioDataUri);
            }
        } catch (error) {
            console.error("Audio generation error:", error);
            toast({
                title: "Gagal Membuat Audio",
                description: "Terjadi kesalahan saat berkomunikasi dengan AI.",
                variant: "destructive"
            });
        } finally {
            setIsAudioLoading(false);
        }
    }

    const GenerateButton = () => (
      <div className="relative">
        <Button onClick={handleGenerateReport} disabled={isLoading || !isPremium}>
          {isLoading ? "Sedang Menganalisis..." : (report ? "Buat Ulang Laporan" : "Buat Laporan Analisis")}
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
                    <BarChart3 className="h-6 w-6 text-primary" />
                    <CardTitle className="font-headline">Laporan Analisis Keuangan AI</CardTitle>
                </div>
                <CardDescription>Dapatkan analisis mendalam dan saran dari AI mengenai aktivitas keuangan Anda pada periode terpilih.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && (
                     <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-secondary/50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">AI sedang menganalisis data Anda...</p>
                    </div>
                )}

                {report && !isLoading && (
                    <div className="p-4 bg-secondary rounded-lg border space-y-4">
                        <div className="flex items-start gap-3">
                            <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h4 className="font-bold font-headline">{report.title}</h4>
                                <p className="text-sm text-foreground/90 mt-1">{report.summary}</p>
                            </div>
                        </div>

                        {audioUrl && isPremium && (
                            <div className="border-t border-border pt-4">
                                <audio controls className="w-full">
                                    <source src={audioUrl} type="audio/wav" />
                                    Browser Anda tidak mendukung elemen audio.
                                </audio>
                            </div>
                        )}

                        <div className="border-t border-border pt-4">
                             <h5 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Wawasan untuk Anda:</h5>
                             <ul className="list-disc pl-5 space-y-2 text-sm">
                                {report.insights.map((insight, index) => (
                                    <li key={index}>{insight}</li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="border-t border-border pt-4">
                            <h5 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-destructive"/> Kategori Pengeluaran Teratas</h5>
                            <div className='flex justify-between items-center bg-background/50 p-3 rounded-md'>
                                <p className="font-medium">{report.topSpending.categoryName}</p>
                                <div className='text-right'>
                                    <p className='font-bold'>{formatCurrency(report.topSpending.amount)}</p>
                                    <p className='text-xs text-muted-foreground'>{report.topSpending.percentage}% dari total pengeluaran</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!isPremium && !report && !isLoading && (
                    <div className="p-4 text-center bg-secondary rounded-lg border">
                        <Gem className="mx-auto h-8 w-8 text-primary/50" />
                        <h4 className="font-semibold mt-2">Fitur Premium</h4>
                        <p className="text-sm text-muted-foreground mt-1">Upgrade ke Premium untuk mendapatkan laporan cerdas dari AI.</p>
                        <Button asChild size="sm" className="mt-4">
                            <Link href="/premium">Upgrade Sekarang</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    Laporan dibuat oleh AI berdasarkan data pada rentang tanggal yang dipilih.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    {report && isPremium && (
                        <Button variant="outline" onClick={handleListenToSummary} disabled={isAudioLoading || isLoading}>
                            {isAudioLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                            ) : (
                                <><Volume2 className="mr-2 h-4 w-4" /> Dengarkan Ringkasan</>
                            )}
                        </Button>
                    )}
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
                </div>
            </CardFooter>
        </Card>
    )
}
