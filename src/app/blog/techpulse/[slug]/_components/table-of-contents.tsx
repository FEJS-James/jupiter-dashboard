interface TableOfContentsProps {
  content: string
}

interface TocItem {
  level: number
  text: string
  id: string
}

function extractHeadings(markdown: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const headings: TocItem[] = []
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    headings.push({ level, text, id })
  }

  return headings
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings = extractHeadings(content)

  if (headings.length === 0) return null

  return (
    <nav aria-label="Table of contents">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        On this page
      </h2>
      <ul className="space-y-2">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: heading.level === 3 ? '0.75rem' : 0 }}
          >
            <a
              href={`#${heading.id}`}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors line-clamp-2"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
