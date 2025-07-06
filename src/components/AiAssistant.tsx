
"use client"

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Sparkles, Bot, Loader2 } from "lucide-react"
import { budgetSavingTips } from '@/ai/flows/budget-saving-tips'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
    spendingHabits: z.string().min(10, "Harap jelaskan kebiasaan belanja Anda lebih detail."),
    financialGoals: z.string().min(10, "Harap jelaskan tujuan keuangan Anda lebih detail."),
})

type FormValues = z.infer<typeof formSchema>

const FormattedAiResponse = ({ text }: { text: string }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.substring(2, part.length - 2)}</strong>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};


export default function AiAssistant() {
    const [isLoading, setIsLoading] = React.useState(false)
    const [aiResponse, setAiResponse] = React.useState<string | null>(null)
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            spendingHabits: "",
            financialGoals: ""
        },
    })

    const handleSubmit = async (data: FormValues) => {
        setIsLoading(true)
        setAiResponse(null)
        try {
            const response = await budgetSavingTips(data);
            if ('error' in response) {
                toast({
                    title: "Error Konfigurasi AI",
                    description: response.error,
                    variant: "destructive",
                })
                setAiResponse(null);
            } else {
                setAiResponse(response.savingTips);
            }
        } catch (error) {
            console.error("AI Assistant Error:", error);
            setAiResponse("Maaf, saya tidak dapat membuat tips saat ini. Silakan coba lagi nanti.");
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-accent" />
                    <CardTitle className="font-headline">Asisten Keuangan AI</CardTitle>
                </div>
                <CardDescription>Dapatkan tips menabung yang dipersonalisasi dari AI berdasarkan kebiasaan dan tujuan Anda.</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="spendingHabits"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kebiasaan Belanja Anda</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Contoh: Saya sering jajan di luar, sekitar 1jt per bulan. Saya juga langganan 3 layanan streaming..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="financialGoals"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tujuan Keuangan Anda</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Contoh: Saya ingin menabung untuk DP rumah dalam 5 tahun. Saya juga ingin melunasi pinjaman..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        {aiResponse && (
                            <div className="p-4 bg-secondary rounded-lg border">
                                <div className="flex items-start gap-3">
                                    <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                                    <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                                        <p className="font-semibold mb-2">Berikut adalah tips personal untuk Anda:</p>
                                        <FormattedAiResponse text={aiResponse} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Membuat Tips...
                                </>
                            ) : (
                                "Dapatkan Tips Menabung"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    )
}
