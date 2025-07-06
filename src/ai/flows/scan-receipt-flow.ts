
'use server';
/**
 * @fileOverview An AI flow for scanning and extracting information from receipts.
 *
 * - scanReceipt - A function that handles the receipt scanning process.
 * - ScanReceiptInput - The input type for the scanReceipt function.
 * - ScanReceiptOutput - The return type for the scanReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScanReceiptInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "An image of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ScanReceiptInput = z.infer<typeof ScanReceiptInputSchema>;

const ScanReceiptOutputSchema = z.object({
  totalAmount: z.number().optional().describe('The total amount found on the receipt. Must be a number without any currency symbols, commas, or periods. For example, 70000, not "Rp 70.000".'),
  notes: z.string().optional().describe("Write ALL readable information from the receipt: store name, address, complete itemized list with quantities and prices, transaction details. Be comprehensive and detailed. Example: 'Karis Jaya Shop - Jl. Dr. Ir. H. Soekarno No.19, Surabaya. Items: 1x Indomie Goreng (1 lusin) Rp36.000, 1x Fruit Tea Apple (1.500ml) Rp7.000'"),
});
export type ScanReceiptOutput = z.infer<typeof ScanReceiptOutputSchema>;

export async function scanReceipt(input: ScanReceiptInput): Promise<ScanReceiptOutput | { error: string }> {
  if (!process.env.GEMINI_API_KEY) {
      return {
          error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server. Silakan hubungi admin aplikasi untuk menyiapkannya.'
      };
  }
  try {
      const result = await scanReceiptFlow(input);
      return result;
  } catch (e: any) {
      console.error("Error in scanReceipt flow:", e);
      return {
          error: `Terjadi kesalahan saat memindai struk. Pastikan konfigurasi AI Anda benar dan coba lagi. Detail: ${e.message}`,
      };
  }
}

const prompt = ai.definePrompt({
  name: 'scanReceiptPrompt',
  input: {schema: ScanReceiptInputSchema},
  output: {schema: ScanReceiptOutputSchema},
  prompt: `You are an OCR expert. Read ALL visible text from this receipt image carefully.

**STEP 1: READ THE TEXT**
Look at the receipt and identify:
- Store name (usually at the top)
- Store address 
- All item names with quantities and prices
- Total amount

**STEP 2: EXTRACT TOTAL**
Find the final total amount. Remove "Rp", dots, commas. Return as pure number.
Example: "Rp 43.000" → return 43000

**STEP 3: WRITE DETAILED NOTES** 
Write exactly what you read from the receipt in this format:
"[Store Name] - [Address]. Items: [Item 1] [qty] x [price], [Item 2] [qty] x [price]"

**IMPORTANT**: 
- READ the text character by character if needed
- DO NOT say "cannot read" - force yourself to read what's visible
- If you see "Indomie" write "Indomie", if you see "Shop" write "Shop"
- Extract ALL readable information

**Example for a clear receipt:**
Total: 43000
Notes: "Karis Jaya Shop - Jl. Dr. Ir. H. Soekarno No.19, Surabaya. Items: 1x Indomie Goreng (1 lusin) Rp36.000, 1x Fruit Tea Apple (1.500ml) Rp7.000"

**READ THIS RECEIPT NOW:**
{{media url=receiptImage}}`,
});

const scanReceiptFlow = ai.defineFlow(
  {
    name: 'scanReceiptFlow',
    inputSchema: ScanReceiptInputSchema,
    outputSchema: ScanReceiptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    // Minimal processing - let AI handle the details
    if (!output || (!output.notes && !output.totalAmount)) {
       return {
        totalAmount: undefined,
        notes: "Informasi struk tidak dapat dibaca - Silakan isi manual"
      };
    }
    
    return output!;
  }
);
