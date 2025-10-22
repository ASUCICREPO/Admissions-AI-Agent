"use client"

import type React from "react"

import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
}

export function ChatInput({ value, onChange, onSend }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSend()
    }
  }

  return (
    <div className="px-6 pb-6">
      <div className="flex items-center gap-2 bg-white/40 backdrop-blur-sm border border-white/30 rounded-full px-4 py-3 shadow-sm">
        <Input
          type="text"
          placeholder="Ask me about programs, scholarships, or admissions..."
          className="flex-1 border-0 bg-transparent text-[#1e293b] placeholder:text-[#90a1b9] focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="icon"
          className="bg-[#9a1c14] hover:bg-[#8b0000] text-white h-9 w-9 rounded-full"
          onClick={onSend}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
