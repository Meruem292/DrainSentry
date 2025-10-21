
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Sparkles } from "lucide-react";
import { describeImage } from "@/ai/flows/image-describer";

export default function PhotoPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [description, setDescription] = useState<string | null>(null);

    useEffect(() => {
        const fetchLatestImage = async () => {
            setLoading(true);
            setError(null);
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

    const handleAnalyzeImage = async () => {
        if (!imageUrl) return;
        setAnalyzing(true);
        setDescription(null);
        setError(null);
        try {
            const result = await describeImage(imageUrl);
            setDescription(result);
        } catch (err: any) {
            setError(err.message || "Failed to analyze image.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="max-w-3xl w-full space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Latest Conveyor Photo</CardTitle>
                        <CardDescription>Displaying the most recent photo captured by the device.</CardDescription>
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
                                    unoptimized // Required for Supabase Storage URLs without a custom loader
                                />
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-4">
                        <Button onClick={handleAnalyzeImage} disabled={!imageUrl || analyzing || loading}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            {analyzing ? 'Analyzing...' : 'Describe Image'}
                        </Button>

                        {description && !analyzing && (
                             <Card className="w-full bg-primary/5 border-primary/20">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm">{description}</p>
                                </CardContent>
                            </Card>
                        )}
                        {analyzing && (
                             <div className="w-full p-4 border rounded-lg">
                                <Skeleton className="h-4 w-1/4 mb-2" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4 mt-2" />
                            </div>
                        )}
                        {error && !analyzing && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
