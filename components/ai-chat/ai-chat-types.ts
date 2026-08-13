"use client"

import type { LLMStep, ToolCallRecord } from '@/types/llm-steps';

export type MessageVersion = {
  content: string;
  traceId?: string;
  feedback?: 'up' | 'down' | null;
  toolCalls?: ToolCallRecord[];
  steps?: LLMStep[];
};

export type Message = {
  id: string;
  role: "user" | "model";
  content: string;
  attachment?: {
    name: string;
    type: string;
    data: string;
  };
  traceId?: string;
  feedback?: 'up' | 'down' | null;
  toolCalls?: ToolCallRecord[];
  steps?: LLMStep[];
  versions?: MessageVersion[];
  currentVersionIndex?: number;
};

// NDJSON stream protocol shared between server (route.ts) and client (ai-chat-sidebar.tsx)
export type StreamEvent =
  | { type: "step_start"; stepType: string; label: string; detail?: string }
  | { type: "step_done" }
  | { type: "tool_result"; toolCall: ToolCallRecord }
  | { type: "content"; content: string }
  | { type: "final_reply"; reply: string; traceId: string; toolCalls: ToolCallRecord[] }
  | { type: "error"; message: string };
