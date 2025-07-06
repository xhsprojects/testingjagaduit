import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

console.log("Loading src/ai/genkit.ts module...");

// Explicitly get the key from environment variables.
const geminiApiKey = process.env.GEMINI_API_KEY;

const plugins = [];
let model: any = undefined;

// Make the check robust: ensure the key is a non-empty string.
if (geminiApiKey && geminiApiKey.trim() !== '') {
  console.log("GEMINI_API_KEY is present. Initializing googleAI plugin.");
  try {
    plugins.push(googleAI({apiKey: geminiApiKey}));
    model = 'googleai/gemini-2.0-flash';
    console.log("googleAI plugin initialized successfully.");
  } catch (e: any) {
    console.error("CRITICAL: Failed to initialize googleAI plugin even with API key.", e);
  }
} else {
  // This log is crucial. The user should check their Vercel server logs for this message.
  console.error("CRITICAL: GEMINI_API_KEY is NOT FOUND or is EMPTY in environment variables. All AI features will be disabled.");
}

export const ai = genkit({
  plugins: plugins,
  // Only set a default model if the plugin was successfully loaded.
  ...(model && { model: model }),
});

console.log(`Genkit initialized with ${plugins.length} plugin(s).`);
