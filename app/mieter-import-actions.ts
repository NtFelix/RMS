"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

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
        .select('id, betreff, absender, datum_erhalten')
        .eq('absender', sender)
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

export async function createApplicantsFromMails(mails: { id: string, absender: string }[]) {
    const supabase = await createClient();

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

    return { success: true, count: successCount };
}
