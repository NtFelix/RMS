"use client";

import { useState, useCallback, useRef } from "react";
import type { LLMStep, StepStatus, StepType } from "@/types/llm-steps";
import { v4 as uuidv4 } from "uuid";

export function useGeminiSteps() {
  const [steps, setSteps] = useState<LLMStep[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const timers = useRef<Record<string, number>>({});
  const stepsRef = useRef<LLMStep[]>([]);

  const addStep = useCallback((type: StepType, label: string, status: StepStatus = "pending", detail?: string) => {
    const id = uuidv4();
    const newStep: LLMStep = { id, type, label, status, detail, startedAt: status === "loading" ? Date.now() : undefined };
    if (status === "loading") timers.current[id] = Date.now();
    
    const nextSteps = [...stepsRef.current, newStep];
    stepsRef.current = nextSteps;
    setSteps(nextSteps);
    return id;
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<LLMStep>) => {
    const nextSteps = stepsRef.current.map(s => {
      if (s.id !== stepId) return s;
      
      const newStatus = updates.status ?? s.status;
      let duration = s.duration;
      
      if (newStatus === "loading" && s.status !== "loading") {
        timers.current[stepId] = Date.now();
        return { ...s, ...updates, startedAt: Date.now() };
      }
      
      if ((newStatus === "done" || newStatus === "error") && s.status === "loading") {
        duration = timers.current[stepId] ? Date.now() - timers.current[stepId] : undefined;
      }
      
      return { ...s, ...updates, duration };
    });
    
    stepsRef.current = nextSteps;
    setSteps(nextSteps);
  }, []);

  const start = useCallback(() => {
    stepsRef.current = [];
    setSteps([]);
    setIsVisible(true);
    addStep("thinking", "Anfrage analysieren", "loading");
  }, [addStep]);

  const setAllDone = useCallback(() => {
    const nextSteps = stepsRef.current.map(s => {
      if (s.status === "loading") {
        const duration = timers.current[s.id] ? Date.now() - timers.current[s.id] : undefined;
        return { ...s, status: "done" as StepStatus, duration };
      }
      return s;
    });
    stepsRef.current = nextSteps;
    setSteps(nextSteps);
  }, []);

  const finish = useCallback((success: boolean) => {
    setAllDone();
    if (!success) {
      const nextSteps = stepsRef.current.map((s, i, arr) => {
        if (i === arr.length - 1) return { ...s, status: "error" as StepStatus };
        return s;
      });
      stepsRef.current = nextSteps;
      setSteps(nextSteps);
    }
  }, [setAllDone]);

  return { steps, stepsRef, isVisible, start, addStep, updateStep, finish, setAllDone };
}
