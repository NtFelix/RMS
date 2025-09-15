import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import posthog from 'posthog-js';
import { createClient } from '@/utils/supabase/server';
import { 
  fetchDocumentationContext, 
  processContextForAI, 
  getArticleContext, 
  getSearchContext,
  categorizeAIError
} from '@/lib/ai-documentation-context';
import { getAICache } from '@/lib/ai-cache';

export const runtime = 'edge';

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
  code: 'GEMINI_API_ERROR' | 'RATE_LIMIT' | 'INVALID_REQUEST' | 'SERVER_ERROR' | 'TIMEOUT_ERROR' | 'NETWORK_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
  details?: {
    attemptCount?: number;
    maxAttempts?: number;
    nextRetryIn?: number;
  };
}

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  maxRequestsPerSession: number;
  sessionWindowMs: number;
}

interface RateLimitData {
  count: number;
  resetTime: number;
  sessions: Map<string, { count: number; resetTime: number }>;
}

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 30, // Max requests per IP per minute
  maxRequestsPerSession: 10, // Max requests per session per minute
  sessionWindowMs: 60 * 1000, // Session window (1 minute)
};

// In-memory rate limiting store (in production, consider Redis)
const rateLimitStore = new Map<string, RateLimitData>();

// Retry configuration for internal operations
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
};

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

// Initialize PostHog for Edge Runtime
let posthogClient: typeof posthog | null = null;

if (process.env.POSTHOG_API_KEY) {
  posthogClient = posthog;
  posthogClient.init(process.env.POSTHOG_API_KEY, {
    api_host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
    person_profiles: 'never', // For server-side usage
    capture_pageview: false,
    capture_pageleave: false,
  });
}

// Rate limiting functions
function checkRateLimit(clientId: string, sessionId?: string): { allowed: boolean; retryAfter?: number; details?: any } {
  const now = Date.now();
  
  // Check IP-based rate limit
  let clientData = rateLimitStore.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    clientData = {
      count: 0,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
      sessions: new Map()
    };
    rateLimitStore.set(clientId, clientData);
  }
  
  // Clean up expired sessions
  clientData.sessions.forEach((sessionData, sessionKey) => {
    if (now > sessionData.resetTime) {
      clientData.sessions.delete(sessionKey);
    }
  });
  
  // Check IP limit
  if (clientData.count >= RATE_LIMIT_CONFIG.maxRequests) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      details: {
        type: 'ip_limit',
        limit: RATE_LIMIT_CONFIG.maxRequests,
        windowMs: RATE_LIMIT_CONFIG.windowMs,
        resetTime: clientData.resetTime
      }
    };
  }
  
  // Check session limit if sessionId provided
  if (sessionId) {
    let sessionData = clientData.sessions.get(sessionId);
    
    if (!sessionData || now > sessionData.resetTime) {
      sessionData = {
        count: 0,
        resetTime: now + RATE_LIMIT_CONFIG.sessionWindowMs
      };
      clientData.sessions.set(sessionId, sessionData);
    }
    
    if (sessionData.count >= RATE_LIMIT_CONFIG.maxRequestsPerSession) {
      const retryAfter = Math.ceil((sessionData.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        details: {
          type: 'session_limit',
          limit: RATE_LIMIT_CONFIG.maxRequestsPerSession,
          windowMs: RATE_LIMIT_CONFIG.sessionWindowMs,
          resetTime: sessionData.resetTime
        }
      };
    }
    
    // Increment session count
    sessionData.count++;
  }
  
  // Increment IP count
  clientData.count++;
  
  return { allowed: true };
}

// Retry utility with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = RETRY_CONFIG,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (
        lastError.message.includes('API key') ||
        lastError.message.includes('authentication') ||
        lastError.message.includes('invalid') ||
        lastError.message.includes('400')
      ) {
        throw lastError;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === config.maxAttempts - 1) {
        console.error(`${context} failed after ${config.maxAttempts} attempts:`, lastError.message);
        throw lastError;
      }
      
      // Calculate delay with jitter
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      const jitteredDelay = delay + Math.random() * 1000;
      
      console.warn(`${context} attempt ${attempt + 1} failed, retrying in ${Math.round(jitteredDelay)}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError!;
}

// Enhanced error response generator
function createErrorResponse(
  error: Error | string,
  context: {
    sessionId?: string;
    attemptCount?: number;
    clientId?: string;
  } = {}
): { response: NextResponse; errorDetails: any } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();
  
  // Use existing error categorization
  const errorDetails = categorizeAIError(errorMessage, {
    sessionId: context.sessionId || '',
    failureStage: 'api_request',
    additionalData: {
      attempt_count: context.attemptCount || 1,
      client_id: context.clientId || 'unknown'
    }
  });
  
  let apiError: APIError;
  let statusCode: number;
  
  // Enhanced error handling with German messages
  if (errorLower.includes('rate limit') || errorLower.includes('quota') || errorLower.includes('429')) {
    apiError = {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT',
      message: 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
      retryable: true,
      retryAfter: 60,
      details: {
        attemptCount: context.attemptCount,
        maxAttempts: RETRY_CONFIG.maxAttempts,
        nextRetryIn: 60
      }
    };
    statusCode = 429;
  } else if (errorLower.includes('timeout') || errorLower.includes('etimedout')) {
    apiError = {
      error: 'Request timeout',
      code: 'TIMEOUT_ERROR',
      message: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
      retryable: true,
      details: {
        attemptCount: context.attemptCount,
        maxAttempts: RETRY_CONFIG.maxAttempts
      }
    };
    statusCode = 504;
  } else if (errorLower.includes('network') || errorLower.includes('econnreset') || errorLower.includes('fetch')) {
    apiError = {
      error: 'Network error',
      code: 'NETWORK_ERROR',
      message: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      retryable: true,
      details: {
        attemptCount: context.attemptCount,
        maxAttempts: RETRY_CONFIG.maxAttempts
      }
    };
    statusCode = 503;
  } else if (errorLower.includes('api key') || errorLower.includes('authentication')) {
    apiError = {
      error: 'Authentication failed',
      code: 'GEMINI_API_ERROR',
      message: 'Der AI-Service ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.',
      retryable: false
    };
    statusCode = 503;
  } else if (errorLower.includes('invalid') || errorLower.includes('400')) {
    apiError = {
      error: 'Invalid request',
      code: 'INVALID_REQUEST',
      message: 'Die Anfrage ist ungültig. Bitte überprüfen Sie Ihre Eingabe.',
      retryable: false
    };
    statusCode = 400;
  } else {
    apiError = {
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
      retryable: true,
      details: {
        attemptCount: context.attemptCount,
        maxAttempts: RETRY_CONFIG.maxAttempts
      }
    };
    statusCode = 500;
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (apiError.retryAfter) {
    headers['Retry-After'] = apiError.retryAfter.toString();
  }
  
  if (apiError.code === 'RATE_LIMIT') {
    headers['X-RateLimit-Limit'] = RATE_LIMIT_CONFIG.maxRequests.toString();
    headers['X-RateLimit-Remaining'] = '0';
    headers['X-RateLimit-Reset'] = Math.ceil((Date.now() + RATE_LIMIT_CONFIG.windowMs) / 1000).toString();
  }
  
  return {
    response: NextResponse.json(apiError, { status: statusCode, headers }),
    errorDetails
  };
}

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
  const requestStartTime = Date.now();
  let currentSessionId = '';
  let clientId = '';
  let validatedData: any = null;
  let userIdentifier = 'anonymous'; // Default fallback
  let traceId = '';
  
  // Track server-side performance metrics
  const serverPerformanceStart = performance.now();
  
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      const { response } = createErrorResponse('API key not configured', {});
      return response;
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      const { response } = createErrorResponse('Invalid JSON in request body', {
        sessionId: currentSessionId,
        clientId: clientId
      });
      return response;
    }
    
    validatedData = AIRequestSchema.parse(body);
    
    const { message, context, contextOptions, sessionId } = validatedData;

    // Generate session ID if not provided - include user ID for uniqueness
    currentSessionId = sessionId || `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // User identification for PostHog events
    userIdentifier = user.email || user.id;
    
    // Generate unique trace ID for this AI generation
    traceId = `trace_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get client identifier for rate limiting
    clientId = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check rate limits
    const rateLimitResult = checkRateLimit(clientId, currentSessionId);
    if (!rateLimitResult.allowed) {
      const isSessionLimit = rateLimitResult.details?.type === 'session_limit';
      const limitType = isSessionLimit ? 'Sitzung' : 'IP-Adresse';
      const limit = isSessionLimit ? RATE_LIMIT_CONFIG.maxRequestsPerSession : RATE_LIMIT_CONFIG.maxRequests;
      
      const rateLimitError: APIError = {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        message: `Zu viele Anfragen für diese ${limitType}. Sie können ${limit} Anfragen pro Minute stellen. Bitte warten Sie ${rateLimitResult.retryAfter} Sekunden.`,
        retryable: true,
        retryAfter: rateLimitResult.retryAfter,
        details: {
          nextRetryIn: rateLimitResult.retryAfter
        }
      };

      // Track rate limit event
      if (posthogClient) {
        posthogClient.capture('ai_request_failed', {
          distinct_id: userIdentifier,
          session_id: currentSessionId,
          error_type: 'rate_limit',
          error_code: 'RATE_LIMIT',
          limit_type: rateLimitResult.details?.type,
          client_id: clientId,
          timestamp: new Date().toISOString()
        });
      }

      return NextResponse.json(rateLimitError, {
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil((rateLimitResult.details?.resetTime || Date.now() + 60000) / 1000).toString(),
        }
      });
    }

    // Track AI question submitted event (server-side)
    if (posthogClient) {
      posthogClient.capture('ai_question_submitted_server', {
        distinct_id: userIdentifier, // Could be enhanced with user ID if available
        question_length: message.length,
        session_id: currentSessionId,
        has_context: !!(context?.articles && context.articles.length > 0),
        context_articles_count: context?.articles?.length || 0,
        use_documentation_context: contextOptions?.useDocumentationContext !== false,
        client_id: clientId,
        timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

      // Track LLM Generation start (server-side)
      const generationId = `server_gen_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      posthogClient.capture('$ai_generation', {
        distinct_id: userIdentifier,
        $ai_trace_id: traceId,
        $ai_model: 'gemini-2.5-flash-lite',
        $ai_provider: 'google',
        $ai_input: [{ role: 'user', content: message }],
        $ai_base_url: 'https://generativelanguage.googleapis.com',
        application: 'mietfluss',
        feature: 'ai_assistant_server',
        server_side: true,
        has_context: !!(context?.articles && context.articles.length > 0),
        context_articles_count: context?.articles?.length || 0,
        client_id: clientId,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare context for AI with retry logic
    let contextText = '';
    let finalContext = context;

    // Fetch documentation context if requested and not provided
    if (contextOptions?.useDocumentationContext !== false && (!context?.articles || context.articles.length === 0)) {
      try {
        const documentationContext = await retryWithBackoff(async () => {
          // Determine which context to fetch based on options
          if (contextOptions?.currentArticleId) {
            return await getArticleContext(contextOptions.currentArticleId, true);
          } else if (contextOptions?.searchQuery) {
            return await getSearchContext(contextOptions.searchQuery, contextOptions.maxArticles);
          } else {
            // Use the user message as search query to get relevant context
            return await fetchDocumentationContext({
              maxArticles: contextOptions?.maxArticles || 10,
              maxContentLength: contextOptions?.maxContentLength || 1000,
              searchQuery: message,
              includeCategories: true
            });
          }
        }, RETRY_CONFIG, 'documentation context fetch');

        // Process context for AI
        const aiContext = processContextForAI(documentationContext, message);
        finalContext = aiContext;
        
        console.log(`Fetched ${documentationContext.articles.length} articles for AI context`);
      } catch (error) {
        console.error('Error fetching documentation context after retries:', error);
        // Continue without context if fetching fails after retries
        
        // Track context fetch failure
        if (posthogClient) {
          posthogClient.capture('ai_context_fetch_failed', {
            distinct_id: userIdentifier,
            session_id: currentSessionId,
            error_message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Build context text for AI prompt
    if (finalContext?.articles && finalContext.articles.length > 0) {
      contextText = '\n\nDokumentationskontext:\n';
      finalContext.articles.forEach((article: any) => {
        if (article.seiteninhalt) {
          contextText += `\n**${article.titel}** (Kategorie: ${article.kategorie || 'Allgemein'}):\n${article.seiteninhalt}\n`;
        }
      });
      
      // Add category information if available
      if (finalContext.categories && finalContext.categories.length > 0) {
        contextText += '\n\nVerfügbare Kategorien:\n';
        finalContext.categories.forEach((category: any) => {
          contextText += `- ${category.name} (${category.articleCount} Artikel)\n`;
        });
      }
    }

    // Prepare the full prompt
    const fullPrompt = `${message}${contextText}`;

    // Check for cached response
    const aiCache = getAICache();
    const contextHash = finalContext ? aiCache.generateContextHash({
      articles: finalContext.articles || [],
      categories: finalContext.categories || [],
      currentArticleId: finalContext.currentArticleId
    }) : 'no-context';

    const cachedResponse = aiCache.getCachedResponse(message, contextHash);
    if (cachedResponse) {
      console.log('Using cached AI response');
      
      // Track cache hit
      if (posthogClient) {
        posthogClient.capture('ai_response_cache_hit', {
          distinct_id: userIdentifier,
          session_id: currentSessionId,
          question_length: message.length,
          context_hash: contextHash,
          timestamp: new Date().toISOString()
        });
      }

      // Return cached response as streaming
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send cached response as chunks to simulate streaming
          const chunks = cachedResponse.match(/.{1,50}/g) || [cachedResponse];
          
          let chunkIndex = 0;
          const sendNextChunk = () => {
            if (chunkIndex < chunks.length) {
              const chunk = chunks[chunkIndex];
              const data = JSON.stringify({
                type: 'chunk',
                content: chunk,
                sessionId: currentSessionId
              });
              
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              chunkIndex++;
              
              // Small delay to simulate streaming
              setTimeout(sendNextChunk, 50);
            } else {
              // Send final response
              const finalData = JSON.stringify({
                type: 'complete',
                content: cachedResponse,
                sessionId: currentSessionId,
                usage: {
                  inputTokens: 0,
                  outputTokens: 0
                }
              });
              
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
              controller.close();
            }
          };
          
          sendNextChunk();
        }
      });

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
    }

    // Generate response with streaming using the models API with retry logic
    const result = await retryWithBackoff(async () => {
      return await genAI.models.generateContentStream({
        model: 'gemini-2.5-flash-lite',
        config: {
          temperature: 1.1,
          thinkingConfig: {
            thinkingBudget: 0,
          },
          systemInstruction: [{
            text: SYSTEM_INSTRUCTION
          }],
        },
        contents: [{
          role: 'user',
          parts: [{ text: fullPrompt }]
        }]
      });
    }, {
      ...RETRY_CONFIG,
      maxAttempts: 2, // Reduce attempts for streaming to avoid long delays
    }, 'Gemini API streaming request');
    
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
          
          // Cache the response
          const responseTime = Date.now() - requestStartTime;
          aiCache.cacheResponse(
            message,
            fullResponse,
            contextHash,
            currentSessionId,
            responseTime
          );

          // Track successful AI response (server-side) with enhanced performance metrics
          if (posthogClient) {
            const serverProcessingTime = performance.now() - serverPerformanceStart;
            
            posthogClient.capture('ai_response_generated_server', {
              distinct_id: userIdentifier,
              response_time_ms: responseTime,
              server_processing_time_ms: serverProcessingTime,
              session_id: currentSessionId,
              success: true,
              response_length: fullResponse.length,
              response_type: 'streaming',
              cached: false,
              context_hash: contextHash,
              
              // Performance breakdown
              context_processing_time_ms: contextProcessingTime || 0,
              gemini_api_time_ms: responseTime - (contextProcessingTime || 0),
              
              // Resource usage
              memory_usage_estimate_mb: Math.round(fullResponse.length / 1024 / 1024 * 2), // Rough estimate
              
              timestamp: new Date().toISOString()
            });

            // Track LLM Generation completion (server-side)
            posthogClient.capture('$ai_generation', {
              distinct_id: userIdentifier,
              $ai_trace_id: traceId,
              $ai_model: 'gemini-2.5-flash-lite',
              $ai_provider: 'google',
              $ai_input: [{ role: 'user', content: message }],
              $ai_input_tokens: Math.ceil(message.length / 4), // Rough estimate
              $ai_output_choices: [{ role: 'assistant', content: fullResponse }],
              $ai_output_tokens: Math.ceil(fullResponse.length / 4),
              $ai_latency: responseTime / 1000, // Convert to seconds
              $ai_http_status: 200,
              $ai_base_url: 'https://generativelanguage.googleapis.com',
              $ai_is_error: false,
              application: 'mietfluss',
              feature: 'ai_assistant_server',
              server_side: true,
              response_type: 'streaming',
              context_hash: contextHash,
              client_id: clientId,
              timestamp: new Date().toISOString()
            });
            
            // Track detailed server performance metrics
            posthogClient.capture('ai_server_performance_breakdown', {
              distinct_id: userIdentifier,
                session_id: currentSessionId,
                total_request_time_ms: responseTime,
                server_processing_time_ms: serverProcessingTime,
                validation_time_ms: validationTime || 0,
                context_fetch_time_ms: contextProcessingTime || 0,
                gemini_api_time_ms: geminiApiTime || 0,
                response_processing_time_ms: responseProcessingTime || 0,
                
                // Request characteristics
                request_size_bytes: validatedData?.message?.length || 0,
                context_articles_count: finalContext?.articles?.length || 0,
                context_size_bytes: contextText.length,
                response_size_bytes: fullResponse.length,
                
                // Performance category
                performance_category: categorizeServerPerformance(responseTime),
                
                timestamp: new Date().toISOString()
              });
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
          
          // Create enhanced error response for streaming
          const { errorDetails } = createErrorResponse(error instanceof Error ? error : String(error), {
            sessionId: currentSessionId,
            clientId: clientId
          });
          
          // Track streaming error (server-side) with enhanced categorization
          if (posthogClient) {
            const responseTime = Date.now() - requestStartTime;
            
            // Override for streaming-specific error types
            let streamingErrorDetails = { ...errorDetails };
            if (error instanceof Error) {
              if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
                streamingErrorDetails.errorType = 'streaming_timeout';
                streamingErrorDetails.errorCode = 'STREAMING_TIMEOUT';
              } else if (error.message.includes('network') || error.message.includes('ECONNRESET')) {
                streamingErrorDetails.errorType = 'streaming_network_error';
                streamingErrorDetails.errorCode = 'STREAMING_NETWORK_ERROR';
              } else if (error.message.includes('parse') || error.message.includes('JSON')) {
                streamingErrorDetails.errorType = 'streaming_parse_error';
                streamingErrorDetails.errorCode = 'STREAMING_PARSE_ERROR';
                streamingErrorDetails.retryable = false;
              } else {
                streamingErrorDetails.errorType = 'streaming_error';
                streamingErrorDetails.errorCode = 'STREAMING_ERROR';
              }
            }

            // Track the enhanced ai_request_failed event for streaming errors
            posthogClient.capture('ai_request_failed', {
              distinct_id: userIdentifier,
                response_time_ms: responseTime,
                session_id: currentSessionId,
                error_type: streamingErrorDetails.errorType,
                error_code: streamingErrorDetails.errorCode,
                error_message: streamingErrorDetails.errorMessage,
                http_status: 200, // Streaming started successfully but failed during processing
                retryable: streamingErrorDetails.retryable,
                failure_stage: 'streaming_server',
                client_id: clientId,
                timestamp: new Date().toISOString(),
                ...streamingErrorDetails.additionalData
              });

            // Track LLM Generation error (server-side)
            posthogClient.capture('$ai_generation', {
              distinct_id: userIdentifier,
                $ai_trace_id: traceId,
                $ai_model: 'gemini-2.5-flash-lite',
                $ai_provider: 'google',
                $ai_input: [{ role: 'user', content: message }],
                $ai_output_choices: [{ role: 'assistant', content: streamingErrorDetails.errorMessage }],
                $ai_latency: responseTime / 1000,
                $ai_http_status: 500,
                $ai_base_url: 'https://generativelanguage.googleapis.com',
                $ai_is_error: true,
                $ai_error: streamingErrorDetails.errorMessage,
                application: 'mietfluss',
                feature: 'ai_assistant_server',
                server_side: true,
                error_type: streamingErrorDetails.errorType,
                error_code: streamingErrorDetails.errorCode,
                failure_stage: 'streaming_server',
                client_id: clientId,
                timestamp: new Date().toISOString()
              });

            // Also track the legacy event for backward compatibility
            posthogClient.capture('ai_response_generated_server', {
              distinct_id: userIdentifier,
                response_time_ms: responseTime,
                session_id: currentSessionId,
                success: false,
                error_type: streamingErrorDetails.errorType,
                error_message: streamingErrorDetails.errorMessage,
                timestamp: new Date().toISOString()
              });
          }
          
          // Determine appropriate German error message based on error type
          let userMessage = 'Ein Fehler ist beim Generieren der Antwort aufgetreten.';
          let retryable = true;
          
          if (error instanceof Error) {
            const errorLower = error.message.toLowerCase();
            if (errorLower.includes('timeout')) {
              userMessage = 'Die Antwort hat zu lange gedauert. Bitte versuchen Sie es erneut.';
            } else if (errorLower.includes('network') || errorLower.includes('connection')) {
              userMessage = 'Netzwerkfehler beim Generieren der Antwort. Bitte versuchen Sie es erneut.';
            } else if (errorLower.includes('rate limit') || errorLower.includes('quota')) {
              userMessage = 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
            } else if (errorLower.includes('parse') || errorLower.includes('invalid')) {
              userMessage = 'Fehler beim Verarbeiten der Antwort. Bitte versuchen Sie es erneut.';
              retryable = false;
            }
          }
          
          const errorData = JSON.stringify({
            type: 'error',
            error: userMessage,
            code: 'GEMINI_API_ERROR',
            retryable: retryable,
            details: {
              canRetry: retryable,
              errorType: 'streaming_error'
            }
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

    // Create enhanced error response
    const { response, errorDetails } = createErrorResponse(error instanceof Error ? error : String(error), {
      sessionId: currentSessionId,
      clientId: clientId
    });

    // Track API error (server-side) with enhanced error categorization
    if (posthogClient) {
      const responseTime = Date.now() - requestStartTime;
      
      // Special handling for Zod validation errors
      let finalErrorDetails = errorDetails;
      if (error instanceof z.ZodError) {
        finalErrorDetails = {
          ...errorDetails,
          errorType: 'validation_error',
          errorCode: 'INVALID_REQUEST',
          errorMessage: 'Invalid request format',
          httpStatus: 400,
          retryable: false
        };
      }

      // Track the enhanced ai_request_failed event
      posthogClient.capture('ai_request_failed', {
        distinct_id: userIdentifier,
          response_time_ms: responseTime,
          session_id: currentSessionId,
          error_type: finalErrorDetails.errorType,
          error_code: finalErrorDetails.errorCode,
          error_message: finalErrorDetails.errorMessage,
          http_status: finalErrorDetails.httpStatus,
          retryable: finalErrorDetails.retryable,
          failure_stage: finalErrorDetails.failureStage,
          client_id: clientId,
          request_message_length: validatedData?.message?.length || 0,
          has_context: !!(validatedData?.context?.articles && validatedData.context.articles.length > 0),
          context_articles_count: validatedData?.context?.articles?.length || 0,
          user_agent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date().toISOString(),
          ...finalErrorDetails.additionalData
        });

      // Also track the legacy event for backward compatibility
      posthogClient.capture('ai_response_generated_server', {
        distinct_id: userIdentifier,
          response_time_ms: responseTime,
          session_id: currentSessionId,
          success: false,
          error_type: finalErrorDetails.errorType,
          error_message: finalErrorDetails.errorMessage,
          timestamp: new Date().toISOString()
        });
    }

    return response;
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

// Helper function to categorize server performance
function categorizeServerPerformance(responseTime: number): string {
  if (responseTime < 1000) return 'excellent';
  if (responseTime < 2000) return 'good';
  if (responseTime < 5000) return 'acceptable';
  if (responseTime < 10000) return 'poor';
  return 'very_poor';
}

// Performance tracking variables (would be properly implemented with actual timing)
let validationTime = 0;
let contextProcessingTime = 0;
let geminiApiTime = 0;
let responseProcessingTime = 0;