import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  fetchDocumentationContext, 
  processContextForAI, 
  getArticleContext, 
  getSearchContext 
} from '@/lib/ai-documentation-context';

// Request validation schema
const AIRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.object({
    articles: z.array(z.object({
      id: z.string(),
      titel: z.string(),
      kategorie: z.string().nullable(),
      seiteninhalt: z.string().nullable()
    })).optional(),
    categories: z.array(z.any()).optional(),
    currentArticleId: z.string().optional()
  }).optional(),
  contextOptions: z.object({
    useDocumentationContext: z.boolean().default(true),
    maxArticles: z.number().min(1).max(50).default(10),
    maxContentLength: z.number().min(100).max(2000).default(1000),
    searchQuery: z.string().optional(),
    currentArticleId: z.string().optional()
  }).optional(),
  sessionId: z.string().optional()
});

// Response types
interface AIResponse {
  response: string;
  sessionId: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface APIError {
  error: string;
  code: 'GEMINI_API_ERROR' | 'RATE_LIMIT' | 'INVALID_REQUEST' | 'SERVER_ERROR';
  message: string;
  retryable: boolean;
}

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

// System instruction for Mietfluss assistant
const SYSTEM_INSTRUCTION = `Stelle dir vor du bist ein hilfreicher Assistent der für Mietfluss arbeitet. 
Deine Aufgabe ist den Nutzer zu helfen seine Frage zu dem Programm zu beantworten. 
Das Programm zu dem du fragen beantworten sollst ist Mietfluss, ein 
Immobilienverwaltungsprogramm das Benutzern ermöglicht einfach ihre Immobilien 
zu verwalten, indem Nebenkosten/Betriebskostenabrechnungen vereinfach werden 
und viele weitere Funktionen.

Wenn du Dokumentationskontext erhältst, nutze diesen um präzise und hilfreiche Antworten zu geben.
Antworte immer auf Deutsch und sei freundlich und professionell.`;

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          code: 'SERVER_ERROR',
          message: 'Der AI-Service ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.',
          retryable: true
        } as APIError,
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = AIRequestSchema.parse(body);
    
    const { message, context, contextOptions, sessionId } = validatedData;

    // Generate session ID if not provided
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare context for AI
    let contextText = '';
    let finalContext = context;

    // Fetch documentation context if requested and not provided
    if (contextOptions?.useDocumentationContext !== false && (!context?.articles || context.articles.length === 0)) {
      try {
        let documentationContext;
        
        // Determine which context to fetch based on options
        if (contextOptions?.currentArticleId) {
          documentationContext = await getArticleContext(contextOptions.currentArticleId, true);
        } else if (contextOptions?.searchQuery) {
          documentationContext = await getSearchContext(contextOptions.searchQuery, contextOptions.maxArticles);
        } else {
          // Use the user message as search query to get relevant context
          documentationContext = await fetchDocumentationContext({
            maxArticles: contextOptions?.maxArticles || 10,
            maxContentLength: contextOptions?.maxContentLength || 1000,
            searchQuery: message,
            includeCategories: true
          });
        }

        // Process context for AI
        const aiContext = processContextForAI(documentationContext, message);
        finalContext = aiContext;
        
        console.log(`Fetched ${documentationContext.articles.length} articles for AI context`);
      } catch (error) {
        console.error('Error fetching documentation context:', error);
        // Continue without context if fetching fails
      }
    }

    // Build context text for AI prompt
    if (finalContext?.articles && finalContext.articles.length > 0) {
      contextText = '\n\nDokumentationskontext:\n';
      finalContext.articles.forEach(article => {
        if (article.seiteninhalt) {
          contextText += `\n**${article.titel}** (Kategorie: ${article.kategorie || 'Allgemein'}):\n${article.seiteninhalt}\n`;
        }
      });
      
      // Add category information if available
      if (finalContext.categories && finalContext.categories.length > 0) {
        contextText += '\n\nVerfügbare Kategorien:\n';
        finalContext.categories.forEach(category => {
          contextText += `- ${category.name} (${category.articleCount} Artikel)\n`;
        });
      }
    }

    // Prepare the full prompt
    const fullPrompt = `${message}${contextText}`;

    // Generate response with streaming using the models API
    const result = await genAI.models.generateContentStream({
      model: 'gemini-2.0-flash-exp',
      contents: [{
        role: 'user',
        parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n${fullPrompt}` }]
      }]
    });
    
    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          
          for await (const chunk of result) {
            const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (chunkText) {
              fullResponse += chunkText;
            
              // Send chunk to client
              const data = JSON.stringify({
                type: 'chunk',
                content: chunkText,
                sessionId: currentSessionId
              });
              
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          
          // Send final response with metadata
          const finalData = JSON.stringify({
            type: 'complete',
            content: fullResponse,
            sessionId: currentSessionId,
            usage: {
              inputTokens: 0, // Gemini doesn't provide token counts in streaming
              outputTokens: 0
            }
          });
          
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error('Streaming error:', error);
          
          const errorData = JSON.stringify({
            type: 'error',
            error: 'Fehler beim Generieren der Antwort',
            code: 'GEMINI_API_ERROR',
            retryable: true
          });
          
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('AI Assistant API Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          code: 'INVALID_REQUEST',
          message: 'Die Anfrage ist ungültig. Bitte überprüfen Sie Ihre Eingabe.',
          retryable: false
        } as APIError,
        { status: 400 }
      );
    }

    // Handle Gemini API specific errors
    if (error instanceof Error) {
      // Rate limiting
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT',
            message: 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
            retryable: true
          } as APIError,
          { status: 429 }
        );
      }

      // API key issues
      if (error.message.includes('API key') || error.message.includes('authentication')) {
        return NextResponse.json(
          {
            error: 'Authentication failed',
            code: 'GEMINI_API_ERROR',
            message: 'Der AI-Service ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.',
            retryable: true
          } as APIError,
          { status: 503 }
        );
      }

      // Network or timeout errors
      if (error.message.includes('timeout') || error.message.includes('network')) {
        return NextResponse.json(
          {
            error: 'Network error',
            code: 'GEMINI_API_ERROR',
            message: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
            retryable: true
          } as APIError,
          { status: 503 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'SERVER_ERROR',
        message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        retryable: true
      } as APIError,
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}