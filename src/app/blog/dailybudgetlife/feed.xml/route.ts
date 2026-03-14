import { getPublishedArticles } from '@/lib/dailybudgetlife-data'
import { BLOG_CONFIGS, blogFullUrl, articleFullUrl } from '@/lib/blog-seo'

export const revalidate = 3600

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toRfc822(value: unknown): string {
  if (!value) return new Date().toUTCString()
  if (value instanceof Date) return value.toUTCString()
  if (typeof value === 'number') return new Date(value * 1000).toUTCString()
  return new Date(String(value)).toUTCString()
}

export async function GET() {
  const blogSlug = 'dailybudgetlife'
  const config = BLOG_CONFIGS[blogSlug]
  const baseUrl = blogFullUrl(blogSlug)
  const feedUrl = `${baseUrl}/feed.xml`

  const { articles } = await getPublishedArticles({ limit: 20 })
  const safeArticles = Array.isArray(articles) ? articles : []

  const items = safeArticles
    .map((article) => {
      const link = articleFullUrl(blogSlug, article.slug)
      const description = article.metaDescription || article.excerpt || ''
      const pubDate = toRfc822(article.publishDate)

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <author>${escapeXml(article.author)}</author>
    </item>`
    })
    .join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(config.name)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(config.description)}</description>
    <language>${config.language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
