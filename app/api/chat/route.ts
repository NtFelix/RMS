export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/utils/supabase/server";
import { getAIContextForPathname } from "@/utils/ai-context";
import { PostHog } from 'posthog-node';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  let posthog: PostHog | null = null;
  const traceId = uuidv4();
  const startTime = Date.now();
  let userId = "anonymous";
  let userRole = "landlord";

  try {
    // 1. Authenticate Request
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;

    // 2. Parse Request Body
    const body = await req.json();
    const { message, history = [], pathname, sessionId, model = "gemini-3.1-flash-lite-preview", attachment } = body;

    if (!message || !pathname || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Setup PostHog Node Client
    const posthogKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (posthogKey && posthogHost) {
        posthog = new PostHog(posthogKey, {
            host: posthogHost,
        });
    }

    // 4. Fetch Dynamic Context based on URL
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

Current Date: ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

--- CURRENT CONTEXT ---
${pageContext}`;

    // 6. Define Tools
    const tools: any[] = [{
      functionDeclarations: [
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
      ]
    }];

    // 7. Create Chat with History, System Prompt & Tools
    const chat = client.chats.create({
      model: model,
      config: {
        systemInstruction,
        tools,
      },
      history: history, // Provide past conversation turns
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));

        try {
          // Send Message & Handle Function Calls
          let messageParts: any[] = [{ text: message }];
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

          const addUsage = (res: any) => {
            if (res.usageMetadata) {
              totalInputTokens += res.usageMetadata.promptTokenCount || 0;
              totalOutputTokens += res.usageMetadata.candidatesTokenCount || 0;
            }
          };

          const executeTurn = async (parts: any[]) => {
            const result = await chat.sendMessageStream({ message: parts });
            let fullText = "";
            let functionCalls: any[] = [];
            let finalUsage: any = null;
            
            for await (const chunk of result) {
              const text = chunk.text;
              if (text) {
                fullText += text;
                send({ type: "content", content: text });
              }
              if (chunk.functionCalls) {
                functionCalls = chunk.functionCalls;
              }
              if (chunk.usageMetadata) {
                finalUsage = chunk.usageMetadata;
              }
            }
            
            return {
              text: () => fullText,
              functionCalls,
              usageMetadata: finalUsage,
            };
          };

          send({ type: "step_start", stepType: "thinking", label: "Nachricht analysieren..." });
          let aiResponse = await executeTurn(messageParts);
          addUsage(aiResponse);
          send({ type: "step_done" });
          
          let maxToolLoops = 5;
          const executedTools: any[] = [];
          
          while (aiResponse.functionCalls && aiResponse.functionCalls.length > 0 && maxToolLoops > 0) {
            maxToolLoops--;
            const responses: any[] = [];

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

              let result: any = {};
              let toolError: string | null = null;
              try {
                if (call.name === "get_houses") {
                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await supabase.from('Haeuser')
                    .select('id, name, strasse, plz, ort, groesse, Wohnungen(groesse)')
                    .limit(limit);
                  
                  if (error) toolError = error.message;
                  
                  const processedData = data?.map((h: any) => {
                    const { Wohnungen, ...house } = h;
                    let finalGroesse = house.groesse;
                    
                    // If groesse is null (automatic), sum up the apartment sizes
                    if (finalGroesse === null && Array.isArray(Wohnungen)) {
                      finalGroesse = Wohnungen.reduce((acc: number, w: any) => acc + (Number(w.groesse) || 0), 0);
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
                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                } 
                else if (call.name === "get_tenants") {
                  let query = supabase.from('Mieter').select('id, name, email, telefonnummer, status, einzug, auszug, Wohnungen(name, miete, Haeuser(name))');
                  if (call.args?.search_term) {
                     query = query.ilike('name', `%${call.args.search_term}%`);
                  }
                  const limit = Number(call.args?.limit) || 10;
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

                  const limit = Number(call.args?.limit) || 10;
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

                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                }
                else if (call.name === "get_nebenkosten") {
                  let query = supabase.from('Nebenkosten').select('id, nebenkostenart, betrag, berechnungsart, startdatum, enddatum, vorauszahlungs_art, haeuser_id, Haeuser(name)');
                  if (call.args?.haeuser_id) {
                     query = query.eq('haeuser_id', call.args.haeuser_id);
                  }
                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                } 
                else {
                  toolError = "Unknown tool call: " + call.name;
                  result = { error: toolError };
                }
              } catch (e: any) {
                toolError = e.message || String(e);
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
            aiResponse = await executeTurn(responses);
            addUsage(aiResponse);
            send({ type: "step_done" });
          }

          send({ type: "step_start", stepType: "generating", label: "Antwort formulieren..." });
          
          let replyText = aiResponse.text();
          const latency = (Date.now() - startTime) / 1000;
          send({ type: "step_done" });

          // 8. Track Generation in PostHog
          if (posthog) {
            posthog.capture({
              distinctId: userId,
              event: '$ai_generation',
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
              },
            });
            await posthog.shutdown();
          }

          // Final payload
          send({ 
            type: "final_reply", 
            reply: replyText, 
            traceId: traceId,
            toolCalls: executedTools 
          });
          controller.close();

        } catch (error: any) {
          console.error("Stream Error:", error);
          send({ type: "error", message: error?.message || "Internal Server Error" });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" }
    });

  } catch (error: any) {
    console.error("Chat API Root Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message },
      { status: 500 }
    );
  }
}
