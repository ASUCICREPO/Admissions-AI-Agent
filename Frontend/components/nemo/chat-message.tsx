"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader } from "./loader";
import { ToolCard } from "./tool-card";
import { Markdown } from "./markdown";
import type { ToolStatus } from "./types";

interface ChatMessageProps {
  type: "user" | "ai";
  content: string;
  isWaitingForResponse?: boolean;
  isStreaming?: boolean;
  toolStatus?: ToolStatus;
  followUpQuestions?: string[];
  onFollowUpClick?: (question: string) => void;
  onRegenerate?: () => void;
}

export function ChatMessage({
  type,
  content,
  isWaitingForResponse,
  isStreaming,
  toolStatus,
  followUpQuestions,
  onFollowUpClick,
  onRegenerate,
}: ChatMessageProps) {
  if (type === "user") {
    return (
      <div className="flex justify-end gap-4 message-enter">
        <div className="bg-gradient-to-br from-[#ffd4d4] to-[#ffc9c9] text-[#1e293b] rounded-3xl rounded-tr-md px-6 py-4 max-w-md shadow-sm">
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9a1c14] to-[#8b0000] flex items-center justify-center flex-shrink-0 shadow-md">
          <span className="text-white text-sm font-semibold">U</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 message-enter">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md border border-gray-100">
        <Image
          src="/logo-mapua-nemo-rot-1.png"
          alt="Nemo"
          width={22}
          height={22}
          className={`w-5.5 h-5.5 ${
            isWaitingForResponse || isStreaming ? "animate-spin" : ""
          }`}
        />
      </div>
      <div className="flex-1 space-y-3">
        {/* Show tool card when tool is being used */}
        {toolStatus && (
          <ToolCard
            icon={toolStatus.icon}
            message={toolStatus.message}
            state={toolStatus.state}
          />
        )}

        {/* Show message content */}
        {content && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl rounded-tl-md px-6 py-5 shadow-sm border border-gray-100">
              <div className="text-[#334155] text-sm leading-relaxed">
                {/* Render markdown content */}
                <Markdown content={content} />
                {/* Show typing loader when streaming */}
                {isStreaming && (
                  <div className="inline-block ml-2 align-middle">
                    <Loader variant="typing" size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Show actions only when not streaming */}
            {/* {!isStreaming && <MessageActions messageContent={content} onRegenerate={onRegenerate} />} */}

            {/* Show follow-up questions only when not streaming */}
            {!isStreaming &&
              followUpQuestions &&
              followUpQuestions.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {followUpQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="bg-white border-gray-200 text-[#334155] hover:bg-gray-50 hover:border-gray-300 rounded-full px-5 py-2.5 h-auto text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                      onClick={() => onFollowUpClick?.(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
