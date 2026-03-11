import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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
    const { message, history = [], pathname, sessionId } = body;

    if (!message || !pathname || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3. Setup PostHog Node Client
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
        posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
            host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
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

--- CURRENT CONTEXT ---
${pageContext}`;

    // 6. Create Chat with History & System Prompt
    const chat = client.chats.create({
      model: "gemini-3-flash",
      config: {
        systemInstruction,
      },
      history: history, // Provide past conversation turns
    });

    // 7. Send Message to Gemini
    const aiResponse = await chat.sendMessage({ message });
    const replyText = aiResponse.text;
    const latency = (Date.now() - startTime) / 1000;

    // 8. Track Generation in PostHog
    if (posthog) {
      posthog.capture({
        distinctId: userId,
        event: '$ai_generation',
        properties: {
          $ai_trace_id: traceId,
          $ai_session_id: sessionId,
          $ai_model: 'gemini-3-flash',
          $ai_provider: 'google',
          $ai_input: JSON.stringify([
            { role: 'system', content: systemInstruction },
            { role: 'user', content: message }
          ]),
          $ai_output_choices: JSON.stringify([
            { role: 'assistant', content: replyText }
          ]),
          $ai_input_tokens: aiResponse.usageMetadata?.promptTokenCount || 0,
          $ai_output_tokens: aiResponse.usageMetadata?.candidatesTokenCount || 0,
          $ai_latency: latency,
          current_page: pathname,
          user_role: userRole,
        },
      });
      // Flush events to ensure they are sent before the function exits
      await posthog.shutdown();
    }

    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    
    // Attempt tracking errors
    if (posthog) {
       posthog.capture({
           distinctId: userId,
           event: '$ai_generation_error', // Custom or fallback for error
           properties: {
               $ai_trace_id: traceId,
               error_message: error?.message || String(error)
           }
       });
       await posthog.shutdown();
    }

    return NextResponse.json(
      { error: "Internal Server Error", details: error?.message },
      { status: 500 }
    );
  }
}
