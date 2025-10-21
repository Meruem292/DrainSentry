
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { z } from 'genkit';


export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-latest',
});


// Define Schemas for the trash detector
const TrashInputSchema = z.object({
  imageUrl: z.string().url().describe('The public URL of the image to analyze.'),
});
export type TrashInput = z.infer<typeof TrashInputSchema>;

const TrashOutputSchema = z.object({
  isTrashDetected: z.boolean().describe('Whether or not any form of trash was detected in the image.'),
  reasoning: z.string().describe('A brief explanation of why trash was or was not detected.'),
});
export type TrashOutput = z.infer<typeof TrashOutputSchema>;


// Define the prompt
const trashDetectionPrompt = ai.definePrompt({
    name: 'trashDetectionPrompt',
    input: { schema: TrashInputSchema },
    output: { schema: TrashOutputSchema },
    prompt: `
        Analyze the image for trash. Image: {{media url=imageUrl}}.

        Primary Task: Determine if trash is present.
        - Trash includes: plastic bags, cans, bottles, tires, food wrappers, general refuse.
        - EXCLUDE: The conveyor belt and any machinery are NOT trash.

        Set 'isTrashDetected' to true if trash is found, otherwise false. Provide a brief 'reasoning'.
    `,
});


// Define the flow and export it
export const detectTrashFlow = ai.defineFlow(
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
