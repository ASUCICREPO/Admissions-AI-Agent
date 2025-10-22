import { MessageCircle } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-5 max-w-md text-center mb-8 message-enter">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center mb-3 shadow-lg">
          <MessageCircle className="w-12 h-12 text-[#90a1b9]" strokeWidth={1.5} />
        </div>
        <h2 className="text-[#1e293b] text-2xl font-semibold tracking-tight">Start a conversation with Nemo</h2>
        <p className="text-[#64748b] text-base leading-relaxed">Choose a suggestion below or type your question</p>
      </div>
    </div>
  )
}
