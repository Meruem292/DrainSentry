
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PhotoPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLatestImage = async () => {
        setLoading(true);
        setError(null);
        setImageUrl(null);
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
                
                // Add a timestamp to the URL to bust the cache
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
                                    key={imageUrl} // Force re-render on URL change
                                />
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={fetchLatestImage} disabled={loading}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {loading ? 'Refreshing...' : 'Refresh Photo'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
