"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatHeader } from "./chat-header";
import { EmptyState } from "./empty-state";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ScrollButton } from "./scroll-button";
import { streamChatResponse } from "@/lib/agent-client";
import { useStickToBottom } from "@/lib/use-stick-to-bottom";
import type { Message, ToolStatus } from "./types";

export interface FormContext {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  homePhone?: string;
  headquarters: string;
  programType: string;
}

interface NemoChatInterfaceProps {
  onClose?: () => void;
  initialContext?: FormContext;
}

export function NemoChatInterface({
  onClose,
  initialContext,
}: NemoChatInterfaceProps) {
  // Session management - using hardcoded values for testing
  const [sessionId, setSessionId] = useState<string>("");
  const phoneNumber = initialContext?.cellPhone ?? null;

  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [hasPrePopulated, setHasPrePopulated] = useState(false);

  // Streaming state
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scroll management refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // Use stick-to-bottom hook
  const { isAtBottom, scrollToBottom } = useStickToBottom({
    scrollContainerRef,
    scrollBottomRef,
    threshold: 50,
  });

  // Initialize sessionId only on client side to avoid hydration mismatch
  useEffect(() => {
    if (!sessionId) {
      setSessionId(crypto.randomUUID());
    }
  }, []);

  const handleSendMessage = useCallback(
    async (messageOverride?: string, isSystemMessage: boolean = false) => {
      const messageToSend = messageOverride || inputValue;
      if (!messageToSend.trim()) return;

      // Wait for sessionId to be initialized
      if (!sessionId) {
        console.warn("Session not initialized yet, please wait...");
        return;
      }

      if (!phoneNumber) {
        console.warn("Chat attempted without phone number context.");
        setError(
          "We couldn't find your contact details. Please submit the inquiry form again."
        );
        return;
      }

      // Add user message to chat (skip for system messages)
      if (!isSystemMessage) {
        const userMsg: Message = {
          id: crypto.randomUUID(),
          type: "user",
          content: messageToSend,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
      }
      setInputValue("");

      // Reset streaming state
      setIsWaitingForResponse(true);
      setCurrentStreamingMessage("");
      setIsStreaming(false);
      setCurrentTool(null);
      setError(null);

      try {
        // Stream response from backend
        for await (const event of streamChatResponse({
          message: messageToSend,
          sessionId,
          phoneNumber,
        })) {
          if (event.type === "tool_status") {
            // Tool started
            setIsWaitingForResponse(false);
            setCurrentTool({
              icon: event.icon!,
              message: event.message!,
              state: "running",
            });
          } else if (event.type === "response") {
            // Streaming response chunk
            setIsWaitingForResponse(false);
            setIsStreaming(true);
            setCurrentStreamingMessage((prev) => prev + event.content!);
          } else if (event.type === "final") {
            // Final response received
            setIsStreaming(false);
            setIsWaitingForResponse(false);

            // Mark tool as completed if there was one
            if (currentTool) {
              setCurrentTool({ ...currentTool, state: "completed" });
            }

            // Add AI message to history
            const aiMsg: Message = {
              id: crypto.randomUUID(),
              type: "ai",
              content: event.content!,
              timestamp: Date.now(),
              toolStatus: currentTool
                ? { ...currentTool, state: "completed" }
                : undefined,
            };
            setMessages((prev) => [...prev, aiMsg]);

            // Reset streaming state
            setCurrentStreamingMessage("");
            setCurrentTool(null);
          } else if (event.type === "error") {
            // Error occurred
            setIsWaitingForResponse(false);
            setIsStreaming(false);
            setError(event.message!);
            console.error("Chat error:", event.message);
          }
        }
      } catch (err) {
        console.error("Error in chat stream:", err);
        setIsWaitingForResponse(false);
        setIsStreaming(false);
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    },
    [inputValue, sessionId, phoneNumber, currentTool]
  );

  // Auto-send system message with form context when provided
  useEffect(() => {
    if (initialContext && !hasPrePopulated && sessionId) {
      const programTypeLabels: Record<string, string> = {
        undergraduate: "Undergraduate",
        graduate: "Graduate",
        "senior-high": "Senior High School",
        online: "Fully Online",
      };

      const campusLabels: Record<string, string> = {
        manila: "Manila",
        makati: "Makati",
        laguna: "Laguna",
        online: "Online",
      };

      const programLabel =
        programTypeLabels[initialContext.programType] ||
        initialContext.programType;
      const campusLabel =
        campusLabels[initialContext.headquarters] ||
        initialContext.headquarters;

      // Create system message matching backend test pattern
      const systemMessage = `This is a system generated message. A new student has submitted an inquiry form with the following information:
- Name: ${initialContext.firstName} ${initialContext.lastName}
- Email: ${initialContext.email}
- Phone: ${initialContext.cellPhone}
- Campus Interest: ${campusLabel}
- Program Type: ${programLabel}
- Data Authorization: Approved

Please start a friendly, personalized conversation with this student.`;

      setHasPrePopulated(true);

      // Auto-send system message (hidden from UI)
      setTimeout(() => {
        handleSendMessage(systemMessage, true);
      }, 100);
    }
  }, [initialContext, hasPrePopulated, sessionId, handleSendMessage]);

  // Auto-scroll on new messages (only if user was at bottom)
  useEffect(() => {
    if (isAtBottom) {
      // Small delay to ensure DOM has updated
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [messages, currentStreamingMessage, isAtBottom, scrollToBottom]);

  const handleFollowUpClick = (question: string) => {
    setInputValue(question);
    setTimeout(() => handleSendMessage(question), 0);
  };

  const handleRegenerate = (messageId: string) => {
    // Find the message to regenerate and the previous user message
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1) return;

    // Find the previous user message
    let userMessageIndex = messageIndex - 1;
    while (
      userMessageIndex >= 0 &&
      messages[userMessageIndex].type !== "user"
    ) {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) return;

    const userMessage = messages[userMessageIndex].content;
    const userMessageId = messages[userMessageIndex].id;

    // Remove BOTH the AI message AND the user message from history
    setMessages((prev) =>
      prev.filter((msg) => msg.id !== messageId && msg.id !== userMessageId)
    );

    // Re-send the user message (this will add the user message back and generate new AI response)
    setTimeout(() => handleSendMessage(userMessage), 100);
  };

  return (
    <div className="w-full max-w-4xl glass-effect rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-white/50 overflow-hidden flex flex-col h-[90vh] max-h-[800px] scale-enter">
      <ChatHeader onClose={onClose} />

      {messages.length > 0 ? (
        <>
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-8 py-8 relative"
          >
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Render all completed messages */}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  type={message.type}
                  content={message.content}
                  toolStatus={message.toolStatus}
                  onRegenerate={
                    message.type === "ai"
                      ? () => handleRegenerate(message.id)
                      : undefined
                  }
                />
              ))}

              {/* Render streaming message */}
              {(isWaitingForResponse ||
                isStreaming ||
                currentStreamingMessage) && (
                <ChatMessage
                  type="ai"
                  content={currentStreamingMessage}
                  isWaitingForResponse={isWaitingForResponse}
                  isStreaming={isStreaming}
                  toolStatus={currentTool || undefined}
                />
              )}

              {/* Show error message if any */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Scroll anchor at bottom */}
              <div ref={scrollBottomRef} />
            </div>

            {/* Floating scroll button */}
            <ScrollButton
              isAtBottom={isAtBottom}
              scrollToBottom={scrollToBottom}
            />
          </div>

          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={() => handleSendMessage()}
          />
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-8 py-8 relative">
            {/* Show loading state when waiting for first response */}
            {(isWaitingForResponse ||
              isStreaming ||
              currentStreamingMessage) && (
              <div className="space-y-8 max-w-3xl mx-auto">
                <ChatMessage
                  type="ai"
                  content={currentStreamingMessage}
                  isWaitingForResponse={isWaitingForResponse}
                  isStreaming={isStreaming}
                  toolStatus={currentTool || undefined}
                />
              </div>
            )}

            {/* Show empty state only when not loading */}
            {!isWaitingForResponse && !isStreaming && <EmptyState />}
          </div>
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={() => handleSendMessage()}
          />
        </>
      )}
    </div>
  );
}
