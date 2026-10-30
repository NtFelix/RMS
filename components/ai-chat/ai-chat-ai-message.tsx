"use client"

import React from "react";
import Image from "next/image";
import { LOGO_URL } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PostHogFeedback } from "./ai-chat-posthog-feedback";
import { IntelligenceInsight } from "./ai-chat-intelligence-insight";
import type { LLMStep, ToolCallRecord } from '@/types/llm-steps';

export function AIMessageCard({
  content,
  traceId,
  currentVersionIndex,
  totalVersions,
  steps,
  toolCalls,
  isActive,
  isLoading,
  liveSteps,
  onRegenerate,
  onVersionChange,
}: {
  content: string;
  traceId?: string;
  currentVersionIndex?: number;
  totalVersions?: number;
  steps?: LLMStep[];
  toolCalls?: ToolCallRecord[];
  isActive: boolean;
  isLoading: boolean;
  liveSteps: LLMStep[];
  onRegenerate: () => void;
  onVersionChange: (idx: number) => void;
}) {
  return (
    <div className="w-full space-y-4 group">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center border border-primary/20 shadow-sm overflow-hidden p-[2px] transition-transform group-hover:scale-105 duration-300">
            <Image src={LOGO_URL} alt="AI" width={20} height={20} className="object-contain" />
          </div>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] opacity-70">Mietevo AI</span>
        </div>
      </div>
       
      {((isActive && isLoading) || (toolCalls && toolCalls.length > 0) || (steps && steps.length > 0)) && (
        <IntelligenceInsight
          steps={isActive && isLoading ? liveSteps : (steps || [])}
          isLoading={isActive && isLoading}
          toolCalls={isActive && isLoading ? undefined : toolCalls}
        />
      )}

      <div className="prose prose-sm dark:prose-invert w-full max-w-full overflow-hidden px-1 text-[15px] leading-relaxed text-foreground/90 font-medium">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: (props) => (
              <div className="overflow-x-auto my-4 rounded-xl border border-border/50 bg-background/50 shadow-sm">
                <table className="min-w-full text-sm border-collapse" {...props} />
              </div>
            ),
            thead: (props) => <thead className="bg-muted/50 text-left" {...props} />,
            th: (props) => <th className="px-4 py-2.5 font-semibold text-foreground/80 border-b border-border/60" {...props} />,
            td: (props) => <td className="px-4 py-2.5 border-b border-border/40 whitespace-nowrap text-foreground/70" {...props} />,
            tr: (props) => <tr className="hover:bg-muted/5 transition-colors" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      
      <PostHogFeedback
        traceId={traceId}
        content={content}
        onRegenerate={onRegenerate}
        currentVersionIndex={currentVersionIndex}
        totalVersions={totalVersions}
        onVersionChange={onVersionChange}
      />
      
      <div className="h-px w-full bg-gradient-to-r from-border/50 via-border/10 to-transparent my-6 opacity-30" />
    </div>
  );
}
