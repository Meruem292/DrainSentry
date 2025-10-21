import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function InteractiveMap({device}: {device: any}) {
    const mapImage = PlaceHolderImages.find(p => p.id === 'map-dashboard');

    return (
        <Card>
            <CardHeader>
                <CardTitle>Asset Location</CardTitle>
                <CardDescription>Live location of {device?.id || 'the device'}.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                {mapImage && (
                    <Image
                        src={mapImage.imageUrl}
                        alt={mapImage.description}
                        data-ai-hint={mapImage.imageHint}
                        fill
                        className="object-cover"
                    />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <div className="text-white text-lg font-bold p-4 rounded-lg bg-black/40 backdrop-blur-sm">
                        Map Preview for {device?.location || '...'}
                    </div>
                </div>
                {/* Mock sensor points */}
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-primary border-2 border-white animate-pulse" title={`Status: ${device?.status || 'Unknown'}`}></div>
                </div>
            </CardContent>
        </Card>
    );
}
