
"use client"

import * as React from 'react'
import { CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Loader2, User, Send } from "lucide-react"
import { financialChatbot, FinancialChatbotInput } from '@/ai/flows/financial-chatbot-flow'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'model';
  content: string;
}

const FormattedAiResponse = ({ text }: { text: string }) => {
  // This regex splits the string by bold markdown `**text**`, keeping the delimiters.
  // It handles multiple bold sections and surrounding text.
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <p>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // It's a bold part, render it as <strong>
          return <strong key={index}>{part.substring(2, part.length - 2)}</strong>;
        }
        // It's a normal text part
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
};

export default function FinancialChatbot() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [input, setInput] = React.useState('');
    const [messages, setMessages] = React.useState<Message[]>([]);
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        const historyForFlow = [...messages];
        setMessages(prev => [...prev, userMessage]);
        
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const flowInput: FinancialChatbotInput = {
                history: historyForFlow,
                query: currentInput,
            };
            const result = await financialChatbot(flowInput);

            if ('error' in result) {
                toast({
                    title: "Terjadi Kesalahan",
                    description: result.error,
                    variant: "destructive"
                });
                // Remove the user's message if the request fails, so they can try again
                setMessages(historyForFlow);
            } else {
                const aiMessage: Message = { role: 'model', content: result.response };
                setMessages(prev => [...prev, aiMessage]);
            }
        } catch (error: any) {
            console.error("Chatbot submission error:", error);
            toast({
                title: "Error Tak Terduga",
                description: "Gagal mengirim pesan. Silakan coba lagi.",
                variant: "destructive"
            });
            // Revert the user's message on unexpected error
            setMessages(historyForFlow);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                    <div className="flex items-start gap-3 justify-start">
                        <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                        <div className="p-3 rounded-lg bg-secondary text-secondary-foreground whitespace-pre-wrap text-sm">
                            <p>Halo! Saya Jaga, asisten keuangan pribadi Anda. Apa yang bisa saya bantu hari ini terkait keuangan Anda?</p>
                        </div>
                    </div>

                    {messages.map((message, index) => (
                        <div key={index} className={cn(
                            "flex items-start gap-3",
                            message.role === 'user' ? "justify-end" : "justify-start"
                        )}>
                            {message.role === 'model' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                            <div className={cn(
                                "p-3 rounded-lg max-w-sm whitespace-pre-wrap text-sm",
                                message.role === 'user'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground"
                            )}>
                                {message.role === 'model' ? <FormattedAiResponse text={message.content} /> : <p>{message.content}</p>}
                            </div>
                            {message.role === 'user' && <User className="h-6 w-6 text-muted-foreground flex-shrink-0" />}
                        </div>
                    ))}
                    {isLoading && (
                            <div className="flex items-start gap-3 justify-start">
                            <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                            <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <CardFooter className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                    <Input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ketik pesan Anda..."
                        disabled={isLoading}
                        autoComplete="off"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                       {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                       <span className="sr-only">Kirim</span>
                    </Button>
                </form>
            </CardFooter>
        </>
    )
}
