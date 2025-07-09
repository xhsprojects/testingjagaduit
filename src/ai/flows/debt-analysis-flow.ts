'use server';
/**
 * @fileOverview An AI flow for generating a debt analysis report.
 *
 * - generateDebtAnalysis - Analyzes debt data and creates a report.
 * - DebtAnalysisInput - The input type for the function.
 * - DebtAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const DebtAnalysisInputSchema = z.object({
  debtsJSON: z.string().describe("A JSON string of an array of debt objects. Each object includes name, totalAmount, remainingBalance, and interestRate."),
});
export type DebtAnalysisInput = z.infer<typeof DebtAnalysisInputSchema>;

const DebtAnalysisOutputSchema = z.object({
  summary: z.string().describe("A 2-3 sentence paragraph summarizing the user's overall debt situation, including total number of debts and total remaining balance."),
  insights: z.array(z.string()).describe("A list of 2-3 specific, actionable insights or strategies. Focus on which debt to prioritize (e.g., 'Prioritaskan melunasi [Nama Utang] karena bunganya paling tinggi.') and suggest simple strategies."),
  priorityDebt: z.object({
      name: z.string().describe("The name of the debt that should be prioritized."),
      reason: z.string().describe("A brief reason why this debt is the priority (e.g., 'Suku Bunga Tertinggi')."),
  }),
});
export type DebtAnalysisOutput = z.infer<typeof DebtAnalysisOutputSchema>;

export async function generateDebtAnalysis(input: {
    debts: any[]
}): Promise<DebtAnalysisOutput | { error: string }> {
    if (!process.env.GEMINI_API_KEY) {
      return {
        error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server.'
      };
    }
    try {
        const flowInput: DebtAnalysisInput = {
            debtsJSON: JSON.stringify(input.debts),
        };
        const result = await generateDebtAnalysisFlow(flowInput);
        return result;
    } catch (e: any) {
        console.error("Error in generateDebtAnalysis flow:", e);
        return {
            error: `Terjadi kesalahan saat membuat analisis utang: ${e.message}`,
        };
    }
}

const prompt = ai.definePrompt({
  name: 'generateDebtAnalysisPrompt',
  input: {schema: DebtAnalysisInputSchema},
  output: {schema: DebtAnalysisOutputSchema},
  prompt: `Anda adalah seorang penasihat keuangan yang berspesialisasi dalam strategi pelunasan utang. Tugas Anda adalah menganalisis data utang pengguna dan memberikan ringkasan serta wawasan yang jelas dan memotivasi.

  Berikut adalah data utang pengguna dalam format JSON:
  {{{debtsJSON}}}

  **Tugas Anda:**
  1.  **Buat Ringkasan:** Tulis ringkasan singkat (2-3 kalimat) tentang situasi utang pengguna. Sebutkan jumlah total utang dan total sisa utang.
  2.  **Identifikasi Wawasan Penting:** Berikan 2-3 wawasan (insights) yang actionable. Fokus pada:
      -   Strategi pelunasan (misalnya, metode Avalanche/bunga tertinggi atau Snowball/saldo terendah).
      -   Saran praktis seperti "fokuskan pembayaran ekstra pada utang prioritas".
      -   Motivasi untuk tetap konsisten.
  3.  **Tentukan Utang Prioritas:** Berdasarkan metode Avalanche (prioritaskan utang dengan suku bunga tertinggi), identifikasi utang mana yang harus dilunasi terlebih dahulu. Jika suku bunga sama, prioritaskan yang saldonya lebih kecil. Jelaskan alasannya secara singkat.

  Gunakan bahasa yang positif dan memberdayakan.
  `,
});

const generateDebtAnalysisFlow = ai.defineFlow(
  {
    name: 'generateDebtAnalysisFlow',
    inputSchema: DebtAnalysisInputSchema,
    outputSchema: DebtAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
