"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown, Send } from "lucide-react";

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
  const [response, setResponse] = useState<'up' | 'down' | null>(null);
  const [submissionId] = useState(() => crypto.randomUUID());
  const [feedbackText, setFeedbackText] = useState('');
  const [sending, setSending] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  if (!traceId) return null;

  const sendFeedback = async (rating: 'up' | 'down', text?: string) => {
    if (sending || response) return;
    setSending(true);

    try {
      const res = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traceId, rating, text, submissionId }),
      });

      if (res.ok) {
        setResponse(rating);
        if (rating === 'down' && !text) {
          setShowTextInput(true);
        } else {
          setShowTextInput(false);
        }
      }
    } catch (e) {
      console.error("[Feedback] Failed to send:", e);
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleTextSubmit = () => {
    if (!feedbackText.trim()) return;
    sendFeedback('down', feedbackText.trim());
    setShowTextInput(false);
  }

  return (
    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/10">
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
          onClick={() => sendFeedback('up')}
          disabled={!!response || sending}
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
          onClick={() => sendFeedback('down')}
          disabled={!!response || sending}
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

      {showTextInput && (
        <div className="flex items-center gap-2 mt-1">
          <input
            type="text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="Was ging besser? (optional)"
            className="flex-1 h-8 px-3 text-xs rounded-lg border border-border/30 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors"
            autoFocus
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTextSubmit}
            disabled={!feedbackText.trim()}
            className="h-8 w-8 p-0 rounded-lg flex items-center justify-center border bg-transparent border-border/30 text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
