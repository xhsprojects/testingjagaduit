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
    // Updated to handle "dua puluh lima" etc. - this is a simplification
    // A true library would be needed for full natural language number parsing.
    const numberWords: { [key: string]: number } = {
        'satu': 1, 'dua': 2, 'tiga': 3, 'empat': 4, 'lima': 5, 'enam': 6, 'tujuh': 7, 'delapan': 8, 'sembilan': 9, 'sepuluh': 10,
        'sebelas': 11, 'belas': 10, 'puluh': 10, 'ratus': 100, 'ribu': 1000, 'juta': 1000000,
    };
    
    // This is a simplified parser and won't handle all cases perfectly.
    // It's a placeholder for a more robust NLP library if needed.
    const words = text.split(/\s+/);
    let tempAmount = 0;
    let currentNumber = 0;

    for (const word of words) {
        const cleanedWord = word.replace(/[.,]/g, '').toLowerCase();
        const num = parseInt(cleanedWord, 10);
        
        if (!isNaN(num)) {
            currentNumber = currentNumber * 10 + num; // handles things like "dua lima" -> 25
        } else if (numberWords[cleanedWord]) {
            const val = numberWords[cleanedWord];
            if (val >= 1000) { // multiplier
                currentNumber = currentNumber === 0 ? 1 : currentNumber;
                tempAmount += currentNumber * val;
                currentNumber = 0;
            } else if (val === 100) {
                 currentNumber = currentNumber === 0 ? 1 : currentNumber;
                 currentNumber *= val;
            } else {
                currentNumber += val;
            }
        }
    }
    
    amount = tempAmount + currentNumber;

    // This is a rough way to extract description, can be improved.
    // Let's rely on the AI flow for better parsing.
    description = text.replace(/(\d[\d.,]*)\s*(ribu|juta)?/i, "").trim();


    // Fallback to original regex if word-based parsing fails
    if (amount === 0) {
        const amountRegex = /(\d[\d.,]*)\s*(ribu|juta)?/i;
        const match = text.match(amountRegex);
        
        if (match) {
            const num = parseInt(match[1].replace(/[.,]/g, ''), 10);
            let multiplier = 1;
            if (match[2]) {
                if (match[2].toLowerCase() === 'ribu') multiplier = 1000;
                if (match[2].toLowerCase() === 'juta') multiplier = 1000000;
            }
            amount = num * multiplier;
            description = text.replace(match[0], '').trim();
        }
    }

    return {
        amount,
        description: description || text, // return original text if description is empty
    };
}
