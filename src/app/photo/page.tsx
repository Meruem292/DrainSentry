
"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, Sparkles, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { describeImage } from "@/ai/flows/describe-image";

export default function PhotoPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const [isPending, startTransition] = useTransition();
    const [description, setDescription] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const fetchLatestImage = async () => {
        setLoading(true);
        setError(null);
        setImageUrl(null);
        setDescription(null);
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

    useEffect(() => {
        fetchLatestImage();
    }, []);

    const handleDescribeImage = () => {
        if (!imageUrl) {
            toast({
                variant: 'destructive',
                title: 'No Image to Analyze',
                description: 'Please wait for the image to load first.',
            });
            return;
        }

        startTransition(async () => {
            setAiError(null);
            setDescription(null);
            try {
                const result = await describeImage({ imageUrl });
                setDescription(result.description);
            } catch (err: any) {
                console.error('Failed to describe image:', err);
                setAiError('An error occurred while analyzing the image. Please try again.');
                toast({
                    variant: 'destructive',
                    title: 'Analysis Failed',
                    description: err.message || 'An unknown error occurred.',
                });
            }
        });
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
                                    unoptimized
                                    key={imageUrl}
                                />
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="gap-4">
                        <Button onClick={fetchLatestImage} disabled={loading}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {loading ? 'Refreshing...' : 'Refresh Photo'}
                        </Button>
                        <Button onClick={handleDescribeImage} disabled={isPending || !imageUrl}>
                            {isPending ? (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Describe with AI
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {(isPending || description || aiError) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="h-6 w-6 text-primary" />
                                <span>AI Analysis</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="min-h-[100px]">
                            {isPending ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-4/5" />
                                </div>
                            ) : aiError ? (
                                <div className="flex flex-col items-center justify-center text-center text-destructive-foreground bg-destructive/80 p-4 rounded-lg">
                                    <AlertTriangle className="h-8 w-8 mb-2" />
                                    <h4 className="font-semibold">Analysis Failed</h4>
                                    <p className="text-sm">{aiError}</p>
                                </div>
                            ) : description ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <p>{description}</p>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
