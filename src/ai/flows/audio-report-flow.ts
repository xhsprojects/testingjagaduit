'use server';
/**
 * @fileOverview A Genkit flow to convert a text summary into speech.
 *
 * - generateReportAudio - A function that takes a text string and returns a data URI for an audio file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as wav from 'wav';
import { googleAI } from '@genkit-ai/googleai';

// Zod schemas for input and output
const AudioReportInputSchema = z.object({
  text: z.string().min(1, 'Teks ringkasan tidak boleh kosong.'),
});
export type AudioReportInput = z.infer<typeof AudioReportInputSchema>;

const AudioReportOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a data URI in WAV format."),
});
export type AudioReportOutput = z.infer<typeof AudioReportOutputSchema>;

// The main exported function that clients will call.
export async function generateReportAudio(input: AudioReportInput): Promise<AudioReportOutput | { error: string }> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      error: 'Konfigurasi Fitur AI tidak lengkap. Kunci API Gemini (GEMINI_API_KEY) tidak ada di server.'
    };
  }
  try {
    const result = await audioReportFlow(input);
    return result;
  } catch (e: any) {
    console.error("Error in generateReportAudio flow:", e);
    return {
      error: `Gagal membuat audio: ${e.message}`,
    };
  }
}

/**
 * Converts raw PCM audio data buffer to a Base64 encoded WAV string.
 */
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

// The Genkit flow definition
const audioReportFlow = ai.defineFlow(
  {
    name: 'audioReportFlow',
    inputSchema: AudioReportInputSchema,
    outputSchema: AudioReportOutputSchema,
  },
  async ({ text }) => {
    // Generate audio using the Gemini TTS model
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // A standard male voice
          },
        },
      },
      prompt: text,
    });

    if (!media?.url) {
      throw new Error('Gagal menerima audio dari AI.');
    }

    // Convert the raw PCM data from the data URI to a WAV buffer
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);

    return {
      audioDataUri: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
