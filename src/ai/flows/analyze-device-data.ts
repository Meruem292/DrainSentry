
'use server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';

const DeviceDataSchema = z.object({
  name: z.string().optional(),
  location: z.string().optional(),
  thresholds: z
    .object({
      waterLevel: z.number(),
      binFullness: z.number(),
      wasteWeight: z.number(),
    })
    .optional(),
  history: z
    .object({
      water: z.array(z.any()),
      waste: z.array(z.any()),
    })
    .optional(),
});
export type DeviceData = z.infer<typeof DeviceDataSchema>;

const AnalysisReportSchema = z.object({
  report: z.string().describe("A detailed analysis report in Markdown format."),
});
export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

function buildPrompt(deviceData: DeviceData) {
    const waterHistory = deviceData.history?.water.map(d => `- Timestamp: ${d.timestamp}, Level: ${d.level}%`).join('\n') || 'No water level data reported.';
    const wasteHistory = deviceData.history?.waste.map(d => `- Timestamp: ${d.timestamp}, Fullness: ${d.filled}%, Weight: ${d.weight} kg`).join('\n') || 'No waste bin data reported.';

    return `
        You are a senior data analyst for DrainSentry, a smart sanitation monitoring company.
        Your task is to provide a "Daily Health Report" for a monitoring device based on its recent sensor data.

        Device Information:
        - Name: ${deviceData.name}
        - Location: ${deviceData.location}

        Alerting Thresholds:
        - Water Level > ${deviceData.thresholds?.waterLevel}%
        - Bin Fullness > ${deviceData.thresholds?.binFullness}%
        - Bin Weight > ${deviceData.thresholds?.wasteWeight} kg

        Recent Water Level History (last 24 hours):
        ${waterHistory}

        Recent Waste Bin History (last 24 hours):
        ${wasteHistory}

        Instructions:
        1.  **Analyze the Data**: Carefully review the provided data logs against the thresholds.
        2.  **Identify Key Events**: Look for threshold breaches, significant spikes/dips, or periods of inactivity.
        3.  **Synthesize Findings**: Summarize your findings in a clear, concise, and easy-to-understand report.
        4.  **Format as Markdown**: Structure your report using Markdown for readability (headings, lists, bold text).
        5.  **Provide Actionable Insights**: If issues are found, suggest a recommended action. If all is normal, state that clearly.

        Generate a Markdown report.
    `;
}

export async function generateHealthReport(deviceData: DeviceData): Promise<AnalysisReport> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = buildPrompt(deviceData);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { report: text };

    } catch (error: any) {
        console.error("Error generating health report:", error);
        throw new Error(`Failed to generate report: ${error.message}`);
    }
}
