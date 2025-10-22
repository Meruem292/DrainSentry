
'use server';
import { ai } from '@/ai/genkit';
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

const analysisPrompt = ai.definePrompt({
    name: 'deviceDataAnalyzer',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: DeviceDataSchema },
    output: { schema: AnalysisReportSchema },
    prompt: `
        You are a senior data analyst for DrainSentry, a smart sanitation monitoring company.
        Your task is to provide a "Daily Health Report" for a monitoring device based on its recent sensor data.

        Device Information:
        - Name: {{{name}}}
        - Location: {{{location}}}

        Alerting Thresholds:
        - Water Level > {{{thresholds.waterLevel}}}%
        - Bin Fullness > {{{thresholds.binFullness}}}%
        - Bin Weight > {{{thresholds.wasteWeight}}} kg

        Recent Water Level History (last 24 hours):
        {{#if history.water.length}}
            {{#each history.water}}
                - Timestamp: {{{this.timestamp}}}, Level: {{{this.level}}}%
            {{/each}}
        {{else}}
            - No water level data reported.
        {{/if}}

        Recent Waste Bin History (last 24 hours):
        {{#if history.waste.length}}
            {{#each history.waste}}
                - Timestamp: {{{this.timestamp}}}, Fullness: {{{this.fullness}}}%, Weight: {{{this.weight}}} kg
            {{/each}}
        {{else}}
            - No waste bin data reported.
        {{/if}}

        Instructions:
        1.  **Analyze the Data**: Carefully review the provided data logs against the thresholds.
        2.  **Identify Key Events**: Look for threshold breaches, significant spikes/dips, or periods of inactivity.
        3.  **Synthesize Findings**: Summarize your findings in a clear, concise, and easy-to-understand report.
        4.  **Format as Markdown**: Structure your report using Markdown for readability (headings, lists, bold text).
        5.  **Provide Actionable Insights**: If issues are found, suggest a recommended action. If all is normal, state that clearly.

        Generate the report for the 'report' field in the output.
    `,
});


const analyzeDeviceDataFlow = ai.defineFlow(
  {
    name: 'analyzeDeviceDataFlow',
    inputSchema: DeviceDataSchema,
    outputSchema: AnalysisReportSchema,
  },
  async (deviceData) => {
    const { output } = await analysisPrompt(deviceData);
    if (!output) {
        throw new Error("Unable to generate analysis report.");
    }
    return output;
  }
);


export async function generateHealthReport(deviceData: DeviceData) {
    return await analyzeDeviceDataFlow(deviceData);
}
