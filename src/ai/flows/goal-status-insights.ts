'use server';

/**
 * @fileOverview AI-driven insights on progress towards financial goals.
 *
 * - getGoalStatusInsights - A function that provides insights on the user's progress towards their financial goals.
 * - GoalStatusInsightsInput - The input type for the getGoalStatusInsights function.
 * - GoalStatusInsightsOutput - The return type for the getGoalStatusInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GoalStatusInsightsInputSchema = z.object({
  goals: z
    .array(
      z.object({
        name: z.string().describe('The name of the financial goal.'),
        targetAmount: z.number().describe('The target amount for the goal.'),
        currentAmount: z.number().describe('The current amount saved towards the goal.'),
        deadline: z.string().describe('The deadline for the goal (ISO format).'),
      })
    )
    .describe('The list of financial goals the user has defined.'),
  income: z.number().describe('The user monthly income.'),
  expenses: z.array(
    z.object({
      category: z.string().describe('The category of the expense.'),
      amount: z.number().describe('The amount spent on the expense.'),
    })
  ).describe('The list of monthly expenses.'),
});

export type GoalStatusInsightsInput = z.infer<typeof GoalStatusInsightsInputSchema>;

const GoalStatusInsightsOutputSchema = z.object({
  insights: z.array(
    z.object({
      goalName: z.string().describe('The name of the financial goal.'),
      status: z.string().describe('A summary of the progress towards the goal.'),
      suggestions: z.string().describe('Suggestions on how to better achieve the goal.'),
    })
  ).describe('Insights on the user progress towards their financial goals.'),
});

export type GoalStatusInsightsOutput = z.infer<typeof GoalStatusInsightsOutputSchema>;

export async function getGoalStatusInsights(input: GoalStatusInsightsInput): Promise<GoalStatusInsightsOutput> {
  return goalStatusInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'goalStatusInsightsPrompt',
  input: {schema: GoalStatusInsightsInputSchema},
  output: {schema: GoalStatusInsightsOutputSchema},
  prompt: `You are a financial advisor providing insights to users on their progress towards financial goals.

  For each goal, analyze the current progress, and provide a status update and personalized suggestions on how to better achieve the goal, taking into account the user's income and expenses.

  Goals:
  {{#each goals}}
  - Name: {{name}}, Target Amount: {{targetAmount}}, Current Amount: {{currentAmount}}, Deadline: {{deadline}}
  {{/each}}

  Income: {{income}}

  Expenses:
  {{#each expenses}}
  - Category: {{category}}, Amount: {{amount}}
  {{/each}}

  Format your answer as a list of JSON objects. Each object should have the following fields:
  - goalName: The name of the financial goal.
  - status: A summary of the progress towards the goal.
  - suggestions: Suggestions on how to better achieve the goal.
  Ensure the JSON is valid and parsable.
  `,
});

const goalStatusInsightsFlow = ai.defineFlow(
  {
    name: 'goalStatusInsightsFlow',
    inputSchema: GoalStatusInsightsInputSchema,
    outputSchema: GoalStatusInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
