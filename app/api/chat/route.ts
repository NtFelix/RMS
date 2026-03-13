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

  // Setup SSE Stream
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(type: string, data: any) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
        } catch (e) {
          console.error("Stream enqueue error:", e);
        }
      }

      try {
        // 1. Authenticate Request
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          sendEvent("error", { message: "Unauthorized" });
          controller.close();
          return;
        }
        userId = user.id;

        // 2. Parse Request Body
        const body = await req.json();
        const { message, history = [], pathname, sessionId } = body;

        // 3. Setup PostHog Node Client
        const posthogKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
        const posthogHost = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST;
        if (posthogKey && posthogHost) {
            posthog = new PostHog(posthogKey, { host: posthogHost });
        }

        // 4. Fetch Dynamic Context based on URL
        const pageContext = await getAIContextForPathname(pathname);

        // 5. Initialize Gemini
        const aiKey = process.env.GEMINI_API_KEY;
        if (!aiKey) throw new Error("Missing GEMINI_API_KEY environment variable");
        const client = new GoogleGenAI({ apiKey: aiKey });

        const systemInstruction = `You are an AI assistant integrated into the Mietevo property management application.
You help landlords navigate the platform, answer questions about their property and tenant data, and guide them through tasks.
You can only read and present data — you cannot create, update, or delete anything.
Always be concise, helpful, and professional. Respond in the user's language.

--- CURRENT CONTEXT ---
${pageContext}`;

        // 6. Define Tools
        const tools: any[] = [{
          functionDeclarations: [
            {
              name: "get_houses",
              description: "Get a list of all houses (properties/Häuser) managed by the user.",
              parameters: { type: Type.OBJECT, properties: { limit: { type: Type.INTEGER, description: "Maximum number of houses to return (default is 10)" } } }
            },
            {
              name: "get_apartments",
              description: "Get a list of apartments (Wohnungen), optionally filtered by a specific house ID.",
              parameters: { type: Type.OBJECT, properties: { house_id: { type: Type.STRING, description: "Optional UUID of the house to filter apartments by." }, limit: { type: Type.INTEGER, description: "Maximum number of apartments to return (default is 10)" } } }
            },
            {
              name: "get_tenants",
              description: "Get a list of tenants (Mieter), optionally filtered by their name.",
              parameters: { type: Type.OBJECT, properties: { search_term: { type: Type.STRING, description: "Optional search term for filtering tenants by name." }, limit: { type: Type.INTEGER, description: "Maximum number of tenants to return (default is 10)" } } }
            },
            {
              name: "get_finances",
              description: "Get a list of financial transactions (Finanzen), optionally filtered by apartment ID or income/expense type.",
              parameters: { type: Type.OBJECT, properties: { wohnung_id: { type: Type.STRING, description: "Optional UUID of the apartment (Wohnung) to filter finances by." }, ist_einnahmen: { type: Type.BOOLEAN, description: "Optional boolean to filter by income (true) or expense (false)." }, limit: { type: Type.INTEGER, description: "Maximum number of transactions to return (default is 10)" } } }
            },
            {
              name: "get_tasks",
              description: "Get a list of tasks (Aufgaben), optionally filtered by completion status.",
              parameters: { type: Type.OBJECT, properties: { ist_erledigt: { type: Type.BOOLEAN, description: "Optional boolean to filter by completed (true) or pending (false) tasks." }, limit: { type: Type.INTEGER, description: "Maximum number of tasks to return (default is 10)" } } }
            },
            {
              name: "get_nebenkosten",
              description: "Get a list of ancillary costs / utility costs (Nebenkosten), optionally filtered by house ID.",
              parameters: { type: Type.OBJECT, properties: { haeuser_id: { type: Type.STRING, description: "Optional UUID of the house (Haus) to filter ancillary costs by." }, limit: { type: Type.INTEGER, description: "Maximum number of Nebenkosten records to return (default is 10)" } } }
            }
          ]
        }];

        // 7. Create Chat with History, System Prompt & Tools
        const chat = client.chats.create({
          model: "gemini-3.1-flash-lite-preview",
          config: { systemInstruction, tools },
          history: history,
        });

        const executedTools: any[] = [];
        let fullReplyText = "";
        let inputTokens = 0;
        let outputTokens = 0;

        // Recursive Streaming Function for handling nested tool calls
        async function runGeminiInteraction(inputMessage: any, depth = 0) {
          if (depth > 5) {
             console.log("Max tool depth reached.");
             return;
          }

          let responseStream;
          try {
             responseStream = await chat.sendMessageStream(inputMessage);
          } catch(e: any) {
             sendEvent("error", { message: `AI Error: ${e.message}` });
             throw e;
          }

          let functionCalls: any[] = [];
          
          for await (const chunk of responseStream) {
             if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                functionCalls.push(...chunk.functionCalls);
             }
             if (chunk.text) {
                sendEvent("text", { content: chunk.text });
                fullReplyText += chunk.text;
             }
             if (chunk.usageMetadata) {
                inputTokens = chunk.usageMetadata.promptTokenCount || inputTokens;
                outputTokens += chunk.usageMetadata.candidatesTokenCount || 0;
             }
          }

          if (functionCalls.length > 0) {
            const responses: any[] = [];
            for (const call of functionCalls) {
              sendEvent("tool_call", { name: call.name, args: call.args });
              let result: any = {};
              let toolError: string | null = null;
              try {
                if (call.name === "get_houses") {
                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await supabase.from('Haeuser').select('id, name, strasse, plz, ort, groesse').limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                } 
                else if (call.name === "get_apartments") {
                  let query = supabase.from('Wohnungen').select('id, name, groesse, miete, haus_id, Haeuser(name)');
                  if (call.args?.house_id) query = query.eq('haus_id', call.args.house_id);
                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                } 
                else if (call.name === "get_tenants") {
                  let query = supabase.from('Mieter').select('id, name, email, telefonnummer, status, einzug, auszug, Wohnungen(name, miete, Haeuser(name))');
                  if (call.args?.search_term) query = query.ilike('name', `%${call.args.search_term}%`);
                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                } 
                else if (call.name === "get_finances") {
                  let query = supabase.from('Finanzen').select('id, name, datum, betrag, notiz, ist_einnahmen, wohnung_id, Wohnungen(name, Haeuser(name))');
                  if (call.args?.wohnung_id) query = query.eq('wohnung_id', call.args.wohnung_id);
                  if (call.args?.ist_einnahmen !== undefined) query = query.eq('ist_einnahmen', call.args.ist_einnahmen);
                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                }
                else if (call.name === "get_tasks") {
                  let query = supabase.from('Aufgaben').select('id, name, beschreibung, ist_erledigt, faelligkeitsdatum, erstellungsdatum');
                  if (call.args?.ist_erledigt !== undefined) query = query.eq('ist_erledigt', call.args.ist_erledigt);
                  const limit = Number(call.args?.limit) || 10;
                  const { data, error } = await query.limit(limit);
                  if (error) toolError = error.message;
                  result = error ? { error: error.message } : { data: data || [] };
                }
                else if (call.name === "get_nebenkosten") {
                  let query = supabase.from('Nebenkosten').select('id, nebenkostenart, betrag, berechnungsart, startdatum, enddatum, vorauszahlungs_art, haeuser_id, Haeuser(name)');
                  if (call.args?.haeuser_id) query = query.eq('haeuser_id', call.args.haeuser_id);
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
              
              executedTools.push({ name: call.name, args: call.args, error: toolError });
              sendEvent("tool_result", { name: call.name, status: toolError ? "failed" : "completed", error: toolError });
              
              if (toolError && posthog) {
                 posthog.capture({
                   distinctId: userId,
                   event: '$ai_generation_error',
                   properties: {
                       $ai_trace_id: traceId,
                       $ai_span_name: `mietevo_ai_tool_${call.name}`,
                       error_message: `Database Tool Error: ${toolError}`,
                       tool_args: JSON.stringify(call.args)
                   }
                 });
              }

              responses.push({
                functionResponse: { name: call.name, id: call.id, response: result }
              });
            }

            // Continue stream with tool responses
            await runGeminiInteraction({ message: responses }, depth + 1);
          }
        }

        // Kick off interaction
        await runGeminiInteraction({ message });

        const latency = (Date.now() - startTime) / 1000;

        // 8. Track Generation in PostHog once finished
        if (posthog) {
          posthog.capture({
            distinctId: userId,
            event: '$ai_generation',
            properties: {
              $ai_trace_id: traceId,
              $ai_session_id: sessionId,
              $ai_span_name: 'mietevo_ai_agent',
              $ai_model: 'gemini-3.1-flash-lite-preview',
              $ai_provider: 'google',
              $ai_input: JSON.stringify([{ role: 'system', content: systemInstruction }, { role: 'user', content: message }]),
              $ai_output_choices: JSON.stringify([{ role: 'assistant', content: fullReplyText }]),
              $ai_input_tokens: inputTokens,
              $ai_output_tokens: outputTokens,
              $ai_latency: latency,
              $ai_tools_called: executedTools.map(t => t.name),
              $ai_tool_call_count: executedTools.length,
              executed_tools_json: JSON.stringify(executedTools),
              current_page: pathname,
              user_role: userRole,
            },
          });
          await posthog.shutdown();
        }

        sendEvent("done", {});
      } catch (error: any) {
        console.error("Chat API Realtime Stream Error:", error);
        sendEvent("error", { message: error?.message || "Internal Server Error" });
        if (posthog) {
           posthog.capture({
               distinctId: userId,
               event: '$ai_generation_error',
               properties: {
                   $ai_trace_id: traceId,
                   $ai_span_name: 'mietevo_ai_agent_fatal',
                   error_message: error?.message || String(error)
               }
           });
           await posthog.shutdown();
        }
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
