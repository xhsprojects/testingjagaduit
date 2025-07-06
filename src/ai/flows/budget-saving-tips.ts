
// src/ai/flows/budget-saving-tips.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to provide personalized budget saving tips based on user spending habits and financial goals.
 *
 * - budgetSavingTips - A function that takes spending habits and financial goals as input and returns personalized saving tips.
 * - BudgetSavingTipsInput - The input type for the budgetSavingTips function.
 * - BudgetSavingTipsOutput - The return type for the budgetSavingTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BudgetSavingTipsInputSchema = z.object({
  spendingHabits: z
    .string()
    .describe('Description of current spending habits, including categories and amounts.'),
  financialGoals: z
    .string()
    .describe('Description of financial goals, such as saving for a down payment or paying off debt.'),
});

export type BudgetSavingTipsInput = z.infer<typeof BudgetSavingTipsInputSchema>;

const BudgetSavingTipsOutputSchema = z.object({
  savingTips: z
    .string()
    .describe('Personalized tips on how to save money based on spending habits and financial goals.'),
});

export type BudgetSavingTipsOutput = z.infer<typeof BudgetSavingTipsOutputSchema>;

export async function budgetSavingTips(input: BudgetSavingTipsInput): Promise<BudgetSavingTipsOutput | { error: string }> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server. Silakan hubungi admin aplikasi untuk menyiapkannya.'
    };
  }
  try {
    const result = await budgetSavingTipsFlow(input);
    return result;
  } catch (e: any) {
    console.error("Error in budgetSavingTips flow:", e);
    return {
        error: `Maaf, terjadi kesalahan di server saat membuat tips. Pastikan konfigurasi AI Anda benar. Detail: ${e.message}`,
    };
  }
}

const prompt = ai.definePrompt({
  name: 'budgetSavingTipsPrompt',
  input: {schema: BudgetSavingTipsInputSchema},
  output: {schema: BudgetSavingTipsOutputSchema},
  prompt: `You are a personal finance advisor. Based on the user's spending habits and financial goals, provide personalized and actionable tips on how to save money.

Spending Habits: {{{spendingHabits}}}
Financial Goals: {{{financialGoals}}}

Provide specific and practical advice that the user can implement immediately to improve their financial management. Consider different savings strategies and tactics.
`,
});

const budgetSavingTipsFlow = ai.defineFlow(
  {
    name: 'budgetSavingTipsFlow',
    inputSchema: BudgetSavingTipsInputSchema,
    outputSchema: BudgetSavingTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
