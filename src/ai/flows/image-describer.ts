'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { gemini15Flash } from 'genkitx-googleai';

const describeImageFlow = ai.defineFlow(
  {
    name: 'describeImageFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (imageUrl) => {
    const llm = gemini15Flash;

    const response = await ai.generate({
      model: llm,
      prompt: [
        {
          text: 'Describe what is in this image in a concise but friendly way. If there is trash, mention it.',
        },
        {
          media: {
            url: imageUrl,
          },
        },
      ],
    });

    return response.text();
  }
);

export async function describeImage(imageUrl: string): Promise<string> {
  return await describeImageFlow(imageUrl);
}
