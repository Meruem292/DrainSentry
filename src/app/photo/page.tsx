"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { detectTrash } from "@/ai/flows/trash-detector";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, BrainCircuit } from "lucide-react";

export default function PhotoPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [detectionResult, setDetectionResult] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLatestImage = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: files, error: listError } = await supabase
                    .storage
                    .from('drainsentryPhoto')
                    .list('photos', {
                        limit: 100,
                        offset: 0,
                        sortBy: { column: 'created_at', order: 'desc' },
                    });

                if (listError) throw listError;

                if (files && files.length > 0) {
                    const latestFile = files[0];
                    const { data } = supabase
                        .storage
                        .from('drainsentryPhoto')
                        .getPublicUrl(`photos/${latestFile.name}`);
                    
                    setImageUrl(data.publicUrl);
                } else {
                    setError("No photos found in the storage bucket.");
                }
            } catch (err: any) {
                console.error("Error fetching image:", err);
                setError(err.message || "Failed to fetch the latest image.");
            } finally {
                setLoading(false);
            }
        };

        fetchLatestImage();
    }, []);

    useEffect(() => {
        if (imageUrl) {
            const analyzeImage = async () => {
                setAnalyzing(true);
                setDetectionResult(null);
                try {
                    const result = await detectTrash({ imageUrl });
                    setDetectionResult(result.isTrashDetected);
                } catch (err) {
                    console.error("AI analysis failed:", err);
                    setError("Failed to analyze the image.");
                } finally {
                    setAnalyzing(false);
                }
            };
            analyzeImage();
        }
    }, [imageUrl]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-3xl w-full">
                <CardHeader>
                    <CardTitle>Latest Conveyor Photo & Analysis</CardTitle>
                    <CardDescription>Displaying the most recent photo captured and analyzing it for trash.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                        {loading && <Skeleton className="h-full w-full" />}
                        {error && !loading && (
                             <div className="flex flex-col items-center justify-center h-full text-center text-destructive">
                                <AlertTriangle className="h-12 w-12 mb-4" />
                                <h3 className="text-lg font-bold">Error Loading Image</h3>
                                <p className="text-sm">{error}</p>
                            </div>
                        )}
                        {imageUrl && !loading && !error && (
                            <Image
                                src={imageUrl}
                                alt="Latest photo from DrainSentry device"
                                fill
                                className="object-contain"
                                unoptimized // Required for Supabase Storage URLs without a custom loader
                            />
                        )}
                    </div>
                    <div className="mt-4 p-4 border rounded-lg flex items-center justify-center text-lg font-semibold">
                         {analyzing && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <BrainCircuit className="h-5 w-5 animate-pulse" />
                                <span>Analyzing for trash...</span>
                            </div>
                         )}
                         {!analyzing && detectionResult !== null && (
                            detectionResult ? (
                                <div className="flex items-center gap-2 text-destructive">
                                    <AlertTriangle className="h-5 w-5" />
                                    <span>Trash Detected</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-success">
                                    <CheckCircle className="h-5 w-5" />
                                    <span>No Trash Detected</span>
                                </div>
                            )
                         )}
                         {!analyzing && detectionResult === null && !loading && (
                            <div className="text-muted-foreground">
                                {error ? "Analysis failed." : "Ready to analyze."}
                            </div>
                         )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
