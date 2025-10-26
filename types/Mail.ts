export interface Mail {
  id: string;
  quelle: string; // 'custom', 'outlook', 'gmail', 'smtp'
  quelle_id: string | null;
  mail_account_id: string;
  betreff: string | null; // subject
  absender: string; // from
  empfaenger: string; // to
  cc_mails: string[] | null;
  bcc_mails: string[] | null;
  datum_erhalten: string; // received date
  dateipfad: string | null; // path to body.json.gz
  hat_anhang: boolean; // has attachment
  ist_gelesen: boolean; // is read
  ist_favorit: boolean; // is favorite
  ordner: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'spam'; // folder
  user_id: string;
  erstellungsdatum: string; // created at
  aktualiserungsdatum: string; // updated at
}

export interface MailAccount {
  id: string;
  user_id: string;
  email_address: string;
  provider: 'outlook' | 'gmail' | 'smtp' | 'custom';
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailBody {
  plain: string;
  html: string;
  metadata?: Record<string, any>;
}

export interface EmailAttachment {
  name: string;
  size: number;
  path: string;
}

// Legacy type for backward compatibility
export interface LegacyMail {
  id: string;
  date: string;
  subject: string;
  recipient: string;
  status: 'sent' | 'draft' | 'archiv';
  type: 'inbox' | 'outbox';
  hasAttachment: boolean;
  source: 'Mietfluss' | 'Outlook' | 'Gmail' | 'SMTP';
  read: boolean;
  favorite: boolean;
}

// Convert database Mail to legacy format for UI compatibility
export function convertToLegacyMail(mail: Mail): LegacyMail {
  return {
    id: mail.id,
    date: mail.datum_erhalten, // Keep full ISO timestamp for proper date/time display
    subject: mail.betreff || '(Kein Betreff)',
    recipient: mail.empfaenger,
    status: mail.ordner === 'drafts' ? 'draft' : mail.ordner === 'archive' ? 'archiv' : 'sent',
    type: mail.ordner === 'sent' ? 'outbox' : 'inbox',
    hasAttachment: mail.hat_anhang,
    source: (mail.quelle.charAt(0).toUpperCase() + mail.quelle.slice(1)) as 'Mietfluss' | 'Outlook' | 'Gmail' | 'SMTP',
    read: mail.ist_gelesen,
    favorite: mail.ist_favorit
  };
}
