"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { posthogLogger } from "@/lib/posthog-logger";

export async function searchMailSenders(query: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) return [];

    if (!query || query.length < 2) return [];

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

    const uniqueSenders = Array.from(new Set(data.map(d => d.absender))).filter(Boolean);
    return uniqueSenders;
}

export async function getMailsBySender(sender: string, startDate?: Date, endDate?: Date) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) return [];

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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { success: false, error: "Unauthorized: Please log in." };
    }
    const userId = user.id;

    if (!mails || mails.length === 0) {
        return { success: false, error: "No mails provided" };
    }

    const CHUNK_SIZE = 100;
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < mails.length; i += CHUNK_SIZE) {
        const chunk = mails.slice(i, i + CHUNK_SIZE);

        const newApplicants = chunk.map(mail => {
            let name = mail.absender;
            const emailMatch = mail.absender.match(/<([^>]+)>/);
            if (emailMatch) {
                name = mail.absender.substring(0, emailMatch.index).trim();
                if (name.startsWith('"') && name.endsWith('"')) {
                    name = name.substring(1, name.length - 1);
                }
            }

            return {
                name: name,
                email: mail.absender.match(/<([^>]+)>/)?.[1] ?? mail.absender,
                status: 'bewerber',
                bewerbung_mail_id: mail.id,
                user_id: userId,
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
            success: successCount > 0,
            count: successCount,
            error: `Import partially failed: ${errors.join(', ')}`
        };
    }

    const mailsWithContent = mails.filter(mail => mail.dateipfad);

    if (mailsWithContent.length > 0) {
        try {
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
            } catch (e: any) {
                console.error("Worker fetch failed:", e);
                throw new Error("AI Processing kickoff failed: " + e.message);
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

export async function checkWorkerQueueStatus(userId: string) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
        return { hasMore: false, error: "Unauthorized" };
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
                'x-worker-auth': workerAuthKey!
            },
            body: JSON.stringify({ user_id: userId })
        });

        if (!res.ok) {
            console.error(`Worker returned ${res.status} ${res.statusText}`);
            return { hasMore: false, error: "Worker Error" };
        }

        const data = await res.json() as { hasMore: boolean };
        return { hasMore: data.hasMore, success: true };
    } catch (err: any) {
        console.error("Polling error:", err);
        return { hasMore: false, error: err.message };
    }
}
