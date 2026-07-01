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
