
'use server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';
import { Buffer } from 'buffer';

const DescribeImageInputSchema = z.object({
  imageUrl: z.string().url(),
});
export type DescribeImageInput = z.infer<typeof DescribeImageInputSchema>;

const ImageDescriptionSchema = z.object({
  description: z.string().describe("A detailed description of the image."),
});
export type ImageDescription = z.infer<typeof ImageDescriptionSchema>;

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

async function urlToGenerativePart(url: string, mimeType: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType,
      },
    };
}

export async function describeImage(input: DescribeImageInput): Promise<ImageDescription> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = "Describe this image in detail. What objects do you see? What is the context?";
    
    // Assuming JPEG images from Supabase. You might need to make this more robust
    // if you store other image types.
    const imagePart = await urlToGenerativePart(input.imageUrl, "image/jpeg");

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    return { description: text };

  } catch (error: any) {
    console.error("Error describing image:", error);
    throw new Error(`Failed to describe image: ${error.message}`);
  }
}
