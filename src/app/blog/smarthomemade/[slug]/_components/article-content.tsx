'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ArticleContentProps {
  content: string
  hasAffiliateLinks?: boolean
}

export function ArticleContent({ content, hasAffiliateLinks }: ArticleContentProps) {
  return (
    <div className="shm-prose">
      {hasAffiliateLinks && (
        <div className="shm-affiliate-banner">
          This post contains affiliate links. We may earn a commission at no extra cost to you.
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, ...props }) => {
            const text = extractText(children)
            const id = slugify(text)
            return <h2 id={id} {...props}>{children}</h2>
          },
          h3: ({ children, ...props }) => {
            const text = extractText(children)
            const id = slugify(text)
            return <h3 id={id} {...props}>{children}</h3>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return extractText(
      (children as React.ReactElement<{ children?: React.ReactNode }>).props.children
    )
  }
  return ''
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
