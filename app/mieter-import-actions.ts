"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { posthogLogger } from "@/lib/posthog-logger";

export async function searchMailSenders(query: string) {
    const supabase = await createClient();

    if (!query || query.length < 2) return [];

    // Assuming 'absender' is the column name in Mail_Metadaten
    // We use .ilike for case-insensitive search and .limit so we don't fetch too many
    // Ideally we want distinct senders, but Supabase/PostgREST distinct is a bit tricky with unrelated columns.
    // We'll fetch a bunch and dedup in JS for now if the table isn't huge, or ideally use a .rpc if performance is an issue.
    // For now, let's just fetch recent matches.

    const { data, error } = await supabase
        .from('Mail_Metadaten')
        .select('absender')
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
    const supabase = await createClient();

    let query = supabase
        .from('Mail_Metadaten')
        .select('id, betreff, absender, datum_erhalten, dateipfad')
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

export async function createApplicantsFromMails(mails: { id: string, absender: string, dateipfad?: string | null }[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'system';

    if (!mails || mails.length === 0) {
        return { success: false, error: "No mails provided" };
    }

    // Process in chunks to avoid any potential batch size limits on insert
    const CHUNK_SIZE = 100;
    let successCount = 0;
    let errors: string[] = [];

    for (let i = 0; i < mails.length; i += CHUNK_SIZE) {
        const chunk = mails.slice(i, i + CHUNK_SIZE);

        const newApplicants = chunk.map(mail => {
            // Simple heuristic: if sender format is "Name <email>", extract Name.
            // Otherwise use the whole string.
            let name = mail.absender;
            const match = mail.absender.match(/^([^<]+)/);
            if (match && match[1].trim()) {
                name = match[1].trim().replace(/"/g, '');
            }

            return {
                name: name,
                email: mail.absender.includes('<') ? mail.absender.match(/<([^>]+)>/)?.[1] || mail.absender : mail.absender,
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
            errors.push(insertError.message);
        } else {
            successCount += newApplicants.length;
        }
    }

    revalidatePath('/mieter');

    if (errors.length > 0) {
        return {
            success: successCount > 0, // Partial success
            count: successCount,
            error: `Import partially failed: ${errors.join(', ')}`
        };
    }

    // Queue Processing & Kickoff - ALWAYS queue mails with dateipfad
    const mailsWithContent = mails.filter(mail => mail.dateipfad);

    if (mailsWithContent.length > 0) {
        try {
            // Queue mails in smaller batches to avoid fetch timeouts
            const PGMQ_BATCH_SIZE = 10;
            const queueResults = [];

            for (let i = 0; i < mailsWithContent.length; i += PGMQ_BATCH_SIZE) {
                const batch = mailsWithContent.slice(i, i + PGMQ_BATCH_SIZE);
                const batchPromises = batch.map(mail => {
                    return supabase.rpc('pgmq_send', {
                        queue_name: 'applicant_ai_processing',
                        message: {
                            mail_id: mail.id,
                            user_id: userId,
                            created_at: new Date().toISOString()
                        }
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

            try {
                fetch(`${workerUrl}/process-queue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId })
                }).catch(e => console.error("Initial worker kickoff failed:", e));
            } catch (e) {
                console.error("Worker fetch failed:", e);
            }

            await posthogLogger.flush();
        } catch (queueError: any) {
            console.error("Error queueing AI processing:", queueError);
            posthogLogger.error('Queueing AI processing failed', { error: queueError.message });
            await posthogLogger.flush();
            errors.push("AI Processing verification failed to start.");
        }
    } else if (mails.length > 0) {
        posthogLogger.warn('No mails with stored content to process', { totalMails: mails.length });
        await posthogLogger.flush();
    }

    return {
        success: successCount > 0 || mailsWithContent.length > 0,
        count: successCount,
        queued: mailsWithContent.length,
        hasMore: mailsWithContent.length > 0,
        userId: userId,
        message: errors.length > 0
            ? `Imported ${successCount} applicants with some warnings. Queued ${mailsWithContent.length} for AI processing.`
            : `Import successful. ${mailsWithContent.length} mails queued for AI processing.`
    };
}
