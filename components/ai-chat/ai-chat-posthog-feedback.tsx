"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

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
  const [pendingRating, setPendingRating] = useState<'up' | 'down' | null>(null);

  if (!traceId) return null;

  const sendFeedback = async () => {
    const rating = pendingRating;
    if (!rating || sending || response) return;
    setSending(true);

    try {
      const res = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traceId,
          rating,
          text: feedbackText || undefined,
          submissionId,
        }),
      });

      if (res.ok) {
        setResponse(rating);
        setPendingRating(null);
        setFeedbackText('');
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

  const openDialog = (rating: 'up' | 'down') => {
    if (response || sending) return;
    setPendingRating(rating);
    setFeedbackText('');
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
          onClick={() => openDialog('up')}
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
          onClick={() => openDialog('down')}
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

      <Dialog open={!!pendingRating} onOpenChange={(open) => { if (!open) setPendingRating(null); }}>
        <DialogContent className="sm:max-w-md gap-3 p-4">
          <DialogClose className="absolute right-3 top-3 rounded-sm opacity-70 hover:opacity-100 transition-opacity">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="p-0">
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
              {pendingRating === 'up' ? (
                <><ThumbsUp className="size-4 text-green-500" /> Hilfreich</>
              ) : (
                <><ThumbsDown className="size-4 text-red-500" /> Nicht hilfreich</>
              )}
            </DialogTitle>
          </DialogHeader>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={pendingRating === 'down' ? 'Was ging besser?' : 'Weiteres Feedback (optional)'}
            className="w-full h-20 px-3 py-2 text-xs rounded-lg border border-border/30 bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors resize-none"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={sendFeedback}
              disabled={sending}
              className="h-8 px-3 text-xs"
            >
              {sending ? 'Wird gesendet...' : 'Absenden'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
