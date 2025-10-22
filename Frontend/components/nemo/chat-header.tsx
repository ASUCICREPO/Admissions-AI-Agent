"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface ChatHeaderProps {
  onClose?: () => void
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <Image src="/logo-mapua-nemo-rot-1.png" alt="Nemo Logo" width={40} height={40} className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-[#000000] font-semibold text-lg">Nemo</h1>
          <p className="text-[#64748b] text-sm">AI Virtual Admissions Advisor</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="text-[#45556c] hover:bg-[#f1f5f9]" onClick={onClose}>
        <X className="w-5 h-5" />
      </Button>
    </div>
  )
}
