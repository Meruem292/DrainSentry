
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


// Define the prompt for trash detection
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


// Define the flow for trash detection and export it
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


// Define Schemas for the image describer
const DescribeImageInputSchema = z.object({
  imageUrl: z.string().url().describe('The public URL of the image to analyze.'),
});
export type DescribeImageInput = z.infer<typeof DescribeImageInputSchema>;

const DescribeImageOutputSchema = z.object({
  description: z.string().describe('A concise paragraph describing the contents of the image.'),
});
export type DescribeImageOutput = z.infer<typeof DescribeImageOutputSchema>;


// Define the prompt for image description
const describeImagePrompt = ai.definePrompt({
    name: 'describeImagePrompt',
    input: { schema: DescribeImageInputSchema },
    output: { schema: DescribeImageOutputSchema },
    prompt: `Describe what you see in this image in a concise paragraph. Image: {{media url=imageUrl}}.`,
});

// Define the flow for image description and export it
export const describeImageFlow = ai.defineFlow(
  {
    name: 'describeImageFlow',
    inputSchema: DescribeImageInputSchema,
    outputSchema: DescribeImageOutputSchema,
  },
  async (input) => {
    const { output } = await describeImagePrompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid response.");
    }
    return output;
  }
);
