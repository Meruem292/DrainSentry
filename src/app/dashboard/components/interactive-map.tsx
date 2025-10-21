import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function InteractiveMap() {
    const mapImage = PlaceHolderImages.find(p => p.id === 'map-dashboard');

    return (
        <>
            <CardHeader>
                <CardTitle>System Status Map</CardTitle>
                <CardDescription>Live status of all monitored assets.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden">
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
                        Interactive Map Preview
                    </div>
                </div>
                {/* Mock sensor points */}
                <div className="absolute top-[20%] left-[30%] h-4 w-4 rounded-full bg-chart-2 border-2 border-white animate-pulse" title="Status: Normal"></div>
                <div className="absolute top-[50%] left-[55%] h-4 w-4 rounded-full bg-destructive border-2 border-white animate-pulse" title="Status: Alert"></div>
                <div className="absolute top-[65%] left-[25%] h-4 w-4 rounded-full bg-chart-4 border-2 border-white animate-pulse" title="Status: Warning"></div>
                <div className="absolute top-[40%] left-[70%] h-4 w-4 rounded-full bg-chart-2 border-2 border-white animate-pulse" title="Status: Normal"></div>
                </div>
            </CardContent>
        </>
    );
}
