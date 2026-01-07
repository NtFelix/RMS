"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Get the storage folder path based on wohnung_id
 * Returns: user_{userId}/Rechnungen/{houseName}/{apartmentName}
 * Or: user_{userId}/Rechnungen/Allgemein if no wohnung
 */
export async function getFinanceDocumentPath(
    wohnungId?: string | null
): Promise<{ success: boolean; path?: string; error?: string }> {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "Nicht authentifiziert" };
    }

    const basePath = `user_${user.id}/Rechnungen`;

    if (!wohnungId) {
        return { success: true, path: `${basePath}/Allgemein` };
    }

    // Fetch apartment with house info
    const { data: wohnung, error: wohnungError } = await supabase
        .from("Wohnungen")
        .select(`
      id,
      name,
      haus_id,
      Haeuser(id, name)
    `)
        .eq("id", wohnungId)
        .single();

    if (wohnungError || !wohnung) {
        console.error("Error fetching Wohnung:", wohnungError);
        return { success: false, error: "Wohnung konnte nicht gefunden werden, um den Dateipfad zu erstellen." };
    }

    // Build path: Rechnungen/HouseName/ApartmentName
    // Haeuser is a to-one relationship, returned as object
    const house = wohnung.Haeuser as unknown as { name: string } | null;
    const houseName = house?.name || "Unbekannt";
    const apartmentName = wohnung.name || "Unbekannt";

    // Sanitize folder names for Supabase Storage (no special chars, no spaces)
    const sanitizeForStorage = (name: string): string => {
        return name
            .replace(/ä/g, "ae")
            .replace(/ö/g, "oe")
            .replace(/ü/g, "ue")
            .replace(/Ä/g, "Ae")
            .replace(/Ö/g, "Oe")
            .replace(/Ü/g, "Ue")
            .replace(/ß/g, "ss")
            .replace(/\s+/g, "_")           // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9\-_]/g, "") // Remove any remaining special chars
            .trim();
    };

    const sanitizedHouse = sanitizeForStorage(houseName);
    const sanitizedApartment = sanitizeForStorage(apartmentName);

    return {
        success: true,
        path: `${basePath}/${sanitizedHouse}/${sanitizedApartment}`
    };
}

/**
 * Get a signed URL for viewing/downloading a document
 */
export async function getFinanceDocumentUrl(
    dokumentId: string
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
    if (!dokumentId) {
        return { success: false, error: "Keine Dokument-ID angegeben" };
    }

    const supabase = await createClient();

    // Get document metadata
    const { data: dokument, error: docError } = await supabase
        .from("Dokumente_Metadaten")
        .select("dateipfad, dateiname")
        .eq("id", dokumentId)
        .single();

    if (docError || !dokument) {
        console.error("Error fetching document metadata:", docError);
        return { success: false, error: "Dokument nicht gefunden" };
    }

    const fullPath = `${dokument.dateipfad}/${dokument.dateiname}`;

    // Get signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(fullPath, 3600);

    if (urlError || !signedUrl) {
        console.error("Error creating signed URL:", urlError);
        return { success: false, error: "URL konnte nicht erstellt werden" };
    }

    return {
        success: true,
        url: signedUrl.signedUrl,
        filename: dokument.dateiname
    };
}

/**
 * Delete a finance document
 * Note: The FK constraint will automatically SET NULL on Finanzen.dokument_id
 */
export async function deleteFinanceDocument(
    dokumentId: string
): Promise<{ success: boolean; error?: string }> {
    if (!dokumentId) {
        return { success: false, error: "Keine Dokument-ID angegeben" };
    }

    const supabase = await createClient();

    // Get document metadata first
    const { data: dokument, error: docError } = await supabase
        .from("Dokumente_Metadaten")
        .select("dateipfad, dateiname, user_id")
        .eq("id", dokumentId)
        .single();

    if (docError || !dokument) {
        console.error("Error fetching document metadata:", docError);
        return { success: false, error: "Dokument nicht gefunden" };
    }

    // Verify user owns this document
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || dokument.user_id !== user.id) {
        return { success: false, error: "Keine Berechtigung" };
    }

    const fullPath = `${dokument.dateipfad}/${dokument.dateiname}`;

    // Delete from storage (triggers will handle metadata cleanup)
    const { error: deleteError } = await supabase.storage
        .from("documents")
        .remove([fullPath]);

    if (deleteError) {
        console.error("Error deleting file:", deleteError);
        return { success: false, error: "Datei konnte nicht gelöscht werden" };
    }

    revalidatePath("/finanzen");
    return { success: true };
}

/**
 * Get document info for a finance entry
 */
export async function getFinanceDocumentInfo(
    dokumentId: string
): Promise<{
    success: boolean;
    document?: {
        id: string;
        dateiname: string;
        dateipfad: string;
        dateigroesse: number | null;
        mime_type: string | null;
    };
    error?: string
}> {
    if (!dokumentId) {
        return { success: false, error: "Keine Dokument-ID angegeben" };
    }

    const supabase = await createClient();

    const { data: dokument, error } = await supabase
        .from("Dokumente_Metadaten")
        .select("id, dateiname, dateipfad, dateigroesse, mime_type")
        .eq("id", dokumentId)
        .single();

    if (error || !dokument) {
        console.error("Error fetching document info:", error);
        return { success: false, error: "Dokument nicht gefunden" };
    }

    return { success: true, document: dokument };
}
