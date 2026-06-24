"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { useThumbSurvey } from 'posthog-js/react/surveys';
import posthog from "posthog-js";

export function PostHogFeedback({
  traceId,
  content,
  onRegenerate,
  currentVersionIndex,
  totalVersions,
  onVersionChange
}: {
  traceId?: string;
  content?: string;
  onRegenerate?: () => void;
  currentVersionIndex?: number;
  totalVersions?: number;
  onVersionChange?: (index: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  
  const { respond, response, triggerRef } = useThumbSurvey({
    surveyId: '019ce11d-f79c-0000-4959-8e5eb60be080',
    properties: {
      $ai_trace_id: traceId || '',
    },
  })

  if (!traceId) return null;

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    posthog.capture('ai_response_copied', {
      $ai_trace_id: traceId,
    });
  }

  return (
    <div ref={triggerRef} className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/10">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
          War diese Antwort hilfreich?
        </p>
      </div>
      <div className="flex items-center gap-2">
        {content && (
          <div className="flex items-center gap-2">
            
            {/* Version Pagination */}
            {totalVersions !== undefined && totalVersions > 1 && (
              <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-border/20">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentVersionIndex === 0}
                  onClick={() => onVersionChange?.(currentVersionIndex! - 1)}
                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <div className="min-w-[32px] text-center">
                  <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                    {currentVersionIndex! + 1} / {totalVersions}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentVersionIndex === totalVersions - 1}
                  onClick={() => onVersionChange?.(currentVersionIndex! + 1)}
                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              title={copied ? 'Kopiert' : 'Kopieren'}
              className={`h-8 w-8 p-0 rounded-lg flex items-center justify-center transition-all duration-300 border bg-transparent border-border/30 text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-primary ${copied ? 'text-primary border-primary/40 bg-primary/5' : ''}`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            
            {onRegenerate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRegenerate}
                title="Erneut generieren"
                className="h-8 w-8 p-0 rounded-lg flex items-center justify-center transition-all duration-300 border bg-transparent border-border/30 text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
            
            <div className="h-4 w-px bg-border/40 mx-1" />
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => respond('up')}
          title="Hilfreich"
          className={`h-8 w-8 p-0 rounded-lg flex items-center justify-center transition-all duration-300 border ${
            response === 'up' 
              ? 'bg-green-500/10 border-green-500/30 text-green-600' 
              : 'bg-transparent border-border/30 text-muted-foreground hover:bg-green-500/5 hover:border-green-500/20 hover:text-green-500'
          }`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${response === 'up' ? 'fill-current' : ''}`} />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => respond('down')}
          title="Nicht hilfreich"
          className={`h-8 w-8 p-0 rounded-lg flex items-center justify-center transition-all duration-300 border ${
            response === 'down' 
              ? 'bg-red-500/10 border-red-500/30 text-red-600' 
              : 'bg-transparent border-border/30 text-muted-foreground hover:bg-red-500/5 hover:border-red-500/20 hover:text-red-500'
          }`}
        >
          <ThumbsDown className={`w-3.5 h-3.5 ${response === 'down' ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </div>
  )
}
