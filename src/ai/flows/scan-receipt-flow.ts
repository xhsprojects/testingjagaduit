
'use server';
/**
 * @fileOverview An AI flow for scanning and extracting itemized information from receipts.
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

const ScannedItemSchema = z.object({
    name: z.string().describe("The name of the item purchased."),
    quantity: z.number().default(1).describe("The quantity of the item purchased."),
    price: z.number().describe("The price of a single unit of the item."),
});

const ScanReceiptOutputSchema = z.object({
    items: z.array(ScannedItemSchema).describe("A detailed list of all items found on the receipt."),
    totalAmount: z.number().optional().describe('The final total amount found on the receipt. Must be a number without any currency symbols, commas, or periods.'),
    notes: z.string().optional().describe("General information from the receipt, such as the store name and address."),
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
  prompt: `You are an expert OCR data extractor. Analyze the provided receipt image and extract all itemized details.

**Your Task:**
1.  **Identify Each Item:** Read the receipt line by line and identify every single item purchased.
2.  **Extract Item Details:** For each item, extract its name, quantity, and the price PER-UNIT.
    - If a line says "2 x Indomie Goreng 7.000", the name is "Indomie Goreng", quantity is 2, and price is 3500.
    - If a line says "Kopi Susu 15.000" without quantity, assume the quantity is 1.
    - The price should be a pure number, without "Rp" or commas.
3.  **Extract Total Amount:** Find the final, total amount of the bill.
4.  **Extract Store Name:** Identify the name of the store or merchant. Put this in the 'notes' field.
5.  **Compile Output:** Return a JSON object containing an array of all items, the total amount, and the store name.

**Example:**
For a receipt with "Kopi Susu 15.000" and "2 Roti Coklat 10.000", your output for the 'items' array would be:
[
  { "name": "Kopi Susu", "quantity": 1, "price": 15000 },
  { "name": "Roti Coklat", "quantity": 2, "price": 5000 }
]

**READ THIS RECEIPT NOW AND EXTRACT THE DATA:**
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
    
    if (!output || (!output.items && !output.totalAmount)) {
       return {
        items: [],
        totalAmount: undefined,
        notes: "Informasi struk tidak dapat dibaca - Silakan isi manual"
      };
    }
    
    return output!;
  }
);
