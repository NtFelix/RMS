export type StepStatus = "pending" | "loading" | "done" | "error";
export type StepType = "thinking" | "tool_call" | "generating" | "complete";

export interface LLMStep {
  id: string;
  type: StepType;
  label: string;
  detail?: string;
  status: StepStatus;
  startedAt?: number;
  duration?: number;
}

export interface ToolCallRecord {
  name: string;
  args: any;
  result?: any;
  error?: string | null;
}
