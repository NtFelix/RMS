import { createClient } from '@/utils/supabase/client';
import pako from 'pako';

export interface EmailBody {
  plain: string;
  html: string;
  metadata?: Record<string, any>;
}

export interface EmailMetadata {
  id: string;
  quelle: string;
  quelle_id: string | null;
  mail_account_id: string;
  betreff: string | null;
  absender: string;
  empfaenger: string;
  cc_mails: string[] | null;
  bcc_mails: string[] | null;
  datum_erhalten: string;
  dateipfad: string | null;
  hat_anhang: boolean;
  ist_gelesen: boolean;
  ist_favorit: boolean;
  ordner: string;
  user_id: string;
  erstellungsdatum: string;
  aktualiserungsdatum: string;
}

export interface EmailAttachment {
  name: string;
  size: number;
  path: string;
}

/**
 * Fetch email metadata from database
 */
export async function fetchEmailMetadata(
  userId: string,
  ordner: string = 'inbox',
  limit: number = 50,
  offset: number = 0
) {
  const supabase = createClient();
  
  const { data, error, count } = await supabase
    .from('Mail_Metadaten')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('ordner', ordner)
    .order('datum_erhalten', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching email metadata:', error);
    throw error;
  }

  return { emails: data as EmailMetadata[], total: count || 0 };
}

/**
 * Fetch single email metadata by ID
 */
export async function fetchEmailById(emailId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('Mail_Metadaten')
    .select('*')
    .eq('id', emailId)
    .single();

  if (error) {
    console.error('Error fetching email:', error);
    throw error;
  }

  return data as EmailMetadata;
}

/**
 * Download and decompress email body from Storage
 */
export async function fetchEmailBody(dateipfad: string): Promise<EmailBody> {
  const supabase = createClient();
  
  try {
    // Download gzipped body
    const { data: bodyBlob, error: downloadError } = await supabase.storage
      .from('mails')
      .download(dateipfad);

    if (downloadError || !bodyBlob) {
      throw new Error('Failed to download email body');
    }

    // Convert to array buffer
    const arrayBuffer = await bodyBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Decompress with pako
    const decompressed = pako.ungzip(uint8Array, { to: 'string' });

    // Parse JSON
    const emailBody = JSON.parse(decompressed) as EmailBody;
    
    return emailBody;
  } catch (error) {
    console.error('Error fetching email body:', error);
    throw error;
  }
}

/**
 * List attachments for an email
 */
export async function listEmailAttachments(
  userId: string,
  emailId: string
): Promise<EmailAttachment[]> {
  const supabase = createClient();
  
  const { data: files, error } = await supabase.storage
    .from('mails')
    .list(`${userId}/${emailId}/attachments`);

  if (error) {
    console.error('Error listing attachments:', error);
    return [];
  }

  return files.map(file => ({
    name: file.name,
    size: file.metadata?.size || 0,
    path: `${userId}/${emailId}/attachments/${file.name}`
  }));
}

/**
 * Download an attachment
 */
export async function downloadAttachment(path: string, filename: string) {
  const supabase = createClient();
  
  const { data: fileBlob, error } = await supabase.storage
    .from('mails')
    .download(path);

  if (error || !fileBlob) {
    throw new Error('Failed to download attachment');
  }

  // Create download link
  const url = URL.createObjectURL(fileBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Mark email as read/unread
 */
export async function updateEmailReadStatus(emailId: string, isRead: boolean) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('Mail_Metadaten')
    .update({ ist_gelesen: isRead })
    .eq('id', emailId);

  if (error) {
    console.error('Error updating read status:', error);
    throw error;
  }
}

/**
 * Toggle email favorite status
 */
export async function toggleEmailFavorite(emailId: string, isFavorite: boolean) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('Mail_Metadaten')
    .update({ ist_favorit: isFavorite })
    .eq('id', emailId);

  if (error) {
    console.error('Error toggling favorite:', error);
    throw error;
  }
}

/**
 * Move email to folder
 */
export async function moveEmailToFolder(emailId: string, folder: string) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('Mail_Metadaten')
    .update({ ordner: folder })
    .eq('id', emailId);

  if (error) {
    console.error('Error moving email:', error);
    throw error;
  }
}

/**
 * Delete email permanently
 */
export async function deleteEmailPermanently(emailId: string, userId: string) {
  const supabase = createClient();
  
  // Delete from database
  const { error: dbError } = await supabase
    .from('Mail_Metadaten')
    .delete()
    .eq('id', emailId);

  if (dbError) {
    console.error('Error deleting email from database:', error);
    throw dbError;
  }

  // Delete from Storage
  const { error: storageError } = await supabase.storage
    .from('mails')
    .remove([`${userId}/${emailId}`]);

  if (storageError) {
    console.error('Error deleting email from storage:', storageError);
    // Don't throw - database deletion succeeded
  }
}

/**
 * Search emails by subject or sender
 */
export async function searchEmails(
  userId: string,
  searchTerm: string,
  ordner?: string
) {
  const supabase = createClient();
  
  let query = supabase
    .from('Mail_Metadaten')
    .select('*')
    .eq('user_id', userId)
    .or(`betreff.ilike.%${searchTerm}%,absender.ilike.%${searchTerm}%`)
    .order('datum_erhalten', { ascending: false });

  if (ordner) {
    query = query.eq('ordner', ordner);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error searching emails:', error);
    throw error;
  }

  return data as EmailMetadata[];
}

/**
 * Get email counts per folder
 */
export async function getEmailCounts(userId: string) {
  const supabase = createClient();
  
  const folders = ['inbox', 'sent', 'drafts', 'archive', 'trash', 'spam'];
  const counts: Record<string, number> = {};

  for (const folder of folders) {
    const { count, error } = await supabase
      .from('Mail_Metadaten')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('ordner', folder);

    if (!error) {
      counts[folder] = count || 0;
    }
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('Mail_Metadaten')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('ist_gelesen', false);

  counts.unread = unreadCount || 0;

  return counts;
}
