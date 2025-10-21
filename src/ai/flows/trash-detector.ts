'use server';
/**
 * @fileOverview A Genkit flow for detecting trash in an image.
 *
 * - detectTrash - A function that analyzes an image URL for the presence of trash.
 * - TrashInputSchema - The input type for the detectTrash function.
 * - TrashOutputSchema - The return type for the detectTrash function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const TrashInputSchema = z.object({
  imageUrl: z.string().url().describe('The public URL of the image to analyze.'),
});
export type TrashInput = z.infer<typeof TrashInputSchema>;

export const TrashOutputSchema = z.object({
  isTrashDetected: z.boolean().describe('Whether or not any form of trash was detected in the image.'),
  reasoning: z.string().describe('A brief explanation of why trash was or was not detected.'),
});
export type TrashOutput = z.infer<typeof TrashOutputSchema>;


export async function detectTrash(input: TrashInput): Promise<TrashOutput> {
  return detectTrashFlow(input);
}


const trashDetectionPrompt = ai.definePrompt({
    name: 'trashDetectionPrompt',
    input: { schema: TrashInputSchema },
    output: { schema: TrashOutputSchema },
    prompt: `
        You are an AI expert in waste identification. Your task is to determine if the provided image contains any form of trash.

        Image to analyze is at: {{media url=imageUrl}}

        CRITICAL INSTRUCTIONS:
        1.  Analyze the image for common types of trash, including but not limited to: plastic bags, cans, bottles, tires, food wrappers, or any other man-made refuse.
        2.  You MUST EXCLUDE the conveyor belt system or any part of the machinery itself from the definition of "trash". The conveyor is part of the environment, not waste.
        3.  If any trash is present, set 'isTrashDetected' to true.
        4.  If no trash is found, set 'isTrashDetected' to false.
        5.  Provide a short, one-sentence reasoning for your decision.
    `,
});


const detectTrashFlow = ai.defineFlow(
  {
    name: 'detectTrashFlow',
    inputSchema: TrashInputSchema,
    outputSchema: TrashOutputSchema,
  },
  async (input) => {
    const { output } = await trashDetectionPrompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid response.");
    }
    return output;
  }
);
