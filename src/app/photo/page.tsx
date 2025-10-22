
"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, Sparkles, Bot, Search, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { detectTrashInImage } from "@/ai/flows/describe-image";
import { Badge } from "@/components/ui/badge";
import { initializeFirebase } from "@/firebase";
import { ref, update } from "firebase/database";

// Hardcoded user ID and device ID for the public endpoint
const SYSTEM_USER_ID = "OpbukfATHoX0LTgeJuNhuqi1gAF3";
const DEVICE_ID = "DS-001";

function PhotoPageComponent() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const { database } = initializeFirebase();

    const [isPending, startTransition] = useTransition();
    const [detectionResult, setDetectionResult] = useState<boolean | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const fetchLatestImage = async () => {
        setLoading(true);
        setError(null);
        setImageUrl(null);
        setDetectionResult(null);
        setAiError(null);
        try {
            const { data: files, error: listError } = await supabase
                .storage
                .from('drainsentryPhoto')
                .list('photos', {
                    limit: 1,
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
                
                const url = `${data.publicUrl}?t=${new Date().getTime()}`;
                setImageUrl(url);
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
    
    const handleDetectTrash = () => {
        if (!imageUrl || !database) return;

        startTransition(async () => {
            setAiError(null);
            setDetectionResult(null);
            try {
                const result = await detectTrashInImage({ imageUrl });
                setDetectionResult(result.trashDetected);
                
                const deviceRef = ref(database, `users/${SYSTEM_USER_ID}/devices/${DEVICE_ID}`);
                await update(deviceRef, { manualConveyor: result.trashDetected });

                toast({
                    title: `Detection complete: Conveyor ${result.trashDetected ? 'Activated' : 'Deactivated'}`,
                    description: `Trash was ${result.trashDetected ? '' : 'not '}detected.`,
                });
            } catch (err: any) {
                console.error('Failed to detect trash or update device:', err);
                setAiError('An error occurred during the process. Please try again.');
                toast({
                    variant: 'destructive',
                    title: 'Process Failed',
                    description: err.message || 'An unknown error occurred.',
                });
            }
        });
    };

    useEffect(() => {
        fetchLatestImage();
    }, []);
    
    useEffect(() => {
        if (imageUrl && !loading) {
            handleDetectTrash();
        }
    }, [imageUrl, loading]);


    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="max-w-3xl w-full space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Latest Conveyor Photo</CardTitle>
                        <CardDescription>Automatically analyzing the most recent photo for trash and controlling the conveyor.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                            {loading && <Skeleton className="h-full w-full" />}
                            {error && !imageUrl && !loading && (
                                <div className="flex flex-col items-center justify-center h-full text-center text-destructive">
                                    <AlertTriangle className="h-12 w-12 mb-4" />
                                    <h3 className="text-lg font-bold">Error Loading Image</h3>
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}
                            {imageUrl && !loading && (
                                <Image
                                    src={imageUrl}
                                    alt="Latest photo from DrainSentry device"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                    key={imageUrl}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {(isPending || detectionResult !== null || aiError) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-6 w-6 text-primary" />
                                <span>AI Analysis Result</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="min-h-[100px] flex items-center justify-center">
                            {isPending ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader className="h-5 w-5 animate-spin" />
                                    <span>Analyzing image...</span>
                                </div>
                            ) : aiError ? (
                                <div className="flex flex-col items-center justify-center text-center text-destructive-foreground bg-destructive/80 p-4 rounded-lg">
                                    <AlertTriangle className="h-8 w-8 mb-2" />
                                    <h4 className="font-semibold">Analysis Failed</h4>
                                    <p className="text-sm">{aiError}</p>
                                </div>
                            ) : detectionResult !== null ? (
                                <div className="text-center">
                                    {detectionResult ? (
                                        <Badge variant="destructive" className="text-lg px-4 py-2">Trash Detected</Badge>
                                    ) : (
                                        <Badge variant="success" className="text-lg px-4 py-2 bg-success">No Trash Detected</Badge>
                                    )}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function PhotoPage() {
    return (
        <PhotoPageComponent />
    );
}
