import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getFinanceDocumentPath } from "@/app/finance-file-actions";

// Supported file types
const SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "Nicht authentifiziert" },
                { status: 401 }
            );
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const wohnungId = formData.get("wohnung_id") as string | null;
        const financeId = formData.get("finance_id") as string | null;

        if (!file) {
            return NextResponse.json(
                { error: "Keine Datei hochgeladen" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Dateityp ${file.type} wird nicht unterstützt` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Datei ist zu groß (max. 10MB)" },
                { status: 400 }
            );
        }

        // Get the storage path based on wohnung_id
        const pathResult = await getFinanceDocumentPath(wohnungId);
        if (!pathResult.success || !pathResult.path) {
            return NextResponse.json(
                { error: pathResult.error || "Pfad konnte nicht ermittelt werden" },
                { status: 500 }
            );
        }

        // Generate unique filename to avoid collisions
        const timestamp = Date.now();
        const sanitizedFilename = file.name
            .replace(/[^a-zA-Z0-9äöüÄÖÜß.\-_]/g, "_")
            .replace(/_+/g, "_");
        const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
        const fullPath = `${pathResult.path}/${uniqueFilename}`;

        console.log("Uploading finance file:", {
            originalName: file.name,
            uniqueFilename,
            path: pathResult.path,
            fullPath,
            size: file.size,
            type: file.type,
            financeId,
        });

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from("documents")
            .upload(fullPath, file, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json(
                { error: "Datei konnte nicht hochgeladen werden" },
                { status: 500 }
            );
        }

        // Insert metadata into Dokumente_Metadaten
        const { data: metadataRecord, error: metadataError } = await supabase
            .from("Dokumente_Metadaten")
            .insert({
                dateipfad: pathResult.path,
                dateiname: uniqueFilename,
                dateigroesse: file.size,
                mime_type: file.type,
                user_id: user.id,
            })
            .select("id")
            .single();

        if (metadataError || !metadataRecord) {
            console.error("Metadata insert error:", metadataError);

            // Cleanup: remove the uploaded file if metadata insert failed
            await supabase.storage.from("documents").remove([fullPath]);

            return NextResponse.json(
                { error: "Metadaten konnten nicht gespeichert werden" },
                { status: 500 }
            );
        }

        // If finance_id is provided, automatically link the document to the finance entry
        if (financeId) {
            const { error: linkError } = await supabase
                .from("Finanzen")
                .update({ dokument_id: metadataRecord.id })
                .eq("id", financeId)
                .eq("user_id", user.id); // Security: ensure user owns the finance entry

            if (linkError) {
                console.error("Error linking document to finance entry:", linkError);
                // Don't fail the upload, just log the error
                // The document is still uploaded and can be linked manually
            } else {
                console.log("Document automatically linked to finance entry:", financeId);
            }
        }

        console.log("Finance file uploaded successfully:", {
            dokument_id: metadataRecord.id,
            path: fullPath,
            linkedToFinance: !!financeId,
        });

        return NextResponse.json({
            success: true,
            dokument_id: metadataRecord.id,
            filename: uniqueFilename,
            path: fullPath,
            linkedToFinance: !!financeId,
        });
    } catch (error) {
        console.error("Unexpected error in finance file upload:", error);
        return NextResponse.json(
            { error: "Ein unerwarteter Fehler ist aufgetreten" },
            { status: 500 }
        );
    }
}

