
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { configureGenkit } from '@genkit-ai/next';

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const ai = genkit;
