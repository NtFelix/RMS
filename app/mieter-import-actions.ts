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

export async function createApplicantsFromMails(mailIds: string[]) {
    const supabase = await createClient();

    // 1. Fetch the mails to get details for the applicant record (like name from sender?) 
    // For now, let's just create a basic record.
    const { data: mails, error: fetchError } = await supabase
        .from('Mail_Metadaten')
        .select('id, absender')
        .in('id', mailIds);

    if (fetchError || !mails) {
        return { success: false, error: fetchError?.message || "Failed to fetch mails" };
    }

    // 2. Prepare applicant data
    // Logic: Extract a name from the email sender if possible, otherwise use the email string
    const newApplicants = mails.map(mail => {
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

    // 3. Insert into Mieter table
    const { error: insertError } = await supabase
        .from('Mieter')
        .insert(newApplicants);

    if (insertError) {
        return { success: false, error: insertError.message };
    }

    revalidatePath('/mieter');
    return { success: true, count: newApplicants.length };
}
