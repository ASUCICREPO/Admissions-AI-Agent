"use client"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import Image from "next/image"

interface LoaderProps {
  variant: "text-shimmer" | "typing" | "circular" | "logo-spin"
  text?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * Loader Component - Based on Prompt Kit
 *
 * Supports three variants:
 * - text-shimmer: Thinking state with shimmer animation
 * - typing: Streaming state with animated dots
 * - circular: Spinning circle loader (for tool processing) - uses Lucide React Loader2
 */
export function Loader({ variant, text = "Thinking", size = "md", className }: LoaderProps) {
  if (variant === "text-shimmer") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span
          className={cn(
            "shimmer-text font-medium",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-lg"
          )}
        >
          {text}
        </span>
      </div>
    )
  }

  if (variant === "typing") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <span
          className={cn(
            "typing-dot rounded-full bg-[#64748b]",
            size === "sm" && "w-1 h-1",
            size === "md" && "w-1.5 h-1.5",
            size === "lg" && "w-2 h-2"
          )}
        />
        <span
          className={cn(
            "typing-dot rounded-full bg-[#64748b]",
            size === "sm" && "w-1 h-1",
            size === "md" && "w-1.5 h-1.5",
            size === "lg" && "w-2 h-2"
          )}
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className={cn(
            "typing-dot rounded-full bg-[#64748b]",
            size === "sm" && "w-1 h-1",
            size === "md" && "w-1.5 h-1.5",
            size === "lg" && "w-2 h-2"
          )}
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    )
  }

  if (variant === "circular") {
    return (
      <Loader2
        className={cn(
          "animate-spin text-blue-500",
          size === "sm" && "h-4 w-4",
          size === "md" && "h-5 w-5",
          size === "lg" && "h-6 w-6",
          className
        )}
      />
    )
  }

  if (variant === "logo-spin") {
    const sizeMap = {
      sm: 16,
      md: 20,
      lg: 24,
    }
    const pixelSize = sizeMap[size]

    return (
      <div className={cn("inline-block", className)}>
        <Image
          src="/logo-mapua-nemo-rot-1.png"
          alt="Cintana Logo"
          width={pixelSize}
          height={pixelSize}
          className="animate-spin"
          priority
        />
      </div>
    )
  }

  return null
}
