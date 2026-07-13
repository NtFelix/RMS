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

  return (data || [])
    .map(msg => ({
      role: msg.rolle as 'user' | 'assistant',
      content: msg.inhalt || '',
    }))
    .filter(msg => msg.content && msg.content.trim().length > 0);
}
