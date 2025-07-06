
'use server';
/**
 * @fileOverview An AI flow for generating a financial analysis report.
 *
 * - generateFinancialReport - A function that analyzes financial data and creates a report.
 * - FinancialReportInput - The input type for the generateFinancialReport function.
 * - FinancialReportOutput - The return type for the generateFinancialReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const FinancialReportInputSchema = z.object({
  expensesJSON: z.string().describe("A JSON string of an array of expense objects for the selected period."),
  categoriesJSON: z.string().describe("A JSON string of an array of category objects with their budgets."),
  baseBudget: z.number().describe("The user's base monthly budget from category allocations."),
  additionalIncomesJSON: z.string().describe("A JSON string of an array of additional income objects for the period."),
  periodLabel: z.string().describe("A label for the period being analyzed, e.g., '1 Jul - 31 Jul 2024'."),
});
export type FinancialReportInput = z.infer<typeof FinancialReportInputSchema>;

const FinancialReportOutputSchema = z.object({
  title: z.string().describe("A short, engaging title for the report. Example: 'Analisis Keuangan Anda untuk [Period Label]'"),
  summary: z.string().describe("A 2-3 sentence paragraph summarizing the user's financial activity. Highlight the relationship between total income (base budget + additional), expenses, and final savings."),
  insights: z.array(z.string()).describe("A list of 2-4 specific, actionable, and friendly insights or observations. Each insight should be a complete sentence. Example: 'Pengeluaran terbesar Anda ada di kategori Makanan, mencapai 30% dari total pengeluaran.' or 'Anda berhasil menabung Rp500.000 ke Dana Darurat, kerja bagus!'"),
  topSpending: z.object({
    categoryName: z.string().describe("The name of the category with the highest spending."),
    amount: z.number().describe("The total amount spent in the top category."),
    percentage: z.number().describe("The percentage of total expenses that the top category represents. (e.g., 45 for 45%)"),
  }),
});
export type FinancialReportOutput = z.infer<typeof FinancialReportOutputSchema>;

export async function generateFinancialReport(input: {
    expenses: any[],
    categories: any[],
    baseBudget: number,
    additionalIncomes: any[],
    periodLabel: string
}): Promise<FinancialReportOutput | { error: string }> {
    if (!process.env.GEMINI_API_KEY) {
      return {
        error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server. Silakan hubungi admin aplikasi untuk menyiapkannya.'
      };
    }
    try {
        const flowInput: FinancialReportInput = {
            expensesJSON: JSON.stringify(input.expenses.map(({id, date, amount, categoryId, notes}) => ({id, date, amount, categoryId, notes}))),
            categoriesJSON: JSON.stringify(input.categories),
            baseBudget: input.baseBudget,
            additionalIncomesJSON: JSON.stringify(input.additionalIncomes.map(({id, date, amount, notes}) => ({id, date, amount, notes}))),
            periodLabel: input.periodLabel,
        };
        const result = await generateFinancialReportFlow(flowInput);
        return result;
    } catch (e: any) {
        console.error("Error in generateFinancialReport flow:", e);
        return {
            error: `Terjadi kesalahan saat membuat laporan. Pastikan konfigurasi AI Anda benar dan coba lagi. Detail: ${e.message}`,
        };
    }
}

const prompt = ai.definePrompt({
  name: 'generateFinancialReportPrompt',
  input: {schema: FinancialReportInputSchema},
  output: {schema: FinancialReportOutputSchema},
  prompt: `Anda adalah seorang analis keuangan pribadi yang ramah dan cerdas. Tugas Anda adalah menganalisis data keuangan pengguna untuk periode "{{periodLabel}}" dan menyajikan laporan yang mudah dipahami, insightful, dan memotivasi.

  Berikut adalah data keuangan pengguna dalam format JSON:
  - Anggaran Dasar (dari alokasi kategori): {{baseBudget}}
  - Kategori Anggaran & Budgetnya: {{{categoriesJSON}}}
  - Daftar Pemasukan Tambahan: {{{additionalIncomesJSON}}}
  - Daftar Transaksi Pengeluaran: {{{expensesJSON}}}

  **Definisi Penting:**
  - **Pemasukan Tambahan** = Total dari semua item di \`additionalIncomesJSON\`.
  - **Total Pemasukan Periode Ini** = Anggaran Dasar + Pemasukan Tambahan.
  - **Total Pengeluaran** = Total dari semua transaksi di \`expensesJSON\`.
  - **Sisa Dana (Uang Sisa)** = Total Pemasukan Periode Ini - Total Pengeluaran.

  Tugas Anda:
  1.  **Analisis Data:** Hitung Total Pemasukan Periode Ini dan Total Pengeluaran. Bandingkan pengeluaran di setiap kategori dengan anggarannya. Identifikasi kategori pengeluaran terbesar.
  2.  **Buat Judul Laporan:** Buat judul yang singkat dan menarik untuk laporan ini.
  3.  **Tulis Ringkasan:** Tulis ringkasan singkat (2-3 kalimat) tentang aktivitas keuangan pengguna. Sebutkan Total Pengeluaran dan Sisa Dana.
  4.  **Identifikasi Wawasan Penting:** Berikan 2-4 wawasan (insights) paling penting dalam bentuk daftar. Wawasan ini harus spesifik, mudah dimengerti, dan jika memungkinkan, berikan saran praktis. Fokus pada:
      -   Perbandingan pengeluaran vs. anggaran di kategori kunci.
      -   Kategori pengeluaran paling boros.
      -   Pencapaian positif (misal: berhasil menabung atau hemat di satu kategori).
      -   Saran singkat untuk perbaikan.
  5.  **Tentukan Kategori Teratas:** Identifikasi kategori dengan pengeluaran tertinggi, total jumlahnya, dan persentasenya dari total pengeluaran.

  Pastikan bahasa yang Anda gunakan positif dan memotivasi, bukan menghakimi.
  `,
});

const generateFinancialReportFlow = ai.defineFlow(
  {
    name: 'generateFinancialReportFlow',
    inputSchema: FinancialReportInputSchema,
    outputSchema: FinancialReportOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
