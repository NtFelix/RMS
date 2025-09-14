/**
 * PostHog LLM Analytics Tracking
 * Implements PostHog's LLM tracking format for AI assistant interactions
 * Based on: https://posthog.com/docs/llm-analytics/installation/google
 */

import posthog from 'posthog-js';

export interface LLMGeneration {
  id: string;
  model: string;
  input: string;
  output?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  metadata?: Record<string, any>;
  tags?: string[];
  start_time: string;
  end_time?: string;
  level?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  status_message?: string;
  version?: string;
  parent_run_id?: string;
  user_id?: string;
  session_id?: string;
}

export interface LLMTrace {
  id: string;
  name: string;
  input?: any;
  output?: any;
  metadata?: Record<string, any>;
  tags?: string[];
  start_time: string;
  end_time?: string;
  level?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  status_message?: string;
  version?: string;
  user_id?: string;
  session_id?: string;
}

/**
 * PostHog LLM Tracker class
 */
export class PostHogLLMTracker {
  private static instance: PostHogLLMTracker;
  
  private constructor() {}
  
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
        $ai_generation_id: generation.id,
        $ai_generation_model: generation.model,
        $ai_generation_input: generation.input,
        $ai_generation_output: generation.output,
        $ai_generation_input_tokens: generation.usage?.input_tokens,
        $ai_generation_output_tokens: generation.usage?.output_tokens,
        $ai_generation_total_tokens: generation.usage?.total_tokens,
        $ai_generation_start_time: generation.start_time,
        $ai_generation_end_time: generation.end_time,
        $ai_generation_level: generation.level || 'INFO',
        $ai_generation_status_message: generation.status_message,
        $ai_generation_version: generation.version,
        $ai_generation_parent_run_id: generation.parent_run_id,
        $ai_generation_metadata: generation.metadata,
        $ai_generation_tags: generation.tags,
        $ai_user_id: generation.user_id,
        $ai_session_id: generation.session_id,
        
        // Additional Mietfluss-specific properties
        application: 'mietfluss',
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
        $ai_trace_name: trace.name,
        $ai_trace_input: trace.input,
        $ai_trace_output: trace.output,
        $ai_trace_start_time: trace.start_time,
        $ai_trace_end_time: trace.end_time,
        $ai_trace_level: trace.level || 'INFO',
        $ai_trace_status_message: trace.status_message,
        $ai_trace_version: trace.version,
        $ai_trace_metadata: trace.metadata,
        $ai_trace_tags: trace.tags,
        $ai_user_id: trace.user_id,
        $ai_session_id: trace.session_id,
        
        // Additional Mietfluss-specific properties
        application: 'mietfluss',
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
    input: string;
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): LLMGeneration {
    const generation: LLMGeneration = {
      id: params.id,
      model: params.model,
      input: params.input,
      start_time: new Date().toISOString(),
      session_id: params.sessionId,
      user_id: params.userId,
      metadata: params.metadata,
      tags: params.tags,
      level: 'INFO'
    };

    // Track the start
    this.trackGeneration(generation);
    
    return generation;
  }

  /**
   * Complete a generation tracking
   */
  completeGeneration(
    generation: LLMGeneration,
    params: {
      output?: string;
      usage?: LLMGeneration['usage'];
      status?: 'success' | 'error';
      statusMessage?: string;
    }
  ): void {
    const completedGeneration: LLMGeneration = {
      ...generation,
      output: params.output,
      usage: params.usage,
      end_time: new Date().toISOString(),
      level: params.status === 'error' ? 'ERROR' : 'INFO',
      status_message: params.statusMessage
    };

    this.trackGeneration(completedGeneration);
  }

  /**
   * Start a new trace tracking
   */
  startTrace(params: {
    id: string;
    name: string;
    input?: any;
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): LLMTrace {
    const trace: LLMTrace = {
      id: params.id,
      name: params.name,
      input: params.input,
      start_time: new Date().toISOString(),
      session_id: params.sessionId,
      user_id: params.userId,
      metadata: params.metadata,
      tags: params.tags,
      level: 'INFO'
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
      output?: any;
      status?: 'success' | 'error';
      statusMessage?: string;
    }
  ): void {
    const completedTrace: LLMTrace = {
      ...trace,
      output: params.output,
      end_time: new Date().toISOString(),
      level: params.status === 'error' ? 'ERROR' : 'INFO',
      status_message: params.statusMessage
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
        application: 'mietfluss',
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