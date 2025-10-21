
'use server';
/**
 * @fileOverview A server action for detecting trash in an image.
 * This file exports a function that wraps a Genkit flow.
 */

import { detectTrashFlow, type TrashInput, type TrashOutput } from '@/ai/genkit';

export async function detectTrash(input: TrashInput): Promise<TrashOutput> {
  return detectTrashFlow(input);
}
