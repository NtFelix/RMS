import { createSupabaseServiceClient } from '@/lib/sandbox/runner';

/**
 * loadChatHistory - Loads the last N completed messages in chronological order
 */
export async function loadChatHistory(conversationId: string, limit = 20) {
  const supabase = createSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('KI_Nachrichten')
    .select('rolle, inhalt')
    .eq('konversation_id', conversationId)
    .eq('status', 'abgeschlossen')
    .in('rolle', ['user', 'assistant'])
    .order('erstellt_am', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[chat-history] Error loading history:', error.message);
    return [];
  }

  const result: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const msg of data || []) {
    const content = (msg.inhalt || '').trim();
    if (content) {
      result.push({
        role: msg.rolle as 'user' | 'assistant',
        content,
      });
    }
  }
  return result;
}
