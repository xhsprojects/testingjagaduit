// use server'
'use server';
/**
 * @fileOverview An AI agent that analyzes spending habits and provides personalized, actionable tips on how to reduce expenses and save more money.
 *
 * - getSmartSavingTips - A function that handles the process of analyzing spending habits and providing smart saving tips.
 * - SmartSavingTipsInput - The input type for the getSmartSavingTips function.
 * - SmartSavingTipsOutput - The return type for the getSmartSavingTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartSavingTipsInputSchema = z.object({
  income: z.array(
    z.object({
      category: z.string().describe('The category of income.'),
      amount: z.number().describe('The amount of income.'),
      date: z.string().describe('The date of the income.'),
    })
  ).describe('The itemized list of income transactions.'),
  expenses: z.array(
    z.object({
      category: z.string().describe('The category of expense.'),
      amount: z.number().describe('The amount of expense.'),
      date: z.string().describe('The date of the expense.'),
    })
  ).describe('The itemized list of expense transactions.'),
  financialGoals: z.array(
    z.object({
      goalName: z.string().describe('The name of the financial goal.'),
      targetAmount: z.number().describe('The target amount for the goal.'),
      currentAmount: z.number().describe('The current amount saved towards the goal.'),
    })
  ).describe('The list of financial goals the user has set.'),
});
export type SmartSavingTipsInput = z.infer<typeof SmartSavingTipsInputSchema>;

const SmartSavingTipsOutputSchema = z.object({
  savingTips: z.array(
    z.string().describe('A personalized and actionable tip on how to reduce expenses and save more money.')
  ).describe('The list of personalized and actionable saving tips.'),
  goalStatusUpdates: z.array(
    z.object({
      goalName: z.string().describe('The name of the financial goal.'),
      status: z.string().describe('The status of the goal, including progress and estimated time to completion.'),
    })
  ).describe('The list of updates on the status of the financial goals.'),
});
export type SmartSavingTipsOutput = z.infer<typeof SmartSavingTipsOutputSchema>;

export async function getSmartSavingTips(input: SmartSavingTipsInput): Promise<SmartSavingTipsOutput> {
  return smartSavingTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartSavingTipsPrompt',
  input: {schema: SmartSavingTipsInputSchema},
  output: {schema: SmartSavingTipsOutputSchema},
  prompt: `You are a financial advisor specializing in providing personalized saving tips.

  Analyze the user's income, expenses, and financial goals to provide actionable advice.

  Income:
  {{#each income}}
  - Category: {{category}}, Amount: {{amount}}, Date: {{date}}
  {{/each}}

  Expenses:
  {{#each expenses}}
  - Category: {{category}}, Amount: {{amount}}, Date: {{date}}
  {{/each}}

  Financial Goals:
  {{#each financialGoals}}
  - Goal Name: {{goalName}}, Target Amount: {{targetAmount}}, Current Amount: {{currentAmount}}
  {{/each}}

  Provide saving tips based on the spending habits, and provide updates on the status of the financial goals.
  `, 
});

const smartSavingTipsFlow = ai.defineFlow(
  {
    name: 'smartSavingTipsFlow',
    inputSchema: SmartSavingTipsInputSchema,
    outputSchema: SmartSavingTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

