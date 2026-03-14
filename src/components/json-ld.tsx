/**
 * JSON-LD structured data component.
 * Renders one or more JSON-LD schemas as a <script> tag.
 */

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[]
}

export function JsonLd({ data }: JsonLdProps) {
  const content = Array.isArray(data)
    ? JSON.stringify(data)
    : JSON.stringify(data)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
