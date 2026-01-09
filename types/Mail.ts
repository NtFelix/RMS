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
  sender: string;
  status: 'sent' | 'draft' | 'archiv';
  type: 'inbox' | 'outbox';
  hasAttachment: boolean;
  source: 'Mietevo' | 'Outlook' | 'Gmail' | 'SMTP';
  read: boolean;
  favorite: boolean;
}

// Convert database Mail to legacy format for UI compatibility
export function convertToLegacyMail(mail: Mail): LegacyMail {
  // Determine status based on folder
  let status: 'sent' | 'draft' | 'archiv' = 'sent';
  if (mail.ordner === 'drafts') {
    status = 'draft';
  } else if (mail.ordner === 'archive') {
    status = 'archiv';
  } else if (mail.ordner === 'sent') {
    status = 'sent';
  } else if (mail.ordner === 'inbox' || mail.ordner === 'trash' || mail.ordner === 'spam') {
    // For inbox, trash, and spam, we don't have a specific status, so default to 'sent'
    // This is a limitation of the LegacyMail type which only has 3 status options
    status = 'sent';
  }

  // Determine type based on folder
  let type: 'inbox' | 'outbox' = 'inbox';
  if (mail.ordner === 'sent') {
    type = 'outbox';
  } else {
    // For inbox, drafts, trash, archive, spam - all show as inbox type
    type = 'inbox';
  }

  return {
    id: mail.id,
    date: mail.datum_erhalten, // Keep full ISO timestamp for proper date/time display
    subject: mail.betreff || '(Kein Betreff)',
    sender: mail.absender,
    status: status,
    type: type,
    hasAttachment: mail.hat_anhang,
    source: (mail.quelle.charAt(0).toUpperCase() + mail.quelle.slice(1)) as 'Mietevo' | 'Outlook' | 'Gmail' | 'SMTP',
    read: mail.ist_gelesen,
    favorite: mail.ist_favorit
  };
}
