"use client";

import { useState, useCallback, useRef } from "react";
import type { LLMStep, StepStatus } from "@/types/llm-steps";

const INITIAL_STEPS: LLMStep[] = [
  { id: "thinking",   type: "thinking",   label: "Anfrage analysieren",   status: "pending" },
  { id: "tool_call",  type: "tool_call",  label: "Datenbank abfragen",    status: "pending" },
  { id: "generating", type: "generating", label: "Antwort formulieren",   status: "pending" },
];

export function useGeminiSteps() {
  const [steps, setSteps] = useState<LLMStep[]>(INITIAL_STEPS);
  const [isVisible, setIsVisible] = useState(false);
  const timers = useRef<Record<string, number>>({});

  /** Advance a step to loading or done */
  const advanceStep = useCallback((stepId: string, status: StepStatus, detail?: string) => {
    setSteps(prev => prev.map(s => {
      if (s.id !== stepId) return s;
      if (status === "loading") {
        timers.current[stepId] = Date.now();
        return { ...s, status: "loading", detail, startedAt: Date.now() };
      }
      if (status === "done" || status === "error") {
        const duration = timers.current[stepId]
          ? Date.now() - timers.current[stepId]
          : undefined;
        return { ...s, status, detail: detail ?? s.detail, duration };
      }
      return s;
    }));
  }, []);

  /** Call when the fetch starts */
  const start = useCallback(() => {
    setSteps(INITIAL_STEPS.map(s => ({ ...s })));
    setIsVisible(true);
    // Kick off the thinking step immediately
    setTimeout(() => advanceStep("thinking", "loading"), 50);
  }, [advanceStep]);

  /** Call when tool calls start executing */
  const onToolsStarted = useCallback((toolNames: string[]) => {
    advanceStep("thinking", "done");
    const detail = toolNames.length
      ? toolNames.map(n => `${n}()`).join(", ")
      : undefined;
    advanceStep("tool_call", "loading", detail);
  }, [advanceStep]);

  /** Call when tool calls finish */
  const onToolsDone = useCallback((hadTools: boolean) => {
    advanceStep("tool_call", hadTools ? "done" : "done");
    advanceStep("generating", "loading");
  }, [advanceStep]);

  /** Call when the full API response arrives */
  const finish = useCallback((success: boolean) => {
    setSteps(prev => prev.map(s =>
      s.status !== "done" && s.status !== "error"
        ? { ...s, status: success ? "done" : "error",
            duration: s.startedAt ? Date.now() - s.startedAt : undefined }
        : s
    ));
  }, []);

  return { steps, isVisible, start, finish, onToolsStarted, onToolsDone };
}
