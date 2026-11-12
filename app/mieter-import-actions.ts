"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { posthogLogger } from "@/lib/posthog-logger";

export async function searchMailSenders(query: string) {
    let user, supabase;
    try {
        ({ user, supabase } = await ensureAuth());
    } catch {
        return [];
    }

    const { hasPermission } = await import("@/lib/permissions");
    if (!(await hasPermission('mieter', 'ansehen'))) {
        return [];
    }

    if (!query || query.length < 2) return [];

    // Assuming 'absender' is the column name in Mail_Metadaten
    const { data, error } = await supabase
        .from('Mail_Metadaten')
        .select('absender')
        .eq('user_id', user.id)
        .ilike('absender', `%${query}%`)
        .limit(50);

    if (error) {
        console.error("Error searching mail senders:", error);
        return [];
    }

    // Deduplicate results
    const uniqueSenders = Array.from(new Set(data.map(d => d.absender))).filter(Boolean);
    return uniqueSenders;
}

export async function getMailsBySender(sender: string, startDate?: Date, endDate?: Date) {
    let user, supabase;
    try {
        ({ user, supabase } = await ensureAuth());
    } catch {
        return [];
    }

    const { hasPermission } = await import("@/lib/permissions");
    if (!(await hasPermission('mieter', 'ansehen'))) {
        return [];
    }

    let query = supabase
        .from('Mail_Metadaten')
        .select('id, betreff, absender, datum_erhalten, dateipfad')
        .eq('user_id', user.id)
        .eq('absender', sender)
        .not('dateipfad', 'is', null)
        .order('datum_erhalten', { ascending: false });

    if (startDate) {
        query = query.gte('datum_erhalten', startDate.toISOString());
    }
    if (endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('datum_erhalten', endOfDay.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching mails by sender:", error);
        return [];
    }

    return data;
}

export type CreateApplicantsResult =
    | { success: false; error: string; count?: number }
    | {
        success: true;
        count: number;
        queued: number;
        hasMore: boolean;
        userId: string;
        message: string;
        failedCount?: number;
        error?: string;
        warning?: string;
    };

export async function createApplicantsFromMails(mails: { id: string, absender: string, dateipfad?: string | null }[]): Promise<CreateApplicantsResult> {
    let user, supabase;
    try {
        ({ user, supabase } = await ensureAuth());
    } catch {
        return { success: false, error: "Nicht authentifiziert" };
    }

    const { hasPermission } = await import("@/lib/permissions");
    if (!(await hasPermission('mieter', 'erstellen'))) {
        return { success: false, error: "Keine Berechtigung" };
    }
    const userId = user.id;

    if (!mails || mails.length === 0) {
        return { success: false, error: "No mails provided" };
    }

    // Process in chunks to avoid any potential batch size limits on insert.
    // Each chunk insert is atomic: either all mails of a chunk are stored or none.
    const CHUNK_SIZE = 100;
    let successCount = 0;
    let failedCount = 0;
    const insertErrors: string[] = [];
    const insertedMails: { id: string, absender: string, dateipfad?: string | null }[] = [];

    for (let i = 0; i < mails.length; i += CHUNK_SIZE) {
        const chunk = mails.slice(i, i + CHUNK_SIZE);

        const newApplicants = chunk.map(mail => {
            let name = mail.absender;
            const emailMatch = mail.absender.match(/<([^>]+)>/);
            if (emailMatch) {
                // If there's an email in angle brackets, take the part before it as the name.
                name = mail.absender.substring(0, emailMatch.index).trim();
                // Remove quotes if the name is wrapped in them.
                if (name.startsWith('"') && name.endsWith('"')) {
                    name = name.substring(1, name.length - 1);
                }
            }

            return {
                name: name,
                email: emailMatch?.[1] ?? mail.absender,
                status: 'bewerber',
                bewerbung_mail_id: mail.id,
                // bewerbung_metadaten left empty for now, to be filled by AI later
            };
        });

        const { error: insertError } = await supabase
            .from('Mieter')
            .insert(newApplicants);

        if (insertError) {
            console.error("Error inserting applicants chunk:", insertError);
            insertErrors.push(insertError.message);
            failedCount += chunk.length;
        } else {
            successCount += newApplicants.length;
            insertedMails.push(...chunk);
        }
    }

    revalidatePath('/mieter');

    // Nothing was stored: there is nothing to queue (same result as before for a complete failure)
    if (successCount === 0) {
        return {
            success: false,
            count: 0,
            error: `Import partially failed: ${insertErrors.join(', ')}`
        };
    }

    // Queue Processing & Kickoff - queue every successfully inserted mail with dateipfad,
    // also when other chunks failed (best effort)
    const mailsWithContent = insertedMails.filter(mail => mail.dateipfad);
    let warning: string | undefined;

    if (mailsWithContent.length > 0) {
        try {
            // Queue mails in smaller batches to avoid fetch timeouts
            const PGMQ_BATCH_SIZE = 10;
            const queueResults = [];

            for (let i = 0; i < mailsWithContent.length; i += PGMQ_BATCH_SIZE) {
                const batch = mailsWithContent.slice(i, i + PGMQ_BATCH_SIZE);
                const batchPromises = batch.map(mail => {
                    return supabase.rpc('send_applicant_processing_message', {
                        p_mail_id: mail.id
                    });
                });

                const batchResults = await Promise.all(batchPromises);
                queueResults.push(...batchResults);
            }

            // Debugging: Check for RPC errors
            const failedSends = queueResults.filter(r => r.error);
            if (failedSends.length > 0) {
                const msg = "PGMQ Send Errors: " + JSON.stringify(failedSends.map(r => r.error));
                console.error(msg);
                posthogLogger.error('PGMQ Send Errors', {
                    count: failedSends.length,
                    errors: failedSends.map(r => JSON.stringify(r.error))
                });
            } else {
                const msg = `Successfully queued ${queueResults.length} items`;
                console.log(msg);
                posthogLogger.info('Applicants Queued', { count: queueResults.length });
            }

            // Kickoff first Worker call
            const workerUrl = process.env.WORKER_URL || 'https://backend.mietevo.de';
            let workerAuthKey = process.env.WORKER_AUTH_KEY;

            if (!workerAuthKey) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn("WORKER_AUTH_KEY not set. Using empty key for development.");
                    workerAuthKey = "";
                } else {
                    throw new Error("Worker authentication key is not configured.");
                }
            }

            try {
                const response = await fetch(`${workerUrl}/process-queue`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-worker-auth': workerAuthKey
                    },
                    body: JSON.stringify({ user_id: userId })
                });

                if (!response.ok) {
                    throw new Error(`Worker returned ${response.status} ${response.statusText}`);
                }
            } catch (e: unknown) {
                console.error("Worker fetch failed:", e);
                const message = e instanceof Error ? e.message : String(e);
                throw new Error("AI Processing kickoff failed: " + message);
            }

            await posthogLogger.flush();
        } catch (queueError: unknown) {
            console.error("Error queueing AI processing:", queueError);
            const message = queueError instanceof Error ? queueError.message : "AI Processing verification failed to start.";
            posthogLogger.error('Queueing AI processing failed', { error: message });
            await posthogLogger.flush();
            warning = message;
        }
    } else {
        posthogLogger.warn('No mails with stored content to process', { totalMails: mails.length });
        await posthogLogger.flush();
    }

    const hasWarnings = insertErrors.length > 0 || warning !== undefined;

    // Here at least one chunk was stored (see the early return above), so this is a success, possibly partial
    return {
        success: true,
        count: successCount,
        queued: mailsWithContent.length,
        hasMore: mailsWithContent.length > 0,
        userId: userId,
        message: hasWarnings
            ? `Imported ${successCount} applicants with some warnings. Queued ${mailsWithContent.length} for AI processing.`
            : `Import successful. ${mailsWithContent.length} mails queued for AI processing.`,
        ...(insertErrors.length > 0
            ? { failedCount, error: `Import partially failed: ${insertErrors.join(', ')}` }
            : {}),
        ...(warning ? { warning } : {})
    };
}

export async function checkWorkerQueueStatus(userId: string) {
    let user;
    try {
        ({ user } = await ensureAuth());
    } catch {
        return { hasMore: false, error: "Nicht authentifiziert" };
    }

    const { hasPermission } = await import("@/lib/permissions");
    if (!(await hasPermission('mieter', 'ansehen'))) {
        return { hasMore: false, error: "Keine Berechtigung" };
    }

    if (user.id !== userId) {
        return { hasMore: false, error: "Nicht authentifiziert" };
    }

    const workerUrl = process.env.WORKER_URL || 'https://backend.mietevo.de';
    let workerAuthKey = process.env.WORKER_AUTH_KEY;

    if (!workerAuthKey) {
        if (process.env.NODE_ENV === 'development') {
            workerAuthKey = "";
        } else {
            console.error("Worker authentication key is not configured.");
            return { hasMore: false, error: "Configuration Error" };
        }
    }

    try {
        const res = await fetch(`${workerUrl}/process-queue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-worker-auth': workerAuthKey
            },
            body: JSON.stringify({ user_id: userId })
        });

        if (!res.ok) {
            console.error(`Worker returned ${res.status} ${res.statusText}`);
            return { hasMore: false, error: "Worker Error" };
        }

        const data = await res.json() as { hasMore: boolean };
        return { hasMore: data.hasMore, success: true };
    } catch (err: unknown) {
        console.error("Polling error:", err);
        const message = err instanceof Error ? err.message : "Polling error";
        return { hasMore: false, error: message };
    }
}
