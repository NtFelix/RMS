import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getFinanceDocumentPath } from "@/app/finance-file-actions";
import { logger } from "@/utils/logger";
import {
    SUPPORTED_MIME_TYPES,
    MAX_FILE_SIZE,
    MAX_FILE_SIZE_LABEL,
    isSupportedMimeType
} from "@/lib/finance-file-constants";

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
        if (!isSupportedMimeType(file.type)) {
            return NextResponse.json(
                { error: `Dateityp ${file.type} wird nicht unterstützt` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `Datei ist zu groß (max. ${MAX_FILE_SIZE_LABEL})` },
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

        logger.info("Uploading finance file", {
            originalName: file.name,
            uniqueFilename,
            path: pathResult.path,
            fullPath,
            size: file.size,
            type: file.type,
            financeId,
        });

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(fullPath, file, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            logger.error("Upload error", uploadError instanceof Error ? uploadError : new Error(String(uploadError)), { fullPath });
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
            logger.error("Metadata insert error", metadataError instanceof Error ? metadataError : new Error(String(metadataError)), { fullPath });

            // Cleanup: remove the uploaded file if metadata insert failed
            await supabase.storage.from("documents").remove([fullPath]);

            return NextResponse.json(
                { error: "Metadaten konnten nicht gespeichert werden" },
                { status: 500 }
            );
        }

        // Track whether linking was successful
        let linkedToFinance = false;

        // If finance_id is provided, automatically link the document to the finance entry
        if (financeId) {
            const { error: linkError } = await supabase
                .from("Finanzen")
                .update({ dokument_id: metadataRecord.id })
                .eq("id", financeId)
                .eq("user_id", user.id); // Security: ensure user owns the finance entry

            if (linkError) {
                logger.error("Error linking document to finance entry", linkError instanceof Error ? linkError : new Error(String(linkError)), {
                    financeId,
                    dokumentId: metadataRecord.id
                });
                // Don't fail the upload, just log the error
                // The document is still uploaded and can be linked manually
            } else {
                logger.info("Document automatically linked to finance entry", { financeId });
                linkedToFinance = true;
            }
        }

        logger.info("Finance file uploaded successfully", {
            dokument_id: metadataRecord.id,
            path: fullPath,
            linkedToFinance,
        });

        return NextResponse.json({
            success: true,
            dokument_id: metadataRecord.id,
            filename: uniqueFilename,
            path: fullPath,
            linkedToFinance,
        });
    } catch (error) {
        logger.error("Unexpected error in finance file upload", error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: "Ein unerwarteter Fehler ist aufgetreten" },
            { status: 500 }
        );
    }
}
