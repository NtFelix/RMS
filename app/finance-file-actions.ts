"use server";

import { ensureAuth } from "@/lib/auth-utils";
import { privatePath, sharedPath } from "@/lib/storage-paths";
import { revalidatePath } from "next/cache";

/**
 * Get the storage folder path based on wohnung_id (ID-based, org layout)
 * Returns: org_{orgId}/shared/{houseId}/Rechnungen/{apartmentId}
 * Or: org_{orgId}/private/{userId}/Rechnungen/Allgemein if no wohnung
 */
export async function getFinanceDocumentPath(
    wohnungId?: string | null
): Promise<{ success: boolean; path?: string; error?: string }> {
    let user, supabase;
    try {
        ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
        const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
        return { success: false, error: errorMessage };
    }

    if (wohnungId) {
        try {
            const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
            const accessibleWohnungIds = await getAccessibleWohnungIds();
            if (accessibleWohnungIds !== null && !accessibleWohnungIds.includes(wohnungId)) {
                return { success: false, error: "Zugriff verweigert" };
            }
        } catch (err) {
            return { success: false, error: "Berechtigungsfehler" };
        }
    }

    const { data: orgId, error: orgError } = await supabase.rpc("current_organisation_id");
    if (orgError || !orgId) {
        return { success: false, error: "Keine aktive Organisation gefunden" };
    }

    if (!wohnungId) {
        return { success: true, path: privatePath(orgId, user.id, "Rechnungen", "Allgemein") };
    }

    // Fetch apartment to determine its house (ID-based path, no names)
    const { data: wohnung, error: wohnungError } = await supabase
        .from("Wohnungen")
        .select("id, haus_id")
        .eq("id", wohnungId)
        .single();

    if (wohnungError || !wohnung) {
        console.error("Error fetching Wohnung:", wohnungError);
        return { success: false, error: "Wohnung konnte nicht gefunden werden, um den Dateipfad zu erstellen." };
    }

    try {
        if (!wohnung.haus_id) {
            // Apartment without house relation: fall back to the personal area
            return { success: true, path: privatePath(orgId, user.id, "Rechnungen", "Allgemein") };
        }

        return {
            success: true,
            path: sharedPath(orgId, wohnung.haus_id, "Rechnungen", wohnung.id)
        };
    } catch (pathError: unknown) {
        console.error("Invalid storage path segment:", pathError);
        return { success: false, error: "Dateipfad konnte nicht erstellt werden." };
    }
}

/**
 * Get a signed URL for viewing/downloading a document
 */
export async function getFinanceDocumentUrl(
    dokumentId: string,
    download: boolean = false
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
    if (!dokumentId) {
        return { success: false, error: "Keine Dokument-ID angegeben" };
    }

    const { hasPermission } = await import("@/lib/permissions");
    if (!(await hasPermission('finanzen', 'ansehen'))) {
        return { success: false, error: "Keine Berechtigung" };
    }

    let supabase;
    try {
        ({ supabase } = await ensureAuth());
    } catch (authError: unknown) {
        const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
        return { success: false, error: errorMessage };
    }

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
    const options: { download?: string | boolean } = {};
    if (download) {
        options.download = dokument.dateiname;
    }
    const { data: signedUrl, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(fullPath, 3600, options);

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

    const { hasPermission } = await import("@/lib/permissions");
    if (!(await hasPermission('finanzen', 'loeschen'))) {
        return { success: false, error: "Keine Berechtigung" };
    }

    let supabase;
    try {
        ({ supabase } = await ensureAuth());
    } catch (authError: unknown) {
        const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
        return { success: false, error: errorMessage };
    }

    // Get document metadata first
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

    const { hasPermission } = await import("@/lib/permissions");
    if (!(await hasPermission('finanzen', 'ansehen'))) {
        return { success: false, error: "Keine Berechtigung" };
    }

    let supabase;
    try {
        ({ supabase } = await ensureAuth());
    } catch (authError: unknown) {
        const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
        return { success: false, error: errorMessage };
    }

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
