'use client'

import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Components } from 'react-markdown'

interface ProjectBriefProps {
  content: string
  previewLength?: number
}

const PREVIEW_LENGTH = 200

const markdownComponents: Components = {
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
      {...props}
    >
      {children}
    </a>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="text-xl font-bold text-slate-100 mt-4 mb-2 first:mt-0" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-lg font-semibold text-slate-100 mt-3 mb-2 first:mt-0" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-base font-semibold text-slate-200 mt-3 mb-1 first:mt-0" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="text-sm font-semibold text-slate-200 mt-2 mb-1 first:mt-0" {...props}>{children}</h4>
  ),
  p: ({ children, ...props }) => (
    <p className="text-slate-400 my-2 leading-relaxed" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside text-slate-400 my-2 space-y-1 ml-2" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside text-slate-400 my-2 space-y-1 ml-2" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-slate-400 leading-relaxed" {...props}>{children}</li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-2 border-slate-600 pl-4 my-2 text-slate-500 italic" {...props}>
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className={`${className} block`} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre className="bg-slate-800/80 border border-slate-700 rounded-md p-3 my-2 overflow-x-auto text-sm text-slate-300 font-mono" {...props}>
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm text-slate-400 border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="border-b border-slate-700 text-slate-300" {...props}>{children}</thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody className="divide-y divide-slate-800" {...props}>{children}</tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr className="hover:bg-slate-800/50" {...props}>{children}</tr>
  ),
  th: ({ children, ...props }) => (
    <th className="px-3 py-2 text-left font-semibold text-slate-300" {...props}>{children}</th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-3 py-2 text-slate-400" {...props}>{children}</td>
  ),
  hr: ({ ...props }) => (
    <hr className="border-slate-700 my-3" {...props} />
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-slate-300" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-slate-400" {...props}>{children}</em>
  ),
}

export function ProjectBrief({ content, previewLength = PREVIEW_LENGTH }: ProjectBriefProps) {
  const [expanded, setExpanded] = useState(false)

  const needsCollapse = content.length > previewLength

  const previewContent = useMemo(() => {
    if (!needsCollapse || expanded) return content
    // Cut at previewLength, but try to find a natural break (newline or space)
    let cut = content.slice(0, previewLength)
    const lastNewline = cut.lastIndexOf('\n')
    const lastSpace = cut.lastIndexOf(' ')
    const breakPoint = lastNewline > previewLength * 0.5 ? lastNewline : lastSpace > previewLength * 0.5 ? lastSpace : previewLength
    return content.slice(0, breakPoint) + '…'
  }, [content, expanded, needsCollapse, previewLength])

  return (
    <div className="relative">
      <div className={`${!expanded && needsCollapse ? 'max-h-24 overflow-hidden' : ''}`}>
        <div className="markdown-brief">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {previewContent}
          </ReactMarkdown>
        </div>
        {/* Fade overlay when collapsed */}
        {!expanded && needsCollapse && (
          <div className="absolute bottom-8 left-0 right-0 h-12 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />
        )}
      </div>
      {needsCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-blue-400 hover:text-blue-300 hover:bg-slate-800/50 mt-1 px-2 h-7 text-xs"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Collapse brief
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Expand full brief
            </>
          )}
        </Button>
      )}
    </div>
  )
}
