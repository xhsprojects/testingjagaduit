'use server';
/**
 * @fileOverview An AI flow for parsing transaction data from a CSV file.
 *
 * - parseTransactions - A function that analyzes CSV data and categorizes transactions.
 * - ParseTransactionsInput - The input type for the parseTransactions function.
 * - ParseTransactionsOutput - The return type for the parseTransactions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const TransactionSchema = z.object({
  date: z.string().describe("The transaction date in ISO 8601 format (YYYY-MM-DD)."),
  description: z.string().describe("A concise description of the transaction."),
  amount: z.number().describe("The transaction amount. Positive for income, negative for expenses."),
  suggestedCategoryId: z.string().optional().describe("The ID of the most relevant category for this expense. Leave empty for income."),
  isIncome: z.boolean().describe("Set to true if this is an income, false if it's an expense."),
});

const ParseTransactionsInputSchema = z.object({
  csvContent: z.string().describe("The full content of the CSV file as a single string."),
  columnMapping: z.object({
    date: z.string().describe("The name of the column header for the transaction date."),
    description: z.string().describe("The name of the column header for the transaction description."),
    amount: z.string().describe("The name of the column header for the transaction amount. If there are separate debit/credit columns, this can be either one and the AI will infer the correct sign."),
    debit: z.string().optional().describe("The name of the column for debit/expense amounts. Use this if debit and credit are in separate columns."),
    credit: z.string().optional().describe("The name of the column for credit/income amounts. Use this if debit and credit are in separate columns."),
  }).describe("A mapping of transaction properties to the corresponding CSV column headers."),
  userCategoriesJSON: z.string().describe("A JSON string of the user's available spending categories, in the format [{id: string, name: string}]."),
  dateFormat: z.string().optional().describe("An optional hint for the date format used in the CSV, e.g., 'DD/MM/YYYY' or 'MM-DD-YY'. The AI should try to parse dates correctly even without this hint."),
});
export type ParseTransactionsInput = z.infer<typeof ParseTransactionsInputSchema>;

const ParseTransactionsOutputSchema = z.object({
  transactions: z.array(TransactionSchema).describe("An array of parsed transaction objects."),
});
export type ParseTransactionsOutput = z.infer<typeof ParseTransactionsOutputSchema>;
export type ParsedTransaction = z.infer<typeof TransactionSchema>;

export async function parseTransactions(input: ParseTransactionsInput): Promise<ParseTransactionsOutput | { error: string }> {
    if (!process.env.GEMINI_API_KEY) {
      return {
        error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server.'
      };
    }
    try {
        const result = await parseTransactionsFlow(input);
        return result;
    } catch (e: any) {
        console.error("Error in parseTransactions flow:", e);
        return {
            error: `Terjadi kesalahan saat memproses file. Pastikan konfigurasi AI Anda benar. Detail: ${e.message}`,
        };
    }
}

const prompt = ai.definePrompt({
  name: 'parseTransactionsPrompt',
  input: {schema: ParseTransactionsInputSchema},
  output: {schema: ParseTransactionsOutputSchema},
  prompt: `You are an expert data processor specializing in bank statements. Your task is to parse the provided CSV content into a structured list of transactions.

**CSV Data:**
\`\`\`csv
{{{csvContent}}}
\`\`\`

**User's Instructions:**
- The date is in the column named: "{{columnMapping.date}}".
- The description is in the column named: "{{columnMapping.description}}".
{{#if columnMapping.amount}}
- The transaction value is in a single column named: "{{columnMapping.amount}}". Positive values are income, negative values are expenses.
{{/if}}
{{#if columnMapping.debit}}
- Expense values are in the column named: "{{columnMapping.debit}}".
{{/if}}
{{#if columnMapping.credit}}
- Income values are in the column named: "{{columnMapping.credit}}".
{{/if}}
{{#if dateFormat}}
- The date format is approximately: "{{dateFormat}}".
{{/if}}

**User's Expense Categories:**
\`\`\`json
{{{userCategoriesJSON}}}
\`\`\`

**Your Task:**
1.  **Parse Each Row:** Read each row of the CSV, ignoring the header.
2.  **Identify Transaction Type:**
    - If using a single amount column, determine if it's income (positive) or expense (negative).
    - If using debit/credit columns, use the appropriate column.
3.  **Standardize Data:**
    - **Date:** Convert the date to a strict \`YYYY-MM-DD\` format.
    - **Amount:** Convert the amount to a number. For expenses, ensure the final amount is **negative**. For income, ensure it's **positive**.
    - **Description:** Use the content from the description column.
4.  **Categorize Expenses:** For each **expense** transaction, analyze its description and choose the MOST LIKELY category ID from the provided user categories JSON. Do not guess; if no category is a clear match, leave \`suggestedCategoryId\` empty. Do not assign categories to income.
5.  **Output:** Return an array of transaction objects in the specified JSON format. Ensure all fields are correct. Set \`isIncome\` to \`true\` for incomes and \`false\` for expenses.
`,
});

const parseTransactionsFlow = ai.defineFlow(
  {
    name: 'parseTransactionsFlow',
    inputSchema: ParseTransactionsInputSchema,
    outputSchema: ParseTransactionsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
