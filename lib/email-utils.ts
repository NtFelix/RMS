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
  id?: string; // Outlook attachment ID
  name: string;
  size: number;
  path: string;
  contentType?: string;
  isInline?: boolean;
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
 * Fetch email body from Outlook - uses bodyPreview for now
 * Full body fetching from Graph API has authentication issues in Next.js context
 * TODO: Implement proper on-demand body fetching via Supabase Edge Function
 */
export async function fetchEmailBodyFromOutlook(emailId: string): Promise<EmailBody> {
  // For now, return a message indicating the email needs to be viewed in Outlook
  // The bodyPreview from metadata is shown in the list view
  return {
    plain: 'This email is stored in Outlook. Full content loading is being implemented.',
    html: '<p>This email is stored in Outlook. Full content loading is being implemented.</p>',
    metadata: { hasAttachments: false }
  };
}

/**
 * Download and decompress email body from Storage (fallback for non-Outlook emails)
 */
export async function fetchEmailBodyFromStorage(dateipfad: string): Promise<EmailBody> {
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
    console.error('Error fetching email body from storage:', error);
    throw error;
  }
}

/**
 * Fetch email body - automatically chooses Outlook or Storage based on source
 */
export async function fetchEmailBody(emailId: string, quelle: string, dateipfad?: string | null): Promise<EmailBody> {
  // For Outlook emails, fetch directly from Outlook
  if (quelle === 'outlook') {
    try {
      return await fetchEmailBodyFromOutlook(emailId);
    } catch (error) {
      console.error('Failed to fetch from Outlook, trying storage fallback:', error);
      // If Outlook fetch fails and we have a storage path, try that
      if (dateipfad) {
        return await fetchEmailBodyFromStorage(dateipfad);
      }
      throw error;
    }
  }

  // For other sources, use storage
  if (dateipfad) {
    return await fetchEmailBodyFromStorage(dateipfad);
  }

  throw new Error('No email body source available');
}

/**
 * List attachments for an Outlook email
 * TODO: Implement attachment listing via Supabase Edge Function
 */
export async function listOutlookAttachments(emailId: string): Promise<EmailAttachment[]> {
  // For now, return empty array
  // Attachments will be implemented later
  return [];
}

/**
 * List attachments from storage (fallback for non-Outlook emails)
 */
export async function listStorageAttachments(
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
 * List attachments for an email - automatically chooses Outlook or Storage
 */
export async function listEmailAttachments(
  userId: string,
  emailId: string,
  quelle: string
): Promise<EmailAttachment[]> {
  if (quelle === 'outlook') {
    try {
      return await listOutlookAttachments(emailId);
    } catch (error) {
      console.error('Failed to list Outlook attachments, trying storage:', error);
      return await listStorageAttachments(userId, emailId);
    }
  }

  return await listStorageAttachments(userId, emailId);
}

/**
 * Download an Outlook attachment
 * TODO: Implement attachment download via Supabase Edge Function
 */
export async function downloadOutlookAttachment(
  emailId: string,
  attachmentId: string,
  filename: string
) {
  throw new Error('Outlook attachment download not yet implemented');
}

/**
 * Download an attachment from storage
 */
export async function downloadStorageAttachment(path: string, filename: string) {
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
 * Download an attachment - automatically chooses Outlook or Storage
 */
export async function downloadAttachment(
  emailId: string,
  quelle: string,
  path: string,
  filename: string,
  attachmentId?: string
) {
  if (quelle === 'outlook' && attachmentId) {
    try {
      await downloadOutlookAttachment(emailId, attachmentId, filename);
      return;
    } catch (error) {
      console.error('Failed to download from Outlook, trying storage:', error);
      // Fall through to storage download
    }
  }

  await downloadStorageAttachment(path, filename);
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
 * Deletes the database record and storage files (via trigger)
 */
export async function deleteEmailPermanently(emailId: string, userId: string) {
  const supabase = createClient();

  try {
    // First, get the email to verify ownership and get the file path
    const { data: email, error: fetchError } = await supabase
      .from('Mail_Metadaten')
      .select('dateipfad, user_id')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      // Check if it's a PGRST116 error (no rows returned)
      if (fetchError.code === 'PGRST116') {
        throw new Error('Diese E-Mail existiert nicht in der Datenbank. Möglicherweise handelt es sich um Mock-Daten.');
      }

      throw new Error(`Email nicht gefunden: ${fetchError.message || fetchError.code || 'Unbekannter Fehler'}`);
    }

    if (!email) {
      throw new Error('Diese E-Mail existiert nicht in der Datenbank.');
    }

    // Delete from Storage first (body and attachments)
    // If this fails, we throw an error to prevent orphaned database records
    const filesToDelete: string[] = [];

    // 1. Try to delete the body file directly if we have the path
    if (email.dateipfad) {
      filesToDelete.push(email.dateipfad);
    }

    // 2. List and delete all files in the email folder
    const folderPath = `${userId}/${emailId}`;
    const { data: files, error: listError } = await supabase.storage
      .from('mails')
      .list(folderPath);

    if (listError) {
      // Log but don't fail if folder doesn't exist (it might be an Outlook email with no storage)
      console.warn('Warning listing files for deletion:', listError);
    } else if (files && files.length > 0) {
      files.forEach(file => {
        const fullPath = `${folderPath}/${file.name}`;
        if (!filesToDelete.includes(fullPath)) {
          filesToDelete.push(fullPath);
        }
      });
    }

    // 3. List and delete files in attachments subfolder
    const { data: attachments, error: attachListError } = await supabase.storage
      .from('mails')
      .list(`${folderPath}/attachments`);

    if (!attachListError && attachments && attachments.length > 0) {
      attachments.forEach(file => {
        filesToDelete.push(`${folderPath}/attachments/${file.name}`);
      });
    }

    // 4. Delete all collected files - throw error if deletion fails
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('mails')
        .remove(filesToDelete);

      if (deleteError) {
        // Throw error to prevent orphaned database records
        throw new Error(`Fehler beim Löschen der E-Mail-Dateien: ${deleteError.message}. Die E-Mail wurde nicht gelöscht.`);
      }
    }

    // Delete from database (this will trigger the database trigger)
    const { error: dbError } = await supabase
      .from('Mail_Metadaten')
      .delete()
      .eq('id', emailId)
      .eq('user_id', userId);

    if (dbError) {
      // Check if it's a 404 (table doesn't exist)
      if (dbError.code === 'PGRST116' || dbError.message?.includes('404')) {
        throw new Error('Tabelle Mail_Metadaten existiert nicht. Bitte führen Sie die Datenbank-Migration aus.');
      }

      throw new Error(`Fehler beim Löschen aus Datenbank: ${dbError.message || dbError.code || 'Unbekannter Fehler'}`);
    }

  } catch (error) {
    console.error('deleteEmailPermanently error:', error);
    throw error;
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
 * Email summary statistics interface
 */
export interface EmailSummary {
  total: number;
  unread: number;
  inbox: number;
  sent: number;
  drafts: number;
  archive: number;
  trash: number;
  spam: number;
  favorites: number;
}

/**
 * Get email summary statistics using RPC function (efficient single query)
 * Falls back to multiple queries if RPC is not available
 */
export async function getEmailSummary(): Promise<EmailSummary> {
  const supabase = createClient();

  try {
    // Try using the RPC function first (single query, most efficient)
    const { data, error } = await supabase.rpc('get_mail_summary');

    if (!error && data) {
      return data as EmailSummary;
    }

    // Log the error for debugging but continue with fallback
    if (error) {
      console.warn('RPC get_mail_summary not available, using fallback:', error.message);
    }
  } catch (rpcError) {
    console.warn('RPC call failed, using fallback:', rpcError);
  }

  // Fallback: Get user ID and make separate queries
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { total: 0, unread: 0, inbox: 0, sent: 0, drafts: 0, archive: 0, trash: 0, spam: 0, favorites: 0 };
  }

  return getEmailCountsLegacy(user.id);
}

/**
 * Legacy implementation: Get email counts per folder (multiple queries)
 * @deprecated Use getEmailSummary() instead for better performance
 */
async function getEmailCountsLegacy(userId: string): Promise<EmailSummary> {
  const supabase = createClient();

  const folders = ['inbox', 'sent', 'drafts', 'archive', 'trash', 'spam'] as const;
  const counts: Partial<EmailSummary> = {};

  // Get total count
  const { count: totalCount } = await supabase
    .from('Mail_Metadaten')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  counts.total = totalCount || 0;

  // Get folder counts
  for (const folder of folders) {
    const { count, error } = await supabase
      .from('Mail_Metadaten')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('ordner', folder);

    if (!error) {
      counts[folder] = count || 0;
    } else {
      counts[folder] = 0;
    }
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('Mail_Metadaten')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('ist_gelesen', false);

  counts.unread = unreadCount || 0;

  // Get favorites count
  const { count: favoritesCount } = await supabase
    .from('Mail_Metadaten')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('ist_favorit', true);

  counts.favorites = favoritesCount || 0;

  return counts as EmailSummary;
}

/**
 * Get email counts per folder
 * @deprecated Use getEmailSummary() instead for better performance
 */
export async function getEmailCounts(userId: string): Promise<Record<string, number>> {
  const summary = await getEmailSummary();

  // Convert to legacy format for backwards compatibility
  return {
    inbox: summary.inbox,
    sent: summary.sent,
    drafts: summary.drafts,
    archive: summary.archive,
    trash: summary.trash,
    spam: summary.spam,
    unread: summary.unread,
    total: summary.total,
    favorites: summary.favorites,
  };
}

