
'use server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';
import { Buffer } from 'buffer';

const DetectTrashInputSchema = z.object({
  imageUrl: z.string().url(),
});
export type DetectTrashInput = z.infer<typeof DetectTrashInputSchema>;

const TrashDetectionResultSchema = z.object({
  trashDetected: z.boolean().describe("Whether or not trash was detected in the image."),
});
export type TrashDetectionResult = z.infer<typeof TrashDetectionResultSchema>;

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

async function urlToGenerativePart(url: string, mimeType: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType,
      },
    };
}

export async function detectTrashInImage(input: DetectTrashInput): Promise<TrashDetectionResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
        You are an AI assistant for a smart sanitation system. Your task is to detect trash in the provided image.
        - Analyze the image to identify any form of trash, such as plastic bags, cans, bottles, tires, or other debris.
        - It is crucial that you IGNORE the conveyor belt machinery itself, which might appear in the photo. Do not classify parts of the conveyor as trash.
        - Based on your analysis, respond with a simple "Yes" if any trash is detected, or "No" if no trash is found. Your response must be ONLY "Yes" or "No".
    `;
    
    // Assuming JPEG images. 
    const imagePart = await urlToGenerativePart(input.imageUrl, "image/jpeg");

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim().toLowerCase();

    const trashDetected = text === 'yes';

    return { trashDetected };

  } catch (error: any) {
    console.error("Error detecting trash in image:", error);
    throw new Error(`Failed to detect trash: ${error.message}`);
  }
}
