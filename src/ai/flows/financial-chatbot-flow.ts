
'use server';
/**
 * @fileOverview A conversational AI chatbot for financial consultation.
 *
 * - financialChatbot - A function that handles the chatbot conversation.
 * - FinancialChatbotInput - The input type for the function.
 * - FinancialChatbotOutput - The output type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const FinancialChatbotInputSchema = z.object({
  history: z.array(MessageSchema).describe("The history of the conversation so far."),
  query: z.string().describe('The latest user query.'),
});

export type FinancialChatbotInput = z.infer<typeof FinancialChatbotInputSchema>;

// The wrapper function will return a structured object for better error handling on the client.
export type FinancialChatbotOutput = { response: string } | { error: string };

export async function financialChatbot(input: FinancialChatbotInput): Promise<FinancialChatbotOutput> {
    // Explicitly check for the API key first.
    if (!process.env.GEMINI_API_KEY) {
      return { 
        error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server. Silakan hubungi admin aplikasi untuk menyiapkannya.' 
      };
    }
    
    try {
      // The flow itself returns a string on success.
      const result = await financialChatbotFlow(input);
      // Wrap the successful result in the structured object.
      return { response: result };
    } catch (e: any) {
      console.error("Error in financialChatbot flow:", e);
      // Return a structured error object.
      return { 
        error: `Maaf, terjadi kesalahan di server saat menjalankan chatbot. Pastikan konfigurasi AI Anda benar. Detail: ${e.message}` 
      };
    }
}

// This is the internal flow. It returns a simple string on success or throws an error on failure.
const financialChatbotFlow = ai.defineFlow(
  {
    name: 'financialChatbotFlow',
    inputSchema: FinancialChatbotInputSchema,
    outputSchema: z.string(),
  },
  async ({history, query}) => {
    // Map the simple history format to the format Genkit expects.
    const historyForGenkit = history.map(msg => ({
      role: msg.role as 'user' | 'model',
      parts: [{ text: msg.content }],
    }));

    const systemPrompt = `Anda adalah Jaga, seorang asisten keuangan yang ramah, cerdas, dan membantu.
    Tugas Anda adalah menjawab pertanyaan pengguna seputar keuangan pribadi, termasuk anggaran, tabungan, investasi, dan utang.
    Gunakan riwayat percakapan yang ada untuk menjaga konteks. Selalu berikan jawaban yang memotivasi dan mudah dipahami.`;

    const { text } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      system: systemPrompt,
      prompt: query,
      history: historyForGenkit,
    });
    
    return text ?? "Maaf, terjadi kesalahan dalam memberikan respons. Silakan coba lagi nanti.";
  }
);
