
'use server';
/**
 * @fileOverview A server action for describing an image.
 * This file exports a function that wraps a Genkit flow.
 */

import { describeImageFlow, type DescribeImageInput, type DescribeImageOutput } from '@/ai/genkit';

export async function describeImage(input: DescribeImageInput): Promise<DescribeImageOutput> {
  return describeImageFlow(input);
}
