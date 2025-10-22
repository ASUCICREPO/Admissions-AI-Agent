export interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: number;
  toolStatus?: ToolStatus;
}

export interface ToolStatus {
  icon: string;
  message: string;
  state: "running" | "completed";
}

// Stream event types from API
export type StreamEvent =
  | { type: "tool_status"; icon: string; message: string }
  | { type: "response"; content: string }
  | { type: "tool_result"; content: string }
  | { type: "final"; content: string }
  | { type: "error"; message: string };
