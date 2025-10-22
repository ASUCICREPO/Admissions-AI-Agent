"use client";

import { Check, Search, Globe } from "lucide-react";
import { Loader } from "./loader";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  icon: string;
  message: string;
  state: "running" | "completed";
  className?: string;
}

/**
 * Tool Card Component
 *
 * Displays tool execution status with icon and message
 * Follows Prompt Kit design patterns for tool visualization
 */
export function ToolCard({ icon, message, state, className }: ToolCardProps) {
  // Map emoji icons to lucide-react icons
  const getIconComponent = () => {
    switch (icon) {
      case "🔍":
        return <Search className="w-4 h-4" />;
      case "🌐":
        return <Globe className="w-4 h-4" />;
      default:
        return <span className="text-base">{icon}</span>;
    }
  };

  return (
    <div
      className={cn(
        // Base styles - smaller and more rounded
        "inline-flex items-center gap-2.5 px-3 py-2 rounded-2xl transition-all duration-300 max-w-fit",
        // Border and background based on state
        state === "running" && "bg-blue-50 border border-blue-200",
        state === "completed" && "bg-green-50 border border-green-200",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0",
          state === "running" && "text-blue-600",
          state === "completed" && "text-green-600"
        )}
      >
        {getIconComponent()}
      </div>

      {/* Message */}
      <span
        className={cn(
          "text-xs font-medium",
          state === "running" && "text-blue-900",
          state === "completed" && "text-green-900"
        )}
      >
        {message}
      </span>

      {/* Status indicator */}
      {state === "running" && <Loader variant="circular" size="sm" />}
      {state === "completed" && (
        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}
