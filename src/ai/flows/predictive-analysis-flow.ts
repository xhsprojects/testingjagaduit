
'use server';
/**
 * @fileOverview An AI flow for providing predictive financial analysis and budget warnings.
 *
 * - generatePredictiveAnalysis - A function that analyzes current spending habits to forecast end-of-period outcomes.
 * - PredictiveAnalysisInput - The input type for the function.
 * - PredictiveAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const PredictiveAnalysisInputSchema = z.object({
  expensesJSON: z.string().describe("A JSON string of an array of expense objects for the current period so far."),
  categoriesJSON: z.string().describe("A JSON string of an array of all category objects with their budgets."),
  periodStartDate: z.string().describe("The ISO date string for the start of the budget period."),
  periodEndDate: z.string().describe("The ISO date string for the end of the budget period."),
  currentDate: z.string().describe("The ISO date string for the current date."),
});
export type PredictiveAnalysisInput = z.infer<typeof PredictiveAnalysisInputSchema>;

const CategoryWarningSchema = z.object({
    categoryName: z.string().describe("The name of the category at risk."),
    currentSpending: z.number().describe("The amount already spent in this category."),
    projectedSpending: z.number().describe("The forecasted total spending for this category by the end of the period."),
    budget: z.number().describe("The total budget for this category."),
    warningMessage: z.string().describe("A friendly and concise warning message. Example: 'Anda berisiko melebihi anggaran. Proyeksi pengeluaran Anda RpX, melebihi budget RpY.'"),
});

const PredictiveAnalysisOutputSchema = z.object({
  isHealthy: z.boolean().describe("Overall budget forecast health. True if on track, false if projected to overspend in total."),
  overallPrediction: z.string().describe("A 1-2 sentence summary of the overall budget forecast. Be encouraging if on track, or gently cautionary if not."),
  categoryWarnings: z.array(CategoryWarningSchema).describe("A list of specific warnings for specific categories that are projected to be overspent. Only include categories that are at risk."),
});
export type PredictiveAnalysisOutput = z.infer<typeof PredictiveAnalysisOutputSchema>;

export async function generatePredictiveAnalysis(input: {
    expenses: any[],
    categories: any[],
    periodStart: Date,
    periodEnd: Date,
}): Promise<PredictiveAnalysisOutput | { error: string }> {
    if (!process.env.GEMINI_API_KEY) {
      return {
        error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server. Silakan hubungi admin aplikasi untuk menyiapkannya.'
      };
    }
    try {
        const flowInput: PredictiveAnalysisInput = {
            expensesJSON: JSON.stringify(input.expenses.map(({id, date, amount, categoryId, notes}) => ({id, date, amount, categoryId, notes}))),
            categoriesJSON: JSON.stringify(input.categories),
            periodStartDate: input.periodStart.toISOString(),
            periodEndDate: input.periodEnd.toISOString(),
            currentDate: new Date().toISOString(),
        };
        const result = await generatePredictiveAnalysisFlow(flowInput);
        return result;
    } catch (e: any) {
        console.error("Error in generatePredictiveAnalysis flow:", e);
        return {
            error: `Terjadi kesalahan saat membuat analisis. Pastikan konfigurasi AI Anda benar dan coba lagi. Detail: ${e.message}`,
        };
    }
}

const prompt = ai.definePrompt({
  name: 'generatePredictiveAnalysisPrompt',
  input: {schema: PredictiveAnalysisInputSchema},
  output: {schema: PredictiveAnalysisOutputSchema},
  prompt: `Anda adalah seorang peramal keuangan AI yang cerdas dan proaktif. Tugas Anda adalah menganalisis kebiasaan belanja pengguna saat ini dan meramalkan apakah mereka akan tetap sesuai anggaran hingga akhir periode.

  **Data yang Tersedia:**
  - Tanggal Mulai Periode: {{periodStartDate}}
  - Tanggal Selesai Periode: {{periodEndDate}}
  - Tanggal Hari Ini: {{currentDate}}
  - Kategori Anggaran & Budgetnya: {{{categoriesJSON}}}
  - Transaksi Pengeluaran Sejauh Ini: {{{expensesJSON}}}

  **Langkah Analisis Anda:**
  1.  **Hitung Progres Waktu:** Tentukan berapa persen periode waktu yang telah berlalu. (Contoh: Jika hari ini tanggal 15 dari 30 hari, berarti 50% waktu telah berlalu).
  2.  **Analisis per Kategori:** Untuk setiap kategori (kecuali 'Tabungan & Investasi' dan 'Pembayaran Utang' karena ini adalah transfer, bukan belanja konsumtif):
      - Hitung total pengeluaran saat ini.
      - Hitung *spending velocity* (kecepatan belanja) harian rata-rata.
      - **Proyeksikan total pengeluaran** hingga akhir periode berdasarkan kecepatan belanja saat ini. (Proyeksi = Pengeluaran Saat Ini + (Rata-rata Harian * Sisa Hari)).
  3.  **Identifikasi Risiko:** Bandingkan proyeksi pengeluaran dengan anggaran untuk setiap kategori. Jika proyeksi **melebihi 95%** dari anggaran, buat sebuah 'categoryWarning'.
  4.  **Buat Ringkasan Keseluruhan:**
      - Hitung total proyeksi pengeluaran dari semua kategori.
      - Bandingkan dengan total pemasukan (total budget dari semua kategori).
      - Tulis sebuah ringkasan singkat (1-2 kalimat) yang memprediksi kesehatan anggaran secara keseluruhan. Jika semuanya aman, berikan pujian. Jika ada risiko, berikan peringatan yang ramah.
      - Set \`isHealthy\` menjadi \`true\` jika total proyeksi di bawah total budget, dan \`false\` jika sebaliknya.

  **Aturan Penting:**
  - Hanya sertakan kategori dalam \`categoryWarnings\` jika proyeksi pengeluarannya **melebihi 95%** dari anggarannya. Jangan sertakan kategori yang aman.
  - Bahasa harus proaktif dan membantu, bukan menghakimi.
  - Pastikan output sesuai dengan skema Zod yang diberikan.
  `,
});

const generatePredictiveAnalysisFlow = ai.defineFlow(
  {
    name: 'generatePredictiveAnalysisFlow',
    inputSchema: PredictiveAnalysisInputSchema,
    outputSchema: PredictiveAnalysisOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
