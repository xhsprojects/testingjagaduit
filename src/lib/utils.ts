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
 * This is a simplified parser and should be used for basic client-side assistance.
 * @param text The input string, e.g., "Makan siang 50 ribu".
 * @returns An object with the parsed amount and the remaining description.
 */
export function parseSpokenAmount(text: string): { amount: number; description: string } {
    let amount = 0;
    let description = text;

    // Regex to find a number (with dots or commas) followed by an optional multiplier.
    const amountRegex = /(\d[\d.,]*)\s*(ribu|juta|rb)?/i;
    const match = text.match(amountRegex);
    
    if (match) {
        const numPart = match[1].replace(/[.,]/g, '');
        const num = parseInt(numPart, 10);
        let multiplier = 1;

        if (match[2]) {
            const multiplierWord = match[2].toLowerCase();
            if (multiplierWord === 'ribu' || multiplierWord === 'rb') {
                multiplier = 1000;
            } else if (multiplierWord === 'juta') {
                multiplier = 1000000;
            }
        }
        
        amount = num * multiplier;
        // Also remove any extra space that might be left
        description = text.replace(match[0], '').replace(/\s+/, ' ').trim();
    }
    
    // If no match was found, just return 0 and the original text
    if (amount === 0) {
        return { amount: 0, description: text };
    }

    return {
        amount,
        description,
    };
}
