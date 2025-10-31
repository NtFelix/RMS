
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MailsClientView from "./client-wrapper";
import type { LegacyMail } from "@/types/Mail";
import { convertToLegacyMail } from "@/types/Mail";
import type { Mail } from "@/types/Mail";

export default async function MailsPage() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/auth/login');
  }

  // Fetch initial page of emails from database
  const { data: emails, error: emailsError, count } = await supabase
    .from('Mail_Metadaten')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('datum_erhalten', { ascending: false })
    .range(0, 49); // First 50 emails

  // Convert to legacy format for UI compatibility
  const mails: LegacyMail[] = emails && !emailsError 
    ? emails.map((email: Mail) => convertToLegacyMail(email))
    : [];

  return (
    <MailsClientView
      initialMails={mails}
      userId={user.id}
    />
  );
}
