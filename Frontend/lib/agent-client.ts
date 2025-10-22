/**
 * Agent Client - Frontend API client for SSE streaming
 *
 * Handles communication with the Bedrock AgentCore backend.
 */

import { config } from "@/lib/config";
import { normalizeRawEvent, type AgentStreamEvent } from "@/lib/agent-events";

export type StreamEvent = AgentStreamEvent;

interface ChatRequest {
  message: string;
  sessionId: string;
  phoneNumber: string;
}

/**
 * Stream chat responses from the backend agent
 *
 * @param request - Chat request with message, sessionId, and phoneNumber
 * @returns AsyncGenerator of stream events
 */
export async function* streamChatResponse(
  request: ChatRequest
): AsyncGenerator<StreamEvent, void, unknown> {
  try {
    if (!config.agentProxyUrl) {
      throw new Error(
        "Agent proxy endpoint is not configured. Set NEXT_PUBLIC_AGENT_PROXY_URL."
      );
    }

    const response = await fetch(config.agentProxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        runtimeSessionId: request.sessionId,
        payload: {
          prompt: request.message,
          session_id: request.sessionId,
          phone_number: request.phoneNumber,
        },
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode chunk
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const eventBlock of events) {
        const dataLines = eventBlock
          .split("\n")
          .filter((line) => line.startsWith("data:"));

        for (const dataLine of dataLines) {
          const jsonPayload = dataLine.slice(5).trim();
          if (!jsonPayload) {
            continue;
          }

          try {
            const raw = JSON.parse(jsonPayload);
            const normalizedEvents = normalizeRawEvent(raw);

            for (const normalized of normalizedEvents) {
              console.debug("[agent-client] SSE event", normalized);
              yield normalized;
            }
          } catch (parseError) {
            console.error(
              "Failed to parse SSE event:",
              parseError,
              jsonPayload
            );
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const dataLines = buffer
        .split("\n")
        .filter((line) => line.startsWith("data:"));

      for (const dataLine of dataLines) {
        const jsonPayload = dataLine.slice(5).trim();
        if (!jsonPayload) {
          continue;
        }

        try {
          const raw = JSON.parse(jsonPayload);
          const normalizedEvents = normalizeRawEvent(raw);

          for (const normalized of normalizedEvents) {
            yield normalized;
          }
        } catch (parseError) {
          console.error("Failed to parse final SSE event:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Error in streamChatResponse:", error);

    // Yield error event
    yield {
      type: "error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Simple non-streaming chat function for compatibility
 * Returns only the final response text
 *
 * @param request - Chat request
 * @returns Final response text
 */
export async function sendChatMessage(request: ChatRequest): Promise<string> {
  let finalResponse = "";

  for await (const event of streamChatResponse(request)) {
    if (event.type === "response" || event.type === "final") {
      finalResponse = event.content || "";
    } else if (event.type === "error") {
      throw new Error(event.message || "Unknown error");
    }
  }

  return finalResponse;
}
