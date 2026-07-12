import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/utils/supabase/server";
import { getAIContextForPathname } from "@/utils/ai-context";
import { getPostHogServer } from '@/app/posthog-server.mjs';
import { v4 as uuidv4 } from 'uuid';

const clampLimit = (val: unknown): number =>
  Math.min(Math.max(Number(val) || 10, 1), 100);

const allFunctionDeclarations = [
    {
      name: "get_houses",
      description: "Get a list of all houses (properties/Häuser) managed by the user.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          limit: { type: Type.INTEGER, description: "Maximum number of houses to return (default is 10)" }
        }
      }
    },
    {
      name: "get_apartments",
      description: "Get a list of apartments (Wohnungen), optionally filtered by a specific house ID.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          house_id: { type: Type.STRING, description: "Optional UUID of the house to filter apartments by." },
          limit: { type: Type.INTEGER, description: "Maximum number of apartments to return (default is 10)" }
        }
      }
    },
    {
      name: "get_tenants",
      description: "Get a list of tenants (Mieter), optionally filtered by their name.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          search_term: { type: Type.STRING, description: "Optional search term for filtering tenants by name." },
          limit: { type: Type.INTEGER, description: "Maximum number of tenants to return (default is 10)" }
        }
      }
    },
    {
      name: "get_finances",
      description: "Get a list of financial transactions (Finanzen). Defaults to the latest entries. Can be filtered by apartment, type, exact date, or date range.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          wohnung_id: { type: Type.STRING, description: "Optional UUID of the apartment (Wohnung) to filter finances by." },
          ist_einnahmen: { type: Type.BOOLEAN, description: "Optional boolean to filter by income (true) or expense (false)." },
          exact_date: { type: Type.STRING, description: "Filter by an exact date (YYYY-MM-DD)." },
          start_date: { type: Type.STRING, description: "Start of a date range (ISO format/YYYY-MM-DD)." },
          end_date: { type: Type.STRING, description: "End of a date range (ISO format/YYYY-MM-DD)." },
          limit: { type: Type.INTEGER, description: "Maximum number of transactions to return (default is 10)" }
        }
      }
    },
    {
      name: "get_tasks",
      description: "Get a list of tasks (Aufgaben). Defaults to most recently due or created. Can be filtered by status, exact date, or date range.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          ist_erledigt: { type: Type.BOOLEAN, description: "Optional boolean to filter by completed (true) or pending (false) tasks." },
          exact_date: { type: Type.STRING, description: "Filter by an exact due date (YYYY-MM-DD)." },
          start_date: { type: Type.STRING, description: "Start of a due date range (ISO format/YYYY-MM-DD)." },
          end_date: { type: Type.STRING, description: "End of a due date range (ISO format/YYYY-MM-DD)." },
          limit: { type: Type.INTEGER, description: "Maximum number of tasks to return (default is 10)" }
        }
      }
    },
    {
      name: "get_nebenkosten",
      description: "Get a list of ancillary costs / utility costs (Nebenkosten), optionally filtered by house ID.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          haeuser_id: { type: Type.STRING, description: "Optional UUID of the house (Haus) to filter ancillary costs by." },
          limit: { type: Type.INTEGER, description: "Maximum number of Nebenkosten records to return (default is 10)" }
        }
      }
    }
];

export async function POST(req: NextRequest) {
  const traceId = uuidv4();
  const startTime = Date.now();
  let userId = "anonymous";

  try {
    // 2. Parse Request Body (before auth to catch malformed JSON early)
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { message, history = [], pathname, sessionId, model = "gemini-3.1-flash-lite-preview", attachment, enabledToolIds } = body as {
      message?: string;
      history?: { role: string; parts: { text?: string; inlineData?: { data: string; mimeType: string } }[] }[];
      pathname?: string;
      sessionId?: string;
      model?: string;
      attachment?: { data: string; type: string };
      enabledToolIds?: string[];
    };

    // 1. Authenticate Request
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    if (!message || !pathname || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Resolve org_id — try cookie first, then fall back to current_organisation_id RPC
    let orgId = req.cookies.get('current_organisation_id')?.value;
    if (!orgId || orgId === 'unknown') {
      try {
        const { data: rpcOrgId } = await supabase.rpc('current_organisation_id');
        orgId = rpcOrgId ?? 'unknown';
      } catch {
        orgId = 'unknown';
      }
    }

    // 4. Get PostHog server instance (handles key resolution, host fallback, flushAt: 1)
    const posthog = getPostHogServer();

    // 5. Fetch Dynamic Context based on URL
    const pageContext = await getAIContextForPathname(pathname);

    // 5. Initialize Gemini
    const aiKey = process.env.GEMINI_API_KEY;
    if (!aiKey) {
        throw new Error("Missing GEMINI_API_KEY environment variable");
    }
    const client = new GoogleGenAI({ apiKey: aiKey });

    const systemInstruction = `You are an AI assistant integrated into the Mietevo property management application.
You help landlords navigate the platform, answer questions about their property and tenant data, and guide them through tasks.
You can only read and present data — you cannot create, update, or delete anything.
Always be concise, helpful, and professional. Respond in the user's language.

Current Date: ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    const filteredFunctions = allFunctionDeclarations.filter(f => 
      !enabledToolIds || (Array.isArray(enabledToolIds) && enabledToolIds.includes(f.name))
    );

    const tools: object[] = filteredFunctions.length > 0 
      ? [{ functionDeclarations: filteredFunctions }] 
      : [];

    // 7. Create Chat with History, System Prompt & Tools
    const contextMessage = pageContext ? [{ role: "user", parts: [{ text: `Current page context:\n${pageContext}` }] }] : [];
    const chat = client.chats.create({
      model: model,
      config: {
        systemInstruction,
        tools,
      },
      history: [...contextMessage, ...history],
    });

    const executeTurn = async (
      chatInstance: ReturnType<GoogleGenAI['chats']['create']>,
      sendFn: (data: Record<string, unknown>) => void,
      addUsageFn: (res: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }) => void,
      parts: ({ text: string } | { inlineData: { data: string; mimeType: string } } | { functionResponse: { name: string; id?: string; response: Record<string, unknown> } })[]
    ) => {
      const result = await chatInstance.sendMessageStream({ message: parts });
      let fullText = "";
      let functionCalls: { name: string; args?: Record<string, unknown>; id?: string }[] = [];
      let finalUsage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
      
      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullText += text;
          sendFn({ type: "content", content: text });
        }
        if (chunk.functionCalls) {
          functionCalls = chunk.functionCalls.filter((fc): fc is { name: string; args?: Record<string, unknown>; id?: string } => !!fc.name);
        }
        if (chunk.usageMetadata) {
          finalUsage = chunk.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number };
        }
      }
      
      return {
        text: () => fullText,
        functionCalls,
        usageMetadata: finalUsage,
      };
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));

        try {
          const messageParts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [{ text: message }];
          if (attachment) {
            messageParts.push({
              inlineData: {
                data: attachment.data,
                mimeType: attachment.type
              }
            });
          }

          let totalInputTokens = 0;
          let totalOutputTokens = 0;

          const addUsage = (res: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }) => {
            if (res.usageMetadata) {
              totalInputTokens += res.usageMetadata.promptTokenCount || 0;
              totalOutputTokens += res.usageMetadata.candidatesTokenCount || 0;
            }
          };

          send({ type: "step_start", stepType: "thinking", label: "Nachricht analysieren..." });
          let aiResponse = await executeTurn(chat, send, addUsage, messageParts);
          addUsage(aiResponse);
          send({ type: "step_done" });
          
          const maxToolLoops = 5;
          let remainingLoops = maxToolLoops;
          const executedTools: { name: string; args: unknown; result: Record<string, unknown>; error: string | null }[] = [];
          
          while (aiResponse.functionCalls && aiResponse.functionCalls.length > 0 && remainingLoops > 0) {
            remainingLoops--;
            const responses: { functionResponse: { name: string; id?: string; response: Record<string, unknown> } }[] = [];

            for (const call of aiResponse.functionCalls) {
              const label = call.name === "get_houses" ? "Häuser abrufen..." :
                            call.name === "get_apartments" ? "Wohnungen suchen..." :
                            call.name === "get_tenants" ? "Mieter-Datenbank durchsuchen..." :
                            call.name === "get_finances" ? "Finanzdaten analysieren..." :
                            call.name === "get_tasks" ? "Aufgabenliste prüfen..." :
                            call.name === "get_nebenkosten" ? "Nebenkosten-Details abrufen..." :
                            `Tool ausführen: ${call.name}`;
              
              send({ 
                type: "step_start", 
                stepType: "tool_call", 
                label, 
                detail: `${call.name}(${JSON.stringify(call.args)})` 
              });

              let result: Record<string, unknown> = {};
              let toolError: string | null = null;
              try {
                if (call.name === "get_houses") {
                  const limit = clampLimit(call.args?.limit);
                  const { data, error } = await supabase.from('Haeuser')
                    .select('id, name, strasse, plz, ort, groesse, Wohnungen(groesse)')
                    .limit(limit);
                  
                  if (error) toolError = error.message;
                  
                  const processedData = data?.map((h: { Wohnungen?: { groesse?: number | null }[]; groesse?: number | null; [key: string]: unknown }) => {
                    const { Wohnungen, ...house } = h;
                    let finalGroesse = house.groesse;
                    
                    if (finalGroesse === null && Array.isArray(Wohnungen)) {
                      finalGroesse = Wohnungen.reduce((acc: number, w: { groesse?: number | null }) => acc + (Number(w.groesse) || 0), 0);
                    }
                    
                    return { ...house, groesse: finalGroesse };
                  });

                  result = error ? { error: error.message } : { data: processedData || [] };
                } 
                else if (call.name === "get_apartments") {
                  let query = supabase.from('Wohnungen').select('id, name, groesse, miete, haus_id, Haeuser(name)');
                  if (call.args?.house_id) {
                     query = query.eq('haus_id', call.args.house_id);
                  }
                  const limit = clampLimit(call.args?.limit);
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                } 
                else if (call.name === "get_tenants") {
                  let query = supabase.from('Mieter').select('id, name, email, telefonnummer, status, einzug, auszug, Wohnungen(name, miete, Haeuser(name))');
                  if (call.args?.search_term) {
                     query = query.ilike('name', `%${call.args.search_term}%`);
                  }
                  const limit = clampLimit(call.args?.limit);
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                } 
                else if (call.name === "get_finances") {
                  let query = supabase.from('Finanzen').select('id, name, datum, betrag, notiz, ist_einnahmen, wohnung_id, Wohnungen(name, Haeuser(name))')
                    .order('datum', { ascending: false });
                  
                  if (call.args?.wohnung_id) {
                     query = query.eq('wohnung_id', call.args.wohnung_id);
                  }
                  if (call.args?.ist_einnahmen !== undefined) {
                     query = query.eq('ist_einnahmen', call.args.ist_einnahmen);
                  }
                  if (call.args?.exact_date) {
                    query = query.eq('datum', call.args.exact_date);
                  } else {
                    if (call.args?.start_date) query = query.gte('datum', call.args.start_date);
                    if (call.args?.end_date) query = query.lte('datum', call.args.end_date);
                  }

                  const limit = clampLimit(call.args?.limit);
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                }
                else if (call.name === "get_tasks") {
                  let query = supabase.from('Aufgaben').select('id, name, beschreibung, ist_erledigt, faelligkeitsdatum, erstellungsdatum')
                    .order('faelligkeitsdatum', { ascending: false, nullsFirst: false });
                  
                  if (call.args?.ist_erledigt !== undefined) {
                     query = query.eq('ist_erledigt', call.args.ist_erledigt);
                  }
                  if (call.args?.exact_date) {
                    query = query.eq('faelligkeitsdatum', call.args.exact_date);
                  } else {
                    if (call.args?.start_date) query = query.gte('faelligkeitsdatum', call.args.start_date);
                    if (call.args?.end_date) query = query.lte('faelligkeitsdatum', call.args.end_date);
                  }

                  const limit = clampLimit(call.args?.limit);
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                }
                else if (call.name === "get_nebenkosten") {
                  let query = supabase.from('Nebenkosten').select('id, nebenkostenart, betrag, berechnungsart, startdatum, enddatum, vorauszahlungs_art, haeuser_id, Haeuser(name)');
                  if (call.args?.haeuser_id) {
                     query = query.eq('haeuser_id', call.args.haeuser_id);
                  }
                  const limit = clampLimit(call.args?.limit);
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                } 
                else {
                  toolError = "Unknown tool call: " + call.name;
                  result = { error: toolError };
                }
              } catch (e: unknown) {
                toolError = e instanceof Error ? e.message : String(e);
                result = { error: toolError };
              }
              
              const toolResult = {
                name: call.name,
                args: call.args,
                result: result,
                error: toolError,
              };
              executedTools.push(toolResult);
              
              send({ type: "tool_result", toolCall: toolResult });
              send({ type: "step_done" });
              
              responses.push({
                functionResponse: {
                  name: call.name,
                  id: call.id,
                  response: result
                }
              });
            }

            send({ type: "step_start", stepType: "thinking", label: "Daten verarbeiten..." });
            aiResponse = await executeTurn(chat, send, addUsage, responses);
            addUsage(aiResponse);
            send({ type: "step_done" });
          }

          send({ type: "step_start", stepType: "generating", label: "Antwort formulieren..." });
          
          const replyText = aiResponse.text();
          const latency = (Date.now() - startTime) / 1000;
          send({ type: "step_done" });

          // 8. Track Generation in PostHog (fire-and-forget, don't block the stream)
          posthog.capture({
            distinctId: userId,
            event: '$ai_generation',
            groups: { organization: orgId },
            properties: {
              $ai_trace_id: traceId,
              $ai_session_id: sessionId,
              $ai_span_name: 'mietevo_ai_agent',
              $ai_model: model,
              $ai_provider: 'google',
              $ai_input: [{ role: 'user', content: message }],
              $ai_output_choices: [{ role: 'assistant', content: replyText }],
              $ai_input_tokens: totalInputTokens,
              $ai_output_tokens: totalOutputTokens,
              $ai_latency: latency,
              $ai_tools_called: executedTools.map(t => t.name),
              $ai_tool_call_count: executedTools.length,
              $ai_http_status: 200,
              org_id: orgId,
              feature: 'chat',
            },
          }).catch((e: unknown) => console.error("[PostHog] Failed to track $ai_generation:", e));

          // Final payload
          send({ 
            type: "final_reply", 
            reply: replyText, 
            traceId: traceId,
            toolCalls: executedTools 
          });
          controller.close();

        } catch (error: unknown) {
          console.error("Stream Error:", error);
          send({ type: "error", message: error instanceof Error ? error.message : "Internal Server Error" });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" }
    });

  } catch (error: unknown) {
    console.error("Chat API Root Error:", error);
    const errorMessage = process.env.NODE_ENV === 'development'
      ? (error instanceof Error ? error.message : String(error))
      : undefined;
    return NextResponse.json(
      { error: "Internal Server Error", ...(errorMessage ? { details: errorMessage } : {}) },
      { status: 500 }
    );
  }
}
