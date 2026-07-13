"use client"

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { LLMStep, ToolCallRecord } from '@/types/llm-steps';

function ShimmerText({ text }: { text: string }) {
  return (
    <motion.span
      className="text-[13px] font-medium text-muted-foreground/40 bg-clip-text"
      style={{
        backgroundImage: "linear-gradient(90deg, currentColor 0%, rgba(255,255,255,0.6) 50%, currentColor 100%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      } as React.CSSProperties}
      animate={{ backgroundPosition: ["100% 0", "-100% 0"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
    >
      {text}
    </motion.span>
  );
}

export function IntelligenceInsight({
  steps,
  isLoading,
  toolCalls,
}: {
  steps: LLMStep[];
  isLoading: boolean;
  toolCalls?: ToolCallRecord[];
}) {
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);
  const [userExpanded, setUserExpanded] = useState(false);
  const isExpanded = isLoading || userExpanded;

  const hasToolData = toolCalls && toolCalls.length > 0;
  const hasSteps = steps && steps.length > 0;
  
  if (!isLoading && !hasToolData && !hasSteps) return null;

  const visibleSteps = isLoading
    ? steps.filter(s => s.status !== "pending" || steps.find(x => x.status === "loading") === undefined)
    : steps.filter(s => s.status === "done" || s.status === "error");

  return (
    <div className="mb-6 group/insight">
      <button
        type="button"
        onClick={() => setUserExpanded(prev => !prev)}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground/65 hover:text-muted-foreground transition-all duration-200 outline-none"
      >
        <span>Thought</span>
        <motion.span
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </button>

      <div
        className="grid overflow-hidden relative mt-3 ml-1"
        style={{
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          opacity: isExpanded ? 1 : 0,
          transition: 'grid-template-rows 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
        }}
      >
        <div className="min-h-0">
            <div className="absolute left-[3px] top-1 bottom-1 w-[1px] bg-foreground/10" />

            <div className="space-y-4 pt-1 ml-5">
              {visibleSteps.map((step, i) => {
                const isActive = step.status === "loading";
                const isDone   = step.status === "done";
                const isError  = step.status === "error";

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="relative flex flex-col"
                  >
                    <div className="absolute -left-[20px] top-[7px]">
                      {isActive ? (
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-foreground/40 ring-4 ring-background"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full ring-4 ring-background ${
                          isDone ? "bg-foreground/20" : isError ? "bg-red-400/60" : "bg-foreground/10"
                        }`} />
                      )}
                    </div>

                    <div className="min-w-0 pr-4">
                      {step.toolResult ? (
                        <button
                          type="button"
                          onClick={() => setExpandedToolId(expandedToolId === step.id ? null : step.id)}
                          className="flex flex-col items-start text-left w-full group/toolstep outline-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-medium leading-snug transition-colors ${
                              isDone   ? "text-muted-foreground/60 group-hover/toolstep:text-muted-foreground" :
                              isError  ? "text-red-400/70" :
                              "text-muted-foreground/40"
                            }`}>
                              {step.label}
                            </span>
                            <motion.span
                              animate={{ rotate: expandedToolId === step.id ? 0 : -90 }}
                              transition={{ duration: 0.15 }}
                            >
                              <ChevronDown className="w-3 h-3 text-muted-foreground/30" />
                            </motion.span>
                          </div>

                          {step.detail && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[11px] font-medium text-muted-foreground/40 truncate max-w-full italic">
                                {step.detail}
                              </span>
                              {isDone && step.duration && (
                                <span className="text-[10px] font-mono text-muted-foreground/25 shrink-0">
                                  {step.duration}ms
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      ) : (
                        <>
                          {isActive ? (
                            <ShimmerText text={step.label} />
                          ) : (
                            <span className={`text-[13px] font-medium block leading-snug ${
                              isDone   ? "text-muted-foreground/60" :
                              isError  ? "text-red-400/70" :
                              "text-muted-foreground/40"
                            }`}>
                              {step.label}
                            </span>
                          )}

                          {step.detail && step.status !== "pending" && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[11px] font-medium text-muted-foreground/40 truncate max-w-full italic">
                                {step.detail}
                              </span>
                              {isDone && step.duration && (
                                <span className="text-[10px] font-mono text-muted-foreground/25 shrink-0">
                                  {step.duration}ms
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {step.toolResult && (
                        <div
                          className="grid overflow-hidden"
                          style={{
                            gridTemplateRows: expandedToolId === step.id ? '1fr' : '0fr',
                            opacity: expandedToolId === step.id ? 1 : 0,
                            transition: 'grid-template-rows 0.25s ease, opacity 0.2s ease',
                          }}
                        >
                          <div className="min-h-0">
                              <div className="mt-2.5 pb-2 space-y-3 pl-3 border-l border-border/20">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35">Input</span>
                                  <pre className="p-2.5 rounded-lg text-[11px] font-mono bg-muted/20 text-muted-foreground/75 overflow-x-auto overflow-y-auto max-h-[160px] border border-border/5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 [&::-webkit-scrollbar-track]:bg-transparent">
                                    {JSON.stringify(step.toolResult.args, null, 2)}
                                  </pre>
                                </div>

                                {step.toolResult.result && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Output</span>
                                    <pre className="p-2.5 rounded-lg text-[11px] font-mono bg-primary/[0.04] text-foreground/70 overflow-x-auto overflow-y-auto max-h-[220px] border border-primary/10 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25 [&::-webkit-scrollbar-track]:bg-transparent">
                                      {JSON.stringify(step.toolResult.result, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
