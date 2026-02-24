/**
 * PostHog LLM Analytics Tracking
 * Implements PostHog's LLM tracking format for AI assistant interactions
 * Based on: https://posthog.com/docs/ai-engineering/observability
 */

import posthog from 'posthog-js';

export interface LLMGeneration {
  id: string;
  model: string;
  provider: string;
  input: string | any[];
  output?: string | any[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  latency?: number;
  http_status?: number;
  base_url?: string;
  is_error?: boolean;
  error?: string;
  trace_id?: string;
  start_time: string;
  end_time?: string;
  user_id?: string;
  session_id?: string;
}

export interface LLMTrace {
  id: string;
  span_name: string;
  span_id?: string;
  input_state?: any;
  output_state?: any;
  latency?: number;
  error?: string;
  is_error?: boolean;
  start_time: string;
  end_time?: string;
  user_id?: string;
  session_id?: string;
}

/**
 * PostHog LLM Tracker class
 */
export class PostHogLLMTracker {
  private static instance: PostHogLLMTracker;

  private constructor() { }

  static getInstance(): PostHogLLMTracker {
    if (!PostHogLLMTracker.instance) {
      PostHogLLMTracker.instance = new PostHogLLMTracker();
    }
    return PostHogLLMTracker.instance;
  }

  /**
   * Track LLM Generation (individual AI request/response)
   */
  trackGeneration(generation: LLMGeneration): void {
    if (!this.isPostHogAvailable()) return;

    try {
      posthog.capture('$ai_generation', {
        $ai_trace_id: generation.trace_id || generation.id,
        $ai_model: generation.model,
        $ai_provider: generation.provider,
        $ai_input: generation.input,
        $ai_input_tokens: generation.usage?.input_tokens,
        $ai_output_choices: generation.output,
        $ai_output_tokens: generation.usage?.output_tokens,
        $ai_latency: generation.latency,
        $ai_http_status: generation.http_status,
        $ai_base_url: generation.base_url,
        $ai_is_error: generation.is_error || false,
        $ai_error: generation.error,

        // Additional Mietevo-specific properties
        application: 'mietevo',
        feature: 'ai_assistant',
        timestamp: new Date().toISOString()
      });

      console.log('📊 PostHog LLM Generation tracked:', generation.id);
    } catch (error) {
      console.error('Error tracking LLM generation:', error);
    }
  }

  /**
   * Track LLM Trace (conversation or session)
   */
  trackTrace(trace: LLMTrace): void {
    if (!this.isPostHogAvailable()) return;

    try {
      posthog.capture('$ai_trace', {
        $ai_trace_id: trace.id,
        $ai_input_state: trace.input_state,
        $ai_output_state: trace.output_state,
        $ai_latency: trace.latency,
        $ai_span_name: trace.span_name,
        $ai_span_id: trace.span_id || trace.id,
        $ai_error: trace.error,
        $ai_is_error: trace.is_error || false,

        // Additional Mietevo-specific properties
        application: 'mietevo',
        feature: 'ai_assistant',
        timestamp: new Date().toISOString()
      });

      console.log('📊 PostHog LLM Trace tracked:', trace.id);
    } catch (error) {
      console.error('Error tracking LLM trace:', error);
    }
  }

  /**
   * Start a new generation tracking
   */
  startGeneration(params: {
    id: string;
    model: string;
    provider: string;
    input: string | any[];
    sessionId?: string;
    userId?: string;
    traceId?: string;
  }): LLMGeneration {
    const generation: LLMGeneration = {
      id: params.id,
      model: params.model,
      provider: params.provider,
      input: params.input,
      start_time: new Date().toISOString(),
      session_id: params.sessionId,
      user_id: params.userId,
      trace_id: params.traceId || params.id
    };

    // Track the start - DISABLED to prevent duplicate generation events
    // this.trackGeneration(generation);

    return generation;
  }

  /**
   * Complete a generation tracking
   */
  completeGeneration(
    generation: LLMGeneration,
    params: {
      output?: string | any[];
      usage?: LLMGeneration['usage'];
      latency?: number;
      status?: 'success' | 'error';
      error?: string;
      httpStatus?: number;
    }
  ): void {
    const completedGeneration: LLMGeneration = {
      ...generation,
      output: params.output,
      usage: params.usage,
      latency: params.latency,
      end_time: new Date().toISOString(),
      is_error: params.status === 'error',
      error: params.error,
      http_status: params.httpStatus || (params.status === 'error' ? 500 : 200)
    };

    this.trackGeneration(completedGeneration);
  }

  /**
   * Start a new trace tracking
   */
  startTrace(params: {
    id: string;
    span_name: string;
    input_state?: any;
    sessionId?: string;
    userId?: string;
  }): LLMTrace {
    const trace: LLMTrace = {
      id: params.id,
      span_name: params.span_name,
      span_id: params.id,
      input_state: params.input_state,
      start_time: new Date().toISOString(),
      session_id: params.sessionId,
      user_id: params.userId
    };

    this.trackTrace(trace);

    return trace;
  }

  /**
   * Complete a trace tracking
   */
  completeTrace(
    trace: LLMTrace,
    params: {
      output_state?: any;
      latency?: number;
      status?: 'success' | 'error';
      error?: string;
    }
  ): void {
    const completedTrace: LLMTrace = {
      ...trace,
      output_state: params.output_state,
      latency: params.latency,
      end_time: new Date().toISOString(),
      is_error: params.status === 'error',
      error: params.error
    };

    this.trackTrace(completedTrace);
  }

  /**
   * Track streaming generation updates
   */
  trackStreamingUpdate(params: {
    generationId: string;
    chunkContent: string;
    chunkIndex: number;
    sessionId?: string;
  }): void {
    if (!this.isPostHogAvailable()) return;

    try {
      posthog.capture('$ai_generation_chunk', {
        $ai_generation_id: params.generationId,
        $ai_chunk_content: params.chunkContent,
        $ai_chunk_index: params.chunkIndex,
        $ai_session_id: params.sessionId,

        // Additional properties
        application: 'mietevo',
        feature: 'ai_assistant_streaming',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking streaming update:', error);
    }
  }

  /**
   * Check if PostHog is available and opted in
   */
  private isPostHogAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    if (!posthog) return false;
    if (!posthog.has_opted_in_capturing?.()) return false;

    return true;
  }
}

/**
 * Convenience functions for easy usage
 */
export const llmTracker = PostHogLLMTracker.getInstance();

export function trackAIGeneration(generation: LLMGeneration): void {
  llmTracker.trackGeneration(generation);
}

export function trackAITrace(trace: LLMTrace): void {
  llmTracker.trackTrace(trace);
}

export function startAIGeneration(params: Parameters<typeof llmTracker.startGeneration>[0]): LLMGeneration {
  return llmTracker.startGeneration(params);
}

export function completeAIGeneration(
  generation: LLMGeneration,
  params: Parameters<typeof llmTracker.completeGeneration>[1]
): void {
  llmTracker.completeGeneration(generation, params);
}

export function startAITrace(params: Parameters<typeof llmTracker.startTrace>[0]): LLMTrace {
  return llmTracker.startTrace(params);
}

export function completeAITrace(
  trace: LLMTrace,
  params: Parameters<typeof llmTracker.completeTrace>[1]
): void {
  llmTracker.completeTrace(trace, params);
}

export function trackStreamingUpdate(params: Parameters<typeof llmTracker.trackStreamingUpdate>[0]): void {
  llmTracker.trackStreamingUpdate(params);
}