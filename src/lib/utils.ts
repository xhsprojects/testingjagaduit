import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parses a string to extract a numeric amount and a description.
 * It looks for digits followed by optional multipliers like 'ribu' or 'juta'.
 * @param text The input string, e.g., "Makan siang 50 ribu".
 * @returns An object with the parsed amount and the remaining description.
 */
export function parseSpokenAmount(text: string): { amount: number; description: string } {
    let amount = 0;
    let description = text;

    // Regex to find a number (with dots or commas) followed by an optional multiplier.
    const amountRegex = /(\d[\d.,]*)\s*(ribu|juta)?/i;
    const match = text.match(amountRegex);
    
    if (match) {
        // Extract the number and remove formatting.
        const num = parseInt(match[1].replace(/[.,]/g, ''), 10);

        // Determine the multiplier.
        let multiplier = 1;
        if (match[2]) {
             if (match[2].toLowerCase() === 'ribu') multiplier = 1000;
             if (match[2].toLowerCase() === 'juta') multiplier = 1000000;
        }

        // Calculate the final amount.
        amount = num * multiplier;
        // The description is the original text with the matched amount part removed.
        description = text.replace(match[0], '').trim();
    }

    return {
        amount,
        description,
    };
}
