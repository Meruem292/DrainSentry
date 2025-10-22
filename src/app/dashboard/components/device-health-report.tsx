
'use client';
import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { generateHealthReport } from '@/ai/flows/analyze-device-data';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DeviceHealthReportProps {
  device: any;
  filteredHistory: { water: any[]; waste: any[] };
}

export default function DeviceHealthReport({ device, filteredHistory }: DeviceHealthReportProps) {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = () => {
    if (!device) {
      toast({
        variant: 'destructive',
        title: 'No Device Data',
        description: 'Cannot generate a report without device information.',
      });
      return;
    }

    startTransition(async () => {
      setError(null);
      setReport(null);
      try {
        const deviceData = {
          name: device.name,
          location: device.location,
          thresholds: device.thresholds,
          history: {
            water: filteredHistory.water.slice(0, 20), // Limit data sent to AI
            waste: filteredHistory.waste.slice(0, 20),
          }
        };

        const result = await generateHealthReport(deviceData);
        setReport(result.report);

      } catch (err: any) {
        console.error('Failed to generate report:', err);
        setError('An error occurred while generating the health report. Please try again.');
        toast({
          variant: 'destructive',
          title: 'Report Generation Failed',
          description: err.message || 'An unknown error occurred.',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <span>AI Health Report</span>
        </CardTitle>
        <CardDescription>
          Generate an AI-powered summary and analysis of the device's recent activity based on the selected date range.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[150px]">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center text-center text-destructive-foreground bg-destructive/80 p-4 rounded-lg">
                <AlertCircle className="h-8 w-8 mb-2" />
                <h4 className="font-semibold">Generation Failed</h4>
                <p className="text-sm">{error}</p>
            </div>
        ) : report ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
             <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>Click the button to generate a health report.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateReport} disabled={isPending}>
            {isPending ? (
                <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    Generating...
                </>
            ) : (
                <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Report
                </>
            )}
        </Button>
      </CardFooter>
    </Card>
  );
}
