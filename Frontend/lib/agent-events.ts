export type AgentStreamEvent =
  | { type: "response"; content: string }
  | { type: "final"; content: string }
  | { type: "tool_status"; icon: string; message: string }
  | { type: "tool_result"; content: string }
  | { type: "error"; message: string };

function extractIconAndMessage(thinking: string): {
  icon: string;
  message: string;
} {
  const trimmed = thinking.trim();
  if (!trimmed) {
    return { icon: "💡", message: "" };
  }

  const emojiRegex = /^([\p{Emoji}\p{Extended_Pictographic}]+)([\s\S]*)$/u;
  const emojiMatch = trimmed.match(emojiRegex);
  if (emojiMatch) {
    const iconRaw = emojiMatch[1] || "";
    const messageRaw = emojiMatch[2] || "";
    const icon = iconRaw.trim() || "💡";
    const message = messageRaw.trimStart();
    return { icon, message };
  }

  return { icon: "💡", message: trimmed };
}

function normalizeToolStatusMessage(
  icon: string,
  message: string,
  fallback: string
): string {
  const base = message || fallback.trim();

  if (icon === "🔍") {
    return "Searching";
  }

  return base;
}

export function normalizeRawEvent(rawEvent: unknown): AgentStreamEvent[] {
  if (typeof rawEvent !== "object" || rawEvent === null) {
    console.warn("[AgentEvents] Skipping non-object stream event", rawEvent);
    return [];
  }

  const event = rawEvent as Record<string, unknown>;
  const normalized: AgentStreamEvent[] = [];

  if (typeof event.response === "string") {
    normalized.push({ type: "response", content: event.response });
  }

  if (typeof event.final_result === "string") {
    normalized.push({ type: "final", content: event.final_result });
  }

  if (typeof event.thinking === "string") {
    const { icon, message } = extractIconAndMessage(event.thinking);
    if (icon === "🔍") {
      normalized.push({
        type: "tool_status",
        icon,
        message: normalizeToolStatusMessage(icon, message, event.thinking),
      });
    }
  }

  if (
    typeof event.tool_status === "object" &&
    event.tool_status !== null &&
    typeof (event.tool_status as Record<string, unknown>).icon === "string" &&
    typeof (event.tool_status as Record<string, unknown>).message === "string"
  ) {
    const status = event.tool_status as { icon: string; message: string };
    if (status.icon === "🔍") {
      normalized.push({
        type: "tool_status",
        icon: status.icon,
        message: normalizeToolStatusMessage(
          status.icon,
          status.message,
          status.message
        ),
      });
    }
  }

  if (typeof event.tool_result === "string") {
    normalized.push({ type: "tool_result", content: event.tool_result });
  }

  if (typeof event.error === "string") {
    normalized.push({ type: "error", message: event.error });
  }

  if (normalized.length === 0) {
    console.warn("[AgentEvents] Unhandled stream event format", event);
  }

  return normalized;
}
