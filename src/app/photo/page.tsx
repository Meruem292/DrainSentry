"use client";

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PhotoPage() {
    const imageUrl = "https://gjfwrphhhgodjhtgwmum.supabase.co/storage/v1/object/public/drainsentryPhoto/photos/photo_122637.jpg";

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-3xl w-full">
                <CardHeader>
                    <CardTitle>Image View</CardTitle>
                    <CardDescription>Displaying image from a remote URL.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                        <Image
                            src={imageUrl}
                            alt="Remote image from Supabase"
                            fill
                            className="object-contain"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
