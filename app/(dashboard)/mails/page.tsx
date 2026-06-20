
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { requireAuthenticatedUser } from "@/lib/server/route-access";
import { requirePermission } from "@/lib/permissions";
import MailsClientView from "./client-wrapper";
import type { LegacyMail } from "@/types/Mail";
import { convertToLegacyMail } from "@/types/Mail";
import type { Mail } from "@/types/Mail";

export default async function MailsPage() {
  const [{ supabase, user }] = await Promise.all([
    requireAuthenticatedUser(),
    requirePermission('organisation', 'ansehen'),
  ]);

  // Fetch initial page of emails from database
  const { data: emails, error: emailsError } = await supabase
    .from('Mail_Metadaten')
    .select('*', { count: 'exact' })
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
