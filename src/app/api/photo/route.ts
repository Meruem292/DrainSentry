
import { NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import { detectTrashInImage } from "@/ai/flows/describe-image";
import { initializeFirebase } from "@/firebase";
import { ref, update } from "firebase/database";

// Hardcoded user ID and device ID for the public endpoint
const SYSTEM_USER_ID = "OpbukfATHoX0LTgeJuNhuqi1gAF3";
const DEVICE_ID = "DS-001";

export const dynamic = 'force-dynamic'; // Ensure the route is not cached

export async function GET() {
    const { database } = initializeFirebase();

    try {
        // 1. Fetch latest image from Supabase
        const { data: files, error: listError } = await supabase
            .storage
            .from('drainsentryPhoto')
            .list('photos', {
                limit: 1,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (listError) throw listError;

        if (!files || files.length === 0) {
            return NextResponse.json({ success: false, error: "No photos found in storage." }, { status: 404 });
        }

        const latestFile = files[0];
        const { data } = supabase
            .storage
            .from('drainsentryPhoto')
            .getPublicUrl(`photos/${latestFile.name}`);
        
        const imageUrl = `${data.publicUrl}?t=${new Date().getTime()}`;

        // 2. Detect trash in the image
        const detectionResult = await detectTrashInImage({ imageUrl });

        // 3. Update Firebase based on detection
        const deviceRef = ref(database, `users/${SYSTEM_USER_ID}/devices/${DEVICE_ID}`);
        await update(deviceRef, { manualConveyor: detectionResult.trashDetected });
        
        // 4. Return success response
        return NextResponse.json({ 
            success: true, 
            imageUrl: imageUrl,
            trashDetected: detectionResult.trashDetected,
            conveyorActivated: detectionResult.trashDetected
        });

    } catch (err: any) {
        console.error("Error in /api/photo endpoint:", err);
        return NextResponse.json({ success: false, error: err.message || "An unknown error occurred." }, { status: 500 });
    }
}
