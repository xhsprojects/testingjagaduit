"use client"

import * as React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, Loader2, Sparkles, TrendingDown, Volume2, Gem } from "lucide-react"
import type { Debt } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { generateDebtAnalysis, type DebtAnalysisOutput } from '@/ai/flows/debt-analysis-flow'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { generateReportAudio } from '@/ai/flows/audio-report-flow'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface DebtAnalysisProps {
  debts: Debt[]
}

export default function DebtAnalysis({ debts }: DebtAnalysisProps) {
    const { isPremium } = useAuth();
    const [isLoading, setIsLoading] = React.useState(false);
    const [analysis, setAnalysis] = React.useState<DebtAnalysisOutput | null>(null);
    const [isAudioLoading, setIsAudioLoading] = React.useState(false);
    const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
    const { toast } = useToast();

    const handleGenerateAnalysis = async () => {
        if (debts.length === 0) {
            toast({
                title: "Tidak Ada Utang",
                description: "Anda tidak memiliki utang aktif untuk dianalisis.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        setAnalysis(null);
        setAudioUrl(null);
        try {
            const response = await generateDebtAnalysis({ debts });
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
            console.error("Debt Analysis Error:", error);
            toast({
                title: "Gagal Membuat Analisis",
                description: "Terjadi kesalahan saat berkomunikasi dengan AI.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleListenToSummary = async () => {
        if (!analysis || !isPremium) return;
        setIsAudioLoading(true);
        setAudioUrl(null);
        try {
            const response = await generateReportAudio({ text: analysis.summary });
            if ('error' in response) {
                toast({ title: "Error Membuat Audio", description: response.error, variant: "destructive" });
            } else {
                setAudioUrl(response.audioDataUri);
            }
        } catch (error) {
            console.error("Audio generation error:", error);
            toast({ title: "Gagal Membuat Audio", description: "Terjadi kesalahan.", variant: "destructive" });
        } finally {
            setIsAudioLoading(false);
        }
    }

    const GenerateButton = () => (
      <div className="relative">
        <Button onClick={handleGenerateAnalysis} disabled={isLoading || !isPremium}>
          {isLoading ? "Sedang Menganalisis..." : "Jalankan Analisis Utang"}
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
                    <Bot className="h-6 w-6 text-primary" />
                    <CardTitle className="font-headline">Analisis Utang AI</CardTitle>
                </div>
                <CardDescription>Dapatkan strategi dan wawasan dari AI untuk melunasi utang Anda lebih cepat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-secondary/50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">AI sedang menganalisis data utang Anda...</p>
                    </div>
                )}

                {analysis && !isLoading && (
                    <div className="p-4 bg-secondary rounded-lg border space-y-4">
                        <p className="text-sm text-foreground/90">{analysis.summary}</p>

                        {audioUrl && (
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
                                {analysis.insights.map((insight, index) => (
                                    <li key={index}>{insight}</li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="border-t border-border pt-4">
                            <h5 className="font-semibold mb-2 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive"/> Utang Prioritas</h5>
                            <div className='flex justify-between items-center bg-background/50 p-3 rounded-md'>
                                <p className="font-medium">{analysis.priorityDebt.name}</p>
                                <p className='text-xs text-muted-foreground'>{analysis.priorityDebt.reason}</p>
                            </div>
                        </div>
                    </div>
                )}

                 {!isPremium && !analysis && (
                    <div className="p-4 text-center bg-secondary rounded-lg border">
                        <Gem className="mx-auto h-8 w-8 text-primary/50" />
                        <h4 className="font-semibold mt-2">Fitur Premium</h4>
                        <p className="text-sm text-muted-foreground mt-1">Upgrade ke Premium untuk mendapatkan analisis utang cerdas dari AI.</p>
                        <Button asChild size="sm" className="mt-4">
                            <Link href="/premium">Upgrade Sekarang</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 sm:flex-row sm:justify-between">
                <p className="text-xs text-muted-foreground">Analisis ini tidak menggantikan nasihat keuangan profesional.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    {analysis && isPremium && (
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
