
'use server';
/**
 * @fileOverview An AI flow for parsing a spoken transaction query.
 *
 * - parseTransactionByVoice - A function that analyzes a spoken query and suggests transaction details.
 * - ParseTransactionByVoiceInput - The input type for the function.
 * - ParseTransactionByVoiceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ParseTransactionByVoiceInputSchema = z.object({
  query: z.string().describe("The user's spoken query, e.g., 'Makan siang 50 ribu pakai BCA'"),
  categoriesJSON: z.string().describe("A JSON string of the user's available spending categories, in the format [{id: string, name: string}]."),
  walletsJSON: z.string().describe("A JSON string of the user's available wallets, in the format [{id: string, name: string}]."),
});
export type ParseTransactionByVoiceInput = z.infer<typeof ParseTransactionByVoiceInputSchema>;

const ParseTransactionByVoiceOutputSchema = z.object({
  amount: z.number().describe("The transaction amount. Should always be positive."),
  notes: z.string().describe("A concise description of the transaction."),
  suggestedCategoryId: z.string().optional().describe("The ID of the most relevant category for this expense. Leave empty for income."),
  suggestedWalletId: z.string().optional().describe("The ID of the most relevant wallet mentioned or implied."),
  isIncome: z.boolean().describe("Set to true if this is an income, false if it's an expense."),
});
export type ParseTransactionByVoiceOutput = z.infer<typeof ParseTransactionByVoiceOutputSchema>;

export async function parseTransactionByVoice(input: ParseTransactionByVoiceInput): Promise<ParseTransactionByVoiceOutput | { error: string }> {
    if (!process.env.GEMINI_API_KEY) {
      return {
        error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server.'
      };
    }
    try {
        const result = await parseTransactionByVoiceFlow(input);
        return result;
    } catch (e: any) {
        console.error("Error in parseTransactionByVoice flow:", e);
        return {
            error: `Terjadi kesalahan saat memproses suara Anda. Detail: ${e.message}`,
        };
    }
}

const prompt = ai.definePrompt({
  name: 'parseTransactionByVoicePrompt',
  input: {schema: ParseTransactionByVoiceInputSchema},
  output: {schema: ParseTransactionByVoiceOutputSchema},
  prompt: `You are an expert at parsing spoken financial transactions. Analyze the user's query and extract the details.

**User's Query:** "{{query}}"

**Available Expense Categories:**
\`\`\`json
{{{categoriesJSON}}}
\`\`\`

**Available Wallets:**
\`\`\`json
{{{walletsJSON}}}
\`\`\`

**Your Task:**
1.  **Analyze Query:** Read the user's query carefully.
2.  **Determine Type:** Decide if it's an "income" (e.g., "dapat bonus", "gajian") or an "expense" (most other cases). Set \`isIncome\` accordingly.
3.  **Extract Amount:** Find the numeric value. Convert spoken numbers like "lima puluh ribu" to 50000. The amount should always be a positive number.
4.  **Suggest Category:** If it's an expense, find the most appropriate category from the user's list based on the query's keywords. Return its \`id\`. If no clear match, leave it empty.
5.  **Suggest Wallet:** Analyze the query for a wallet name (e.g., "BCA", "Gopay", "Tunai"). Find the best match from the user's wallet list and return its \`id\`.
6.  **Create Notes:** The rest of the query, excluding the amount and wallet/category keywords, should be the notes.
7.  **Output:** Return a single JSON object with the extracted information.
`,
});

const parseTransactionByVoiceFlow = ai.defineFlow(
  {
    name: 'parseTransactionByVoiceFlow',
    inputSchema: ParseTransactionByVoiceInputSchema,
    outputSchema: ParseTransactionByVoiceOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
