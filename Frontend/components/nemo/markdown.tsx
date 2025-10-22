"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'
import 'highlight.js/styles/github-dark.css'

interface MarkdownProps {
  content: string
  className?: string
}

/**
 * Markdown Component
 *
 * Renders markdown content with:
 * - GitHub Flavored Markdown support (tables, strikethrough, etc.)
 * - Syntax highlighting for code blocks
 * - Custom styling for all elements
 * - Links open in new tabs
 */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-3 text-[#1e293b]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-2 text-[#1e293b]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-[#334155]">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-3 mb-1.5 text-[#334155]">{children}</h4>
          ),

          // Paragraphs
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,

          // Text formatting
          strong: ({ children }) => (
            <strong className="font-semibold text-[#1e293b]">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,

          // Code
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            return !inline ? (
              <div className="my-3">
                <pre className="bg-[#1e293b] text-white p-4 rounded-lg overflow-x-auto">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code
                className="bg-gray-100 text-[#9a1c14] px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            )
          },

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9a1c14] hover:underline font-medium"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="my-4 border-gray-200" />,

          // Tables
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="min-w-full border border-gray-200">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-gray-700">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-2 text-gray-600">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
