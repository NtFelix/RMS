import { ToolLoopAgent, isStepCount } from 'ai';
import { vertex } from '@ai-sdk/google-vertex';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AsyncLocalStorage } from 'async_hooks';

const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
const googleProvider = createGoogleGenerativeAI({
  apiKey: googleApiKey,
});
import { createSupabaseServiceClient } from '@/lib/sandbox/runner';
import { getPostHogServer } from '@/app/posthog-server.mjs';
import { fetchMieter } from './tools/mietevo/fetch_mieter';
import { fetchFinanzen } from './tools/mietevo/fetch_finanzen';
import { createAufgabe } from './tools/mietevo/create_aufgabe';
import { getHaeuser } from './tools/mietevo/get_haeuser';

export interface RunAgentParams {
  runId: string;
  conversationId?: string;
  messageId?: string; // Assistant placeholder message ID
  authMode: 'user' | 'agent';
  userId?: string;
  orgId: string;
  agentMitgliedId?: string;
  agentId?: string;
  userMessage?: string; // Explicit current user message
  onToken?: (token: string) => void;
  userJwt?: string;
  model?: string;
}

export const agentRuntimeLocalStorage = new AsyncLocalStorage<{
  orgId: string;
  agentMitgliedId?: string;
  userJwt?: string;
}>();

/**
 * runAgent - Zentraler Agent Runner für Chat- und Background-Agenten
 */
export async function runAgent(params: RunAgentParams): Promise<any> {
  const {
    runId,
    conversationId,
    messageId,
    authMode,
    userId,
    orgId,
    agentMitgliedId,
    agentId,
    userMessage,
    onToken,
    userJwt,
    model,
  } = params;

  return agentRuntimeLocalStorage.run({ orgId, agentMitgliedId, userJwt }, async () => {
    const startTime = Date.now();
    const supabase = createSupabaseServiceClient();

    // 1. Set agent context in DB session for safety if executing in agent mode
    if (authMode === 'agent' && agentMitgliedId) {
      await supabase.rpc('set_agent_context', {
        p_organisation_id: orgId,
        p_agent_mitglied_id: agentMitgliedId,
      });
    }

    // 2. Load agent instructions from database or use default
    let instructions = 'Du bist ein Mietevo-Agent. Verwende die bereitgestellten Tools.';
    if (agentId) {
      const { data: agentData } = await supabase
        .from('KI_Agenten')
        .select('anweisungen')
        .eq('id', agentId)
        .single();
      if (agentData?.anweisungen) {
        instructions = agentData.anweisungen;
      }
    } else if (agentMitgliedId) {
      const { data: agentData } = await supabase
        .from('KI_Agenten')
        .select('anweisungen')
        .eq('mitglied_id', agentMitgliedId)
        .single();
      if (agentData?.anweisungen) {
        instructions = agentData.anweisungen;
      }
    }

    // 3. Fetch chat history (last 20 messages)
    let formattedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    if (conversationId) {
      // Order by descending to fetch the 20 newest messages, then reverse in memory
      const { data: historyData } = await supabase
        .from('KI_Nachrichten')
        .select('rolle, inhalt')
        .eq('konversation_id', conversationId)
        .order('erstellt_am', { ascending: false })
        .limit(20);

      if (historyData) {
        const chronologicalHistory = [...historyData].reverse();
        formattedMessages = chronologicalHistory.map((m) => ({
          role: m.rolle === 'assistant' ? 'assistant' : m.rolle === 'system' ? 'system' : 'user',
          content: m.inhalt || '',
        }));
      }
    }

    // Explicitly append the current user message to history
    if (userMessage) {
      formattedMessages.push({
        role: 'user',
        content: userMessage,
      });
    }

    // 4. Resolve the requested model dynamically
    const actualModel = googleApiKey 
      ? (model || 'gemini-3-flash-preview') 
      : (model && model.startsWith('gemini-') ? (model === 'gemini-3.1-flash-lite-preview' ? 'gemini-3-flash-lite' : model.replace('-preview', '')) : 'gemini-3-flash');

    // 5. Instantiate Vercel AI SDK ToolLoopAgent with instructions and tools
    const agentInstance = new ToolLoopAgent({
      model: googleApiKey ? googleProvider(actualModel) : vertex(actualModel),
      instructions: instructions,
      tools: {
        fetchMieter,
        fetchFinanzen,
        createAufgabe,
        getHaeuser,
      },
      stopWhen: isStepCount(50),
    });

    let fullText = '';
    let lastDbWriteTime = Date.now();
    let activeWritePromise: Promise<any> = Promise.resolve();
 
    // Helper to batch update database text output every 500ms
    const handleToken = async (text: string) => {
      fullText += text;
      if (onToken) {
        onToken(text);
      }
 
      if (messageId) {
        const now = Date.now();
        if (now - lastDbWriteTime > 500) {
          lastDbWriteTime = now;
          activeWritePromise = Promise.resolve(
            supabase
              .from('KI_Nachrichten')
              .update({ inhalt: fullText })
              .eq('id', messageId)
              .then(({ error }) => {
                if (error) console.error('[mietevo-agent] Stream update error:', error.message);
              })
          );
        }
      }
    };

    let usage: any = { promptTokens: 0, completionTokens: 0 };

    try {
      if (onToken) {
        // Run as a stream
        const { textStream, usage: usagePromise } = await agentInstance.stream({
          messages: formattedMessages,
        });

        for await (const chunk of textStream) {
          await handleToken(chunk);
        }
        usage = await usagePromise;
      } else {
        // Run as single generation
        const { text, usage: usageResult } = await agentInstance.generate({
          messages: formattedMessages,
        });
        fullText = text;
        usage = usageResult;
      }

      const latencyMs = Date.now() - startTime;
      const totalTokens = (usage?.promptTokens || 0) + (usage?.completionTokens || 0);

      // Ensure any pending/in-flight throttled writes finish before the final completed write
      await activeWritePromise;

      // Finalize database assistant message entry
      if (messageId) {
        await supabase
          .from('KI_Nachrichten')
          .update({
            inhalt: fullText,
            status: 'abgeschlossen',
            token_anzahl: totalTokens,
            latenz_ms: latencyMs,
          })
          .eq('id', messageId);
      }

      // Track execution metrics in PostHog
      try {
        const posthog = getPostHogServer();
        const distinctId = userId || agentMitgliedId || runId || 'system-agent';
        await posthog.capture({
          distinctId,
          event: '$ai_generation',
          groups: { organization: orgId },
          properties: {
            $ai_trace_id: runId,
            $ai_session_id: conversationId || runId,
            $ai_span_name: 'mietevo_ai_agent',
            $ai_model: actualModel,
            $ai_provider: googleApiKey ? 'google' : 'vertex',
            $ai_input: formattedMessages.map(m => ({ role: m.role, content: m.content })),
            $ai_output_choices: [{ role: 'assistant', content: fullText }],
            $ai_input_tokens: usage?.promptTokens || 0,
            $ai_output_tokens: usage?.completionTokens || 0,
            $ai_latency: latencyMs,
            org_id: orgId,
            feature: conversationId ? 'chat' : 'agent',
          },
        });
        await posthog.flush();
      } catch (phError) {
        console.error('[PostHog] Failed to track $ai_generation:', phError);
      }

      return {
        text: fullText,
        usage,
        latencyMs,
      };
    } catch (err: any) {
      // Handle runner failure and log details in database
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (messageId) {
        await supabase
          .from('KI_Nachrichten')
          .update({
            status: 'fehler',
            fehler_meldung: errorMsg,
          })
          .eq('id', messageId);
      }
      throw err;
    }
  });
}
