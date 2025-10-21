
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

if (typeof process.env.NEXT_PUBLIC_GEMINI_API_KEY === 'string') {
  process.env.GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
}

export const ai = genkit({
  plugins: [googleAI()],
});
