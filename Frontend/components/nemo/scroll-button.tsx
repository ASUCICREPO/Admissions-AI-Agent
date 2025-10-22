"use client"

import { ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ScrollButtonProps {
  isAtBottom: boolean
  scrollToBottom: () => void
  className?: string
}

/**
 * Scroll Button Component
 *
 * Floating button that appears when user scrolls up from bottom.
 * Clicking it smoothly scrolls back to the latest messages.
 */
export function ScrollButton({ isAtBottom, scrollToBottom, className }: ScrollButtonProps) {
  return (
    <button
      onClick={scrollToBottom}
      aria-label="Scroll to bottom"
      className={cn(
        // Position
        "absolute bottom-6 right-6 z-10",
        // Size & shape
        "h-10 w-10 rounded-full",
        // Styling
        "bg-white border-2 border-gray-200 shadow-lg",
        "hover:bg-gray-50 hover:border-gray-300",
        "active:scale-95",
        // Icon
        "flex items-center justify-center",
        "text-gray-600",
        // Animation
        "transition-all duration-150 ease-out",
        // Visibility based on scroll position
        !isAtBottom
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-4 scale-95 opacity-0",
        className
      )}
    >
      <ArrowDown className="w-5 h-5" />
    </button>
  )
}
